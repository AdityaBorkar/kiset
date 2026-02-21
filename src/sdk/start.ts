import { $, write } from "bun"

import ora from "ora"

import {
	getPaths,
	getPlatform,
	isInstalled,
	LockFile,
	waitForService
} from "#/utils"
import {
	CADDY_INSTALL_COMMANDS,
	CADDY_PORT,
	DNSMASQ_INSTALL_COMMANDS,
	DNSMASQ_PORT
} from "#/utils/constants"
import { logProcessExit } from "#/utils/errors"
import { logger } from "#/utils/logger"
import { tryCatch } from "#/utils/try-catch"
import { cleanupPartialState } from "./shared"

const HOSTNAME = "http://127.0.0.1" // TODO: MOVE TO CONFIG

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
		const config = `
address=/local/127.0.0.1
port=${DNSMASQ_PORT}
listen-address=127.0.0.1
cache-size=10000
server=1.1.1.1
server=8.8.8.8
keep-in-foreground`.trim()
		await write(config_path, config)

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
		const { error } = await tryCatch(waitForService(proc.pid, DNSMASQ_PORT))
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
		const config = `
{
	admin 127.0.0.1:2519
}

http://localhost:${CADDY_PORT} {
	respond "Localport is working! Use custom .local domains by setting DNS to ${HOSTNAME}:${CADDY_PORT}"
}`.trim()
		await write(configPath, config)

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
		const { error } = await tryCatch(waitForService(proc.pid, CADDY_PORT))
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
