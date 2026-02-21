import { $, file } from "bun"

import ora from "ora"

import { killProcess, LOCKFILE, PATHS } from "#/utils"

export async function stop(verbose: boolean = false) {
	// Initialization

	// Acquire lock to prevent multiple concurrent starts/stops
	await LOCKFILE.acquire()

	// Stop `caddy`
	{
		const spinner = verbose ? ora().start() : null
		if (spinner) spinner.text = "Stopping 'caddy'..."
		const state = await file(PATHS.CADDY_STATE).json()
		const pid = state.pid ?? 0
		if (pid) {
			await killProcess(pid)
			await $`rm -f ${PATHS.CADDY_STATE}`
			spinner?.succeed(`'caddy' stopped.`)
		} else {
			spinner?.info(`'caddy' is not running.`)
		}
	}

	// Release lock
	LOCKFILE.release()
	return
}
