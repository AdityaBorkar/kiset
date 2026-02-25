import { $, file, spawn, write } from "bun"

import ora from "ora"

import type { Arguments } from "#/cli"
import { CADDY_INSTALL_COMMANDS } from "#/constants"
import { status } from "#/sdk/service.status"
import {
	getGlobalConfig,
	getPlatform,
	isInstalled,
	isPortAvailable,
	killProcess,
	LOCKFILE,
	logProcessExit,
	PATHS,
	tryCatch,
	waitForProcess
} from "#/utils"

export async function start(
	{ detached }: { detached: boolean },
	{ verbose }: Arguments
) {
	// Initialization
	const platform = await getPlatform()
	const config = await getGlobalConfig()

	// Create necessary directories
	await $`mkdir -p ${PATHS.CONFIG_DIR} ${PATHS.STATE_DIR} ${PATHS.LOGS_DIR}`

	// Acquire lock to prevent concurrent starts
	await LOCKFILE.acquire()

	// Existing services check
	const statuses = await status(null, { verbose: false })

	// Start `caddy`
	await (async () => {
		const spinner = verbose ? ora().start() : null

		// Check if `caddy` is installed
		if (!(await isInstalled("caddy"))) {
			const command = CADDY_INSTALL_COMMANDS[platform]
			spinner?.fail(`'caddy' is not installed. Install: ${command}`)
			throw new Error(`'caddy' is not installed. Install: ${command}`)
		}

		// TODO: Check if already started, if yes, then DO NOT START AGAIN
		if (statuses["caddy"]?.running) {
			spinner?.warn(`'caddy' is already running.`)
			return
		}

		// Configure Service
		if (spinner) spinner.text = `Configuring 'caddy'...`
		const { hostname = "", port = 0 } = config.server_admin
		await write(PATHS.CADDY_CONFIG, `{\n\tadmin ${hostname}:${port}\n}\n`)

		// todo: check if port is available
		const available = isPortAvailable({ hostname, port })
		if (!available) {
			spinner?.fail(
				`Port ${port} is not available. Please free it or change the admin port in the global config.`
			)
			return
		}

		// Start Service
		if (spinner) spinner.text = `Starting 'caddy'...`
		const logFilePath = `${PATHS.LOGS_DIR}/caddy.log`
		// echo '{"admin":{"listen":"localhost:3000"}}' | caddy run --config -
		const subprocess = spawn(["caddy", "run", "--config", PATHS.CADDY_CONFIG], {
			detached,
			stderr: Bun.file(logFilePath),
			stdout: Bun.file(logFilePath)
		})
		const pid = subprocess.pid

		// Save state and log exit
		const state = { hostname, pid, port }
		await write(PATHS.CADDY_STATE, JSON.stringify(state, null, 2))
		logProcessExit({ logFilePath, name: "caddy", subprocess }) // TODO: ANALYZE

		// Check if service is ready
		if (spinner) spinner.text = `Waiting for 'caddy' to be ready...`
		const { error } = await tryCatch(
			waitForProcess(pid, port, hostname) // TODO: ANALYZE
		)
		if (error) {
			spinner?.fail(`'caddy' failed to start: ${error}`)
			await killProcess(pid, { expectedName: "caddy" })
			file(PATHS.CADDY_STATE).unlink()
			throw error
		} else {
			spinner?.succeed(
				`'caddy' started on http://${hostname}:${port} (PID: ${pid})`
			)
			console.log("Logs:", logFilePath)
		}
	})()

	// Release lock
	await LOCKFILE.release()
	return true
}
