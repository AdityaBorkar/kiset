import { $, file } from "bun"

import ora from "ora"

import { PATHS } from "../constants"
import { createLockFile, getLocalportStateDir } from "../utils"

interface ServiceState {
	pid: number
	port: number
}

async function readServiceState(
	statePath: string
): Promise<ServiceState | null> {
	try {
		const content = await file(statePath).text()
		const state = JSON.parse(content) as ServiceState
		return state
	} catch {
		return null
	}
}

async function readPidWithBackwardsCompat(
	statePath: string,
	pidPath: string
): Promise<number | null> {
	const state = await readServiceState(statePath)
	if (state) return state.pid

	try {
		const content = await file(pidPath).text()
		return Number.parseInt(content.trim(), 10)
	} catch {
		return null
	}
}

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
		const caddyPid = await readPidWithBackwardsCompat(
			PATHS.CADDY_STATE,
			caddyPidPath
		)
		if (caddyPid) {
			await $`kill ${caddyPid} 2>/dev/null || true`
			await $`rm -f ${caddyPidPath} ${PATHS.CADDY_STATE}`
			stoppedCount++
		}

		const dnsmasqPidPath = `${stateDir}/dnsmasq.pid`
		const dnsmasqPid = await readPidWithBackwardsCompat(
			PATHS.DNSMASQ_STATE,
			dnsmasqPidPath
		)
		if (dnsmasqPid) {
			await $`kill ${dnsmasqPid} 2>/dev/null || true`
			await $`rm -f ${dnsmasqPidPath} ${PATHS.DNSMASQ_STATE}`
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
