import { $, write } from "bun"

import ora from "ora"

import { getPaths, getPlatform, isInstalled, LockFile } from "#/utils"
import {
	CADDY_CONFIG,
	CADDY_INSTALL_COMMANDS,
	CADDY_PORT,
	DNSMASQ_CONFIG,
	DNSMASQ_INSTALL_COMMANDS,
	DNSMASQ_PORT,
	HOSTNAME
} from "#/utils/constants"
import { logProcessExit } from "#/utils/errors"
import { logger } from "#/utils/logger"
import { wait_for_process } from "#/utils/process"
import { cleanupPartialState } from "#/utils/services"
import { tryCatch } from "#/utils/try-catch"

export async function start(
	detached: boolean = true,
	verbose: boolean = false
) {
	// Initialization
	const paths = getPaths()
	const platform = await getPlatform()
	const lockFile = new LockFile(`${paths.state}/localport.lock`)
	const startedPids: number[] = []

	// Lock to prevent multiple concurrent starts/stops
	lockFile.acquire()

	// Check if `dnsmasq` is installed
	if (!(await isInstalled("dnsmasq"))) {
		const command = DNSMASQ_INSTALL_COMMANDS[platform]
		logger.error(`'dnsmasq' is not installed. Install: ${command}`)
		return
	}

	// Check if `caddy` is installed
	if (!(await isInstalled("caddy"))) {
		const command = CADDY_INSTALL_COMMANDS[platform]
		logger.error(`'caddy' is not installed. Install: ${command}`)
		return
	}

	// Create necessary directories
	await $`mkdir -p ${paths.config} ${paths.state} ${paths.logs}`

	// Start `dnsmasq`
	{
		const spinner = verbose ? ora().start() : null

		// Configure Service
		if (spinner) spinner.text = `Configuring 'dnsmasq'...`
		const config_path = `${paths.config}/dnsmasq.conf`
		await write(config_path, DNSMASQ_CONFIG(HOSTNAME, DNSMASQ_PORT.toString()))

		// Start Service
		if (spinner) spinner.text = `Starting 'dnsmasq'...`
		const logFilePath = `${paths.logs}/dnsmasq.log`
		const proc = Bun.spawn(["dnsmasq", "-C", config_path], {
			detached,
			stderr: Bun.file(logFilePath),
			stdout: Bun.file(logFilePath)
		})

		// Save state and log exit
		const state = { pid: proc.pid, port: DNSMASQ_PORT }
		await write(`${paths.state}/dnsmasq.json`, JSON.stringify(state, null, 2))
		logProcessExit(proc, "dnsmasq", logFilePath)

		// Check if service is ready
		if (spinner) spinner.text = `Waiting for 'dnsmasq' to be ready...`
		const { error } = await tryCatch(
			wait_for_process(proc.pid, DNSMASQ_PORT, HOSTNAME)
		)
		if (error) {
			if (spinner) spinner.fail(`'dnsmasq' failed to start: ${error}`)
			await cleanupPartialState(startedPids, paths.state)
			throw error
		}
		startedPids.push(proc.pid)
		if (spinner)
			spinner.succeed(
				`'dnsmasq' started on ${HOSTNAME}:${DNSMASQ_PORT} (PID: ${proc.pid})`
			)
	}

	// Start `caddy`
	{
		const spinner = verbose ? ora().start() : null

		// Configure Service
		if (spinner) spinner.text = `Configuring 'caddy'...`
		const configPath = `${paths.config}/Caddyfile`
		await write(configPath, CADDY_CONFIG(HOSTNAME, CADDY_PORT.toString()))

		// Start Service
		if (spinner) spinner.text = `Starting 'caddy'...`
		const logFilePath = `${paths.logs}/caddy.log`
		const proc = Bun.spawn(["caddy", "run", "--config", configPath], {
			detached,
			stderr: Bun.file(logFilePath),
			stdout: Bun.file(logFilePath)
		})

		// Save state and log exit
		const state = { pid: proc.pid, port: CADDY_PORT }
		await write(`${paths.state}/caddy.json`, JSON.stringify(state, null, 2))
		logProcessExit(proc, "caddy", logFilePath)

		// Check if service is ready
		if (spinner) spinner.text = `Waiting for 'caddy' to be ready...`
		const { error } = await tryCatch(
			wait_for_process(proc.pid, CADDY_PORT, HOSTNAME)
		)
		if (error) {
			if (spinner) spinner.fail(`'caddy' failed to start: ${error}`)
			await cleanupPartialState(startedPids, paths.state)
			throw error
		}
		startedPids.push(proc.pid)
		if (spinner)
			spinner.succeed(
				`'caddy' started on ${HOSTNAME}:${CADDY_PORT} (PID: ${proc.pid})`
			)
	}

	// Release lock
	lockFile.release()
	if (verbose) console.log("🎉 Localport is running!")
}
