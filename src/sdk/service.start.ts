import { $, write } from "bun"

import ora from "ora"

import {
	CADDY_PORT,
	getPlatform,
	HOSTNAME,
	isInstalled,
	LOCKFILE,
	PATHS
} from "#/utils"
import { cleanup, HTTPS } from "#/utils/config"
import { CADDY_INSTALL_COMMANDS, getCaddyConfig } from "#/utils/constants"
import { logProcessExit } from "#/utils/errors"
import { wait_for_process } from "#/utils/process"
import { tryCatch } from "#/utils/try-catch"

export async function start(
	detached: boolean = true,
	verbose: boolean = false
) {
	// Initialization
	const platform = await getPlatform()
	const startedPids: number[] = []

	// Create necessary directories
	await $`mkdir -p ${PATHS.CONFIG_DIR} ${PATHS.STATE_DIR} ${PATHS.LOGS_DIR}`

	// Acquire lock to prevent concurrent starts
	LOCKFILE.acquire()

	// Start `caddy`
	{
		const spinner = verbose ? ora().start() : null

		// Check if `caddy` is installed
		if (!(await isInstalled("caddy"))) {
			const command = CADDY_INSTALL_COMMANDS[platform]
			spinner?.fail(`'caddy' is not installed. Install: ${command}`)
			throw new Error(`'caddy' is not installed. Install: ${command}`)
		}

		// Configure Service
		if (spinner) spinner.text = `Configuring 'caddy'...`
		const config = getCaddyConfig({
			// TODO: WRITE CONFIG
			hostname: HOSTNAME,
			https: HTTPS,
			port: CADDY_PORT
		})
		await write(PATHS.CADDY_CONFIG, config)

		// Start Service
		if (spinner) spinner.text = `Starting 'caddy'...`
		const logFilePath = `${PATHS.LOGS_DIR}/caddy.log`
		// TODO: PROVIDE SUDO PASSWORD
		const proc = Bun.spawn(
			["sudo", "caddy", "run", "--config", PATHS.CADDY_CONFIG],
			{
				detached,
				stderr: Bun.file(logFilePath),
				stdout: Bun.file(logFilePath)
			}
		)

		// Save state and log exit
		const state = { pid: proc.pid, port: CADDY_PORT }
		await write(PATHS.CADDY_STATE, JSON.stringify(state, null, 2))
		logProcessExit(proc, "caddy", logFilePath)

		// Check if service is ready
		if (spinner) spinner.text = `Waiting for 'caddy' to be ready...`
		const { error } = await tryCatch(
			wait_for_process(proc.pid, CADDY_PORT, HOSTNAME)
		)
		if (error) {
			spinner?.fail(`'caddy' failed to start: ${error}`)
			await cleanup([proc.pid])
			throw error
		}
		startedPids.push(proc.pid)
		spinner?.succeed(
			`'caddy' started on ${HOSTNAME}:${CADDY_PORT} (PID: ${proc.pid})`
		)
	}

	// Release lock
	LOCKFILE.release()
	return
}
