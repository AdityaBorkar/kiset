import { $, write } from "bun"

import ora from "ora"

import {
	CADDY_INSTALL_COMMANDS,
	CADDY_PORT,
	DNSMASQ_INSTALL_COMMANDS,
	DNSMASQ_PORT
} from "../constants"
import {
	createLockFile,
	getLocalportConfigDir,
	getLocalportLogsDir,
	getLocalportStateDir,
	getPlatformId,
	install,
	isInstalled,
	waitForService
} from "../utils"

async function cleanupPartialState(pids: number[], stateDir: string) {
	for (const pid of pids) {
		try {
			await $`kill ${pid} 2>/dev/null || true`
		} catch {
			// Ignore errors when killing processes
		}
	}
	await $`rm -f ${stateDir}/dnsmasq.pid ${stateDir}/caddy.pid 2>/dev/null || true`
}

async function logProcessExit(
	subprocess: ReturnType<typeof Bun.spawn>,
	serviceName: string,
	logFile: string
) {
	try {
		const exitCode = await subprocess.exited
		let reason: string

		if (exitCode === 143) {
			reason = "Stopped via localport stop"
		} else if (exitCode === 130) {
			reason = "Interrupted by user (Ctrl+C)"
		} else if (exitCode === 137) {
			reason = "Killed"
		} else if (exitCode === 0) {
			reason = "Exited normally"
		} else {
			reason = `Exited with code ${exitCode}`
		}

		console.error(`${serviceName} ${reason}. See ${logFile} for details.`)
	} catch {}
}

/**
 * Starts dnsmasq and Caddy services for local development.
 *
 * @param detached - Run services in detached mode (default: true)
 * @param verbose - Show detailed progress messages (default: false)
 * @returns Promise that resolves when both services are started
 * @throws {ServiceStartError} If either service fails to start
 * @throws {LockAcquisitionError} If lock file cannot be acquired
 */
