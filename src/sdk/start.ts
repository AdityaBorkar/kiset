import { $, write } from "bun"

import ora from "ora"

import {
	createLockFile,
	getLocalportConfigDir,
	getLocalportLogsDir,
	getLocalportStateDir,
	getPlatformId,
	install,
	isInstalled,
	waitForService
} from "#/utils"
import {
	CADDY_INSTALL_COMMANDS,
	CADDY_PORT,
	DNSMASQ_INSTALL_COMMANDS,
	DNSMASQ_PORT,
	PATHS
} from "#/utils/constants"

async function cleanupPartialState(pids: number[], stateDir: string) {
	for (const pid of pids) {
		try {
			await $`kill ${pid} 2>/dev/null || true`
		} catch {}
	}
	await $`rm -f ${stateDir}/dnsmasq.pid ${stateDir}/caddy.pid ${stateDir}/dnsmasq.json ${stateDir}/caddy.json 2>/dev/null || true`
}

async function writeStateFile(
	stateFilePath: string,
	pid: number,
	port: number
) {
	const state = { pid, port }
	await write(stateFilePath, JSON.stringify(state, null, 2))
}

async function logProcessExit(
	subprocess: ReturnType<typeof Bun.spawn>,
	serviceName: string,
	logFile: string
) {
	try {
		const exitCode = await subprocess.exited
		const reasons: Record<number, string> = {
			0: "Exited normally",
			130: "Interrupted by user (Ctrl+C)",
			137: "Killed",
			143: "Stopped via localport stop"
		}
		const reason =
			reasons[exitCode as keyof typeof reasons] ||
			`Exited with code ${exitCode}`
		console.error(`${serviceName} ${reason}. See ${logFile} for details.`)
	} catch {}
}

type ServiceConfig = {
	name: string
	configFile: string
	configContent: string
	command: string[]
	port: number
	statePath: string
}

async function startService(
	configDir: string,
	detached: boolean,
	logsDir: string,
	serviceConfig: ServiceConfig,
	verbose: boolean,
	startedPids: number[],
	stateDir: string
) {
	const spinner = verbose
		? ora(`Configuring ${serviceConfig.name}...`).start()
		: null

	await write(
		`${configDir}/${serviceConfig.configFile}`,
		serviceConfig.configContent
	)

	if (spinner) spinner.text = `Starting ${serviceConfig.name}...`

	const logFile = `${logsDir}/${serviceConfig.name}.log`
	const proc = Bun.spawn(serviceConfig.command, {
		detached,
		stderr: Bun.file(logFile),
		stdout: Bun.file(logFile)
	})
	await writeStateFile(serviceConfig.statePath, proc.pid, serviceConfig.port)
	logProcessExit(proc, serviceConfig.name, logFile)

	if (spinner) spinner.text = `Waiting for ${serviceConfig.name} to be ready...`

	try {
		await waitForService(proc.pid, serviceConfig.port)
		startedPids.push(proc.pid)
		if (spinner) {
			spinner.succeed(
				`${serviceConfig.name} started on http://127.0.0.1:${serviceConfig.port} (PID: ${proc.pid})`
			)
		}
	} catch (error) {
		if (spinner) spinner.fail(`${serviceConfig.name} failed to start: ${error}`)
		await cleanupPartialState(startedPids, stateDir)
		throw error
	}
}

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
		for (const [name, installCommands] of [
			["dnsmasq", DNSMASQ_INSTALL_COMMANDS],
			["caddy", CADDY_INSTALL_COMMANDS]
		] as const) {
			if (verbose) {
				const spinner = ora(`Installing ${name}...`).start()
				if (await isInstalled(name)) {
					spinner.succeed(`${name} is already installed.`)
				} else {
					const command = installCommands[platformId]
					await install({ command, label: name, verbose })
					spinner.succeed(`${name} installed successfully.`)
				}
			} else if (!(await isInstalled(name))) {
				const command = installCommands[platformId]
				await install({ command, label: name, verbose })
			}
		}

		await $`mkdir -p ${configDir} ${stateDir} ${logsDir}`

		const dnsmasqConfig = `address=/local/127.0.0.1
port=${DNSMASQ_PORT}
listen-address=127.0.0.1
cache-size=10000
server=1.1.1.1
server=8.8.8.8
keep-in-foreground`.trim()

		const caddyConfig = `{
	admin 127.0.0.1:2519
}

http://localhost:${CADDY_PORT} {
	respond "Localport is working! Use custom .local domains by setting DNS to 127.0.0.1:${DNSMASQ_PORT}"
}`.trim()

		await startService(
			configDir,
			detached,
			logsDir,
			{
				command: ["dnsmasq", "-C", `${configDir}/dnsmasq.conf`],
				configContent: dnsmasqConfig,
				configFile: "dnsmasq.conf",
				name: "dnsmasq",
				port: DNSMASQ_PORT,
				statePath: PATHS.DNSMASQ_STATE
			},
			verbose,
			startedPids,
			stateDir
		)

		await startService(
			configDir,
			detached,
			logsDir,
			{
				command: ["caddy", "run", "--config", `${configDir}/Caddyfile`],
				configContent: caddyConfig,
				configFile: "Caddyfile",
				name: "caddy",
				port: CADDY_PORT,
				statePath: PATHS.CADDY_STATE
			},
			verbose,
			startedPids,
			stateDir
		)

		if (verbose) console.log("🎉 Localport is running!")
	})
}
