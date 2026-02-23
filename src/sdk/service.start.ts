import { $, write } from "bun"

import ora from "ora"

import { CADDY_INSTALL_COMMANDS } from "#/constants"
import {
	cleanup,
	getPlatform,
	isInstalled,
	LOCKFILE,
	logProcessExit,
	PATHS,
	tryCatch,
	waitForProcess
} from "#/utils"

// systemctl status proxy.service

export async function start(
	detached: boolean = true,
	verbose: boolean = false
) {
	// Initialization
	const platform = await getPlatform()

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
		const ADMIN_API_PORT = 5000 // TODO: GET FROM CONFIG
		await write(
			PATHS.CADDY_CONFIG,
			`{\n\tadmin 127.0.0.1:${ADMIN_API_PORT}\n}\n`
		)

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
		const CADDY_PORT = 5000 // TODO: GET FROM CONFIG
		const HOSTNAME = "localhost" // TODO: GET FROM CONFIG
		const state = { pid: proc.pid, port: CADDY_PORT }
		await write(PATHS.CADDY_STATE, JSON.stringify(state, null, 2))
		logProcessExit(proc, "caddy", logFilePath) // TODO: ANALYZE

		// Check if service is ready
		if (spinner) spinner.text = `Waiting for 'caddy' to be ready...`
		const { error } = await tryCatch(
			waitForProcess(proc.pid, CADDY_PORT, HOSTNAME) // TODO: ANALYZE
		)
		if (error) {
			spinner?.fail(`'caddy' failed to start: ${error}`)
			await cleanup([proc.pid])
			throw error
		}
		spinner?.succeed(
			`'caddy' started on ${HOSTNAME}:${CADDY_PORT} (PID: ${proc.pid})`
		)
	}

	// Release lock
	LOCKFILE.release()
	return
}
