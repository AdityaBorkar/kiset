import { $ } from "bun"

import ora from "ora"

import {
	createLockFile,
	getLocalportStateDir,
	readPidWithBackwardsCompat
} from "#/utils"
import { SERVICES } from "./shared"

export async function stop(verbose: boolean = false) {
	const spinner = verbose ? ora("Stopping localport...").start() : null
	const stateDir = getLocalportStateDir()
	const lockFile = createLockFile(`${stateDir}/localport.lock`)

	await lockFile.withLock(async () => {
		let stoppedCount = 0

		for (const service of SERVICES) {
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
