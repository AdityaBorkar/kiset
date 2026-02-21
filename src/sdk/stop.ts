import { $ } from "bun"

import ora from "ora"

import {
	createLockFile,
	getLocalportStateDir,
	readPidWithBackwardsCompat
} from "#/utils"
import { PATHS } from "#/utils/constants"

export async function stop(verbose: boolean = false) {
	const spinner = verbose ? ora("Stopping localport...").start() : null
	const stateDir = getLocalportStateDir()
	const lockFile = createLockFile(`${stateDir}/localport.lock`)

	await lockFile.withLock(async () => {
		let stoppedCount = 0

		const services = [
			{
				name: "caddy",
				pidPath: `${stateDir}/caddy.pid`,
				statePath: PATHS.CADDY_STATE
			},
			{
				name: "dnsmasq",
				pidPath: `${stateDir}/dnsmasq.pid`,
				statePath: PATHS.DNSMASQ_STATE
			}
		]

		for (const service of services) {
			const pid = await readPidWithBackwardsCompat(
				service.statePath,
				service.pidPath
			)
			if (pid) {
				await $`kill ${pid} 2>/dev/null || true`
				await $`rm -f ${service.pidPath} ${service.statePath}`
				stoppedCount++
			}
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
