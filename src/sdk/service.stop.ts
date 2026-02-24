import { $, file } from "bun"

import ora from "ora"

import type { Arguments } from "#/cli"
import { LOCKFILE, PATHS } from "#/utils"

export async function stop(_: null, { verbose }: Arguments) {
	// Initialization

	// Acquire lock to prevent multiple concurrent starts/stops
	await LOCKFILE.acquire()

	// Stop `caddy`
	;(async () => {
		const spinner = verbose ? ora().start() : null
		if (spinner) spinner.text = "Stopping 'caddy'..."

		const stateFile = file(PATHS.CADDY_STATE)
		if (!(await stateFile.exists())) {
			spinner?.info(`'caddy' is not running.`)
			return
		}

		const state = await stateFile.json()
		stateFile.unlink()

		if (state.pid) {
			await $`kill ${state.pid} 2>/dev/null || true`.catch(() => {})
			await $`caddy stop --config ${PATHS.CADDY_CONFIG} 2>/dev/null || true`.catch(
				() => {}
			)
			spinner?.succeed(`'caddy' stopped.`)
		} else {
			spinner?.info(`'caddy' is not running.`)
		}
	})()

	// Release lock
	await LOCKFILE.release()
	return
}
