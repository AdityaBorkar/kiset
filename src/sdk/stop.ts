import { $ } from "bun"

import ora from "ora"

import {
	getPaths,
	kill_pid,
	LockFile,
	readPidWithBackwardsCompat
} from "#/utils"
import { PATHS } from "#/utils/constants"

export async function stop(verbose: boolean = false) {
	// Initialization
	const paths = getPaths()
	const spinner = verbose ? ora().start() : null
	const lockFile = new LockFile(`${paths.state}/localport.lock`)
	let count = 0

	// Lock to prevent multiple concurrent starts/stops
	lockFile.acquire()

	// Stop `dnsmasq`
	{
		if (spinner) spinner.text = "Stopping 'dnsmasq'..."
		const pid = await readPidWithBackwardsCompat(
			PATHS.DNSMASQ_STATE,
			PATHS.DNSMASQ_PID
		)
		if (pid) {
			await kill_pid(pid)
			await $`rm -f ${PATHS.DNSMASQ_PID} ${PATHS.DNSMASQ_STATE}`
			count++
		}
	}

	// Stop `caddy`
	{
		if (spinner) spinner.text = "Stopping 'caddy'..."
		const pid = await readPidWithBackwardsCompat(
			PATHS.CADDY_STATE,
			PATHS.CADDY_PID
		)
		if (pid) {
			await kill_pid(pid)
			await $`rm -f ${PATHS.CADDY_PID} ${PATHS.CADDY_STATE}`
			count++
		}
	}

	// Release lock
	lockFile.release()
	spinner?.succeed(
		count > 0
			? `Localport stopped. (${count} service${count > 1 ? "s" : ""})`
			: "No services running."
	)
}