export async function start(
	detached: boolean = true,
	verbose: boolean = false
) {
	const platformId = await getPlatformId()
	const configDir = getLocalportConfigDir()
	const stateDir = getLocalportStateDir()
	const logsDir = getLocalportLogsDir()
	const lockFile = createLockFile(`${stateDir}/localport.lock`)
	const startedPids: number[] = []

	await lockFile.withLock(async () => {
		if (verbose) {
			const $dnsmasq_install = ora("Installing dnsmasq...").start()
			if (await isInstalled("dnsmasq")) {
				$dnsmasq_install.succeed("dnsmasq is already installed.")
			} else {
				const command = DNSMASQ_INSTALL_COMMANDS[platformId]
				await install({ command, label: "dnsmasq", verbose })
				$dnsmasq_install.succeed("dnsmasq installed successfully.")
			}

			const $caddy_install = ora("Installing caddy...").start()
			if (await isInstalled("caddy")) {
				$caddy_install.succeed("caddy is already installed.")
			} else {
				const command = CADDY_INSTALL_COMMANDS[platformId]
				await install({ command, label: "caddy", verbose })
				$caddy_install.succeed("caddy installed successfully.")
			}
		} else {
			if (!(await isInstalled("dnsmasq"))) {
				const command = DNSMASQ_INSTALL_COMMANDS[platformId]
				await install({ command, label: "dnsmasq", verbose })
			}
			if (!(await isInstalled("caddy"))) {
				const command = CADDY_INSTALL_COMMANDS[platformId]
				await install({ command, label: "caddy", verbose })
			}
		}

		await $`mkdir -p ${configDir} ${stateDir} ${logsDir}`

		if (verbose) {
			const $dnsmasq_start = ora("Configuring dnsmasq...").start()
			const dnsmasq_config = `
address=/local/127.0.0.1
port=${DNSMASQ_PORT}
listen-address=127.0.0.1
cache-size=10000
server=1.1.1.1
server=8.8.8.8
keep-in-foreground
`.trim()
			await write(`${configDir}/dnsmasq.conf`, dnsmasq_config)

			$dnsmasq_start.text = "Starting dnsmasq..."
			const dnsmasq_log = `${logsDir}/dnsmasq.log`
			const dnsmasq_proc = Bun.spawn(
				["dnsmasq", "-C", `${configDir}/dnsmasq.conf`],
				{
					detached,
					stderr: Bun.file(dnsmasq_log),
					stdout: Bun.file(dnsmasq_log)
				}
			)
			await write(`${stateDir}/dnsmasq.pid`, `${dnsmasq_proc.pid}`)
			logProcessExit(dnsmasq_proc, "dnsmasq", dnsmasq_log)

			$dnsmasq_start.text = "Waiting for dnsmasq to be ready..."
			try {
				await waitForService(dnsmasq_proc.pid, DNSMASQ_PORT)
				startedPids.push(dnsmasq_proc.pid)
				$dnsmasq_start.succeed(
					`dnsmasq started on http://127.0.0.1:${DNSMASQ_PORT} (PID: ${dnsmasq_proc.pid})`
				)
			} catch (error) {
				$dnsmasq_start.fail(`dnsmasq failed to start: ${error}`)
				await cleanupPartialState(startedPids, stateDir)
				throw error
			}

			const $caddy_start = ora("Configuring caddy...").start()
			const caddy_config = `
{
	admin 127.0.0.1:2519
}

http://localhost:${CADDY_PORT} {
	respond "Localport is working! Use custom .local domains by setting DNS to 127.0.0.1:${DNSMASQ_PORT}"
}
`.trim()
			await write(`${configDir}/Caddyfile`, caddy_config)

			$caddy_start.text = "Starting caddy..."
			const caddy_log = `${logsDir}/caddy.log`
			const caddy_proc = Bun.spawn(
				["caddy", "run", "--config", `${configDir}/Caddyfile`],
				{
					detached,
					stderr: Bun.file(caddy_log),
					stdout: Bun.file(caddy_log)
				}
			)
			await write(`${stateDir}/caddy.pid`, `${caddy_proc.pid}`)
			logProcessExit(caddy_proc, "caddy", caddy_log)

			$caddy_start.text = "Waiting for caddy to be ready..."
			try {
				await waitForService(caddy_proc.pid, CADDY_PORT)
				startedPids.push(caddy_proc.pid)
				$caddy_start.succeed(
					`caddy started on http://localhost:${CADDY_PORT} (PID: ${caddy_proc.pid})`
				)
			} catch (error) {
				$caddy_start.fail(`caddy failed to start: ${error}`)
				await cleanupPartialState(startedPids, stateDir)
				throw error
			}
			console.log(`🎉 Localport is running!`)
		} else {
			const dnsmasq_config = `
address=/local/127.0.0.1
port=${DNSMASQ_PORT}
listen-address=127.0.0.1
cache-size=10000
server=1.1.1.1
server=8.8.8.8
keep-in-foreground
`.trim()
			await write(`${configDir}/dnsmasq.conf`, dnsmasq_config)

			const dnsmasq_log = `${logsDir}/dnsmasq.log`
			const dnsmasq_proc = Bun.spawn(
				["dnsmasq", "-C", `${configDir}/dnsmasq.conf`],
				{
					detached,
					stderr: Bun.file(dnsmasq_log),
					stdout: Bun.file(dnsmasq_log)
				}
			)
			await write(`${stateDir}/dnsmasq.pid`, `${dnsmasq_proc.pid}`)
			logProcessExit(dnsmasq_proc, "dnsmasq", dnsmasq_log)

			try {
				await waitForService(dnsmasq_proc.pid, DNSMASQ_PORT)
				startedPids.push(dnsmasq_proc.pid)
			} catch (error) {
				await cleanupPartialState(startedPids, stateDir)
				throw error
			}

			const caddy_config = `
{
	admin 127.0.0.1:2519
}

http://localhost:${CADDY_PORT} {
	respond "Localport is working! Use custom .local domains by setting DNS to 127.0.0.1:${DNSMASQ_PORT}"
}
`.trim()
			await write(`${configDir}/Caddyfile`, caddy_config)

			const caddy_log = `${logsDir}/caddy.log`
			const caddy_proc = Bun.spawn(
				["caddy", "run", "--config", `${configDir}/Caddyfile`],
				{
					detached,
					stderr: Bun.file(caddy_log),
					stdout: Bun.file(caddy_log)
				}
			)
			await write(`${stateDir}/caddy.pid`, `${caddy_proc.pid}`)
			logProcessExit(caddy_proc, "caddy", caddy_log)

			try {
				await waitForService(caddy_proc.pid, CADDY_PORT)
				startedPids.push(caddy_proc.pid)
			} catch (error) {
				await cleanupPartialState(startedPids, stateDir)
				throw error
			}
		}
	})
}
