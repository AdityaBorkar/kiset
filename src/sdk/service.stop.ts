import { $ } from "bun"

import ora from "ora"

import {
	getPaths,
	kill_process,
	LockFile,
	readPidWithBackwardsCompat
} from "#/utils"

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
			paths.dnsmasq_state,
			paths.dnsmasq_pid
		)
		if (pid) {
			await kill_process(pid)
			await $`rm -f ${paths.dnsmasq_pid} ${paths.dnsmasq_state}`
			count++
		}
	}

	// Stop `caddy`
	{
		if (spinner) spinner.text = "Stopping 'caddy'..."
		const pid = await readPidWithBackwardsCompat(
			paths.caddy_state,
			paths.caddy_pid
		)
		if (pid) {
			await kill_process(pid)
			await $`rm -f ${paths.caddy_pid} ${paths.caddy_state}`
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
