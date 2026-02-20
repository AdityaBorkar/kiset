import { $, file } from "bun"

import ora from "ora"

import { createLockFile, getLocalportStateDir } from "../utils"

/**
 * Stops dnsmasq and Caddy services.
 *
 * @param verbose - Show detailed stop messages (default: false)
 * @returns Promise that resolves when services are stopped
 */
export async function stop(verbose: boolean = false) {
	const spinner = verbose ? ora("Stopping localport...").start() : null

	const stateDir = getLocalportStateDir()
	const lockFile = createLockFile(`${stateDir}/localport.lock`)

	await lockFile.withLock(async () => {
		let stoppedCount = 0

		const caddyPidPath = `${stateDir}/caddy.pid`
		if (await file(caddyPidPath).exists()) {
			const pid = await file(caddyPidPath).text()
			await $`kill ${pid.trim()} 2>/dev/null || true`
			await $`rm -f ${caddyPidPath}`
			stoppedCount++
		}

		const dnsmasqPidPath = `${stateDir}/dnsmasq.pid`
		if (await file(dnsmasqPidPath).exists()) {
			const pid = await file(dnsmasqPidPath).text()
			await $`kill ${pid.trim()} 2>/dev/null || true`
			await $`rm -f ${dnsmasqPidPath}`
			stoppedCount++
		}

		if (verbose && spinner) {
			if (stoppedCount > 0) {
				spinner.succeed(
					`Localport stopped. (${stoppedCount} service${stoppedCount > 1 ? "s" : ""})`
				)
			} else {
				spinner.info("No services running.")
			}
		}
	})
}
