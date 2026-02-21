import { basename } from "node:path"

import { loadConfig } from "../config"
import { logger } from "../utils/logger"
import { assignAutoPorts } from "./managers/port-manager"
import { configureProxy } from "./managers/proxy-manager"
import { status } from "./status"

async function run(
	command: string,
	args: string[],
	env: Record<string, string>
): Promise<number> {
	const envVars: string[] = []
	for (const [key, value] of Object.entries(env)) {
		envVars.push(`${key}=${value}`)
	}

	const proc = Bun.spawn([command, ...args], {
		env: {
			...process.env,
			...env
		},
		stderr: "inherit",
		stdin: "inherit",
		stdout: "inherit"
	})

	await proc.exited
	return proc.exitCode ?? 1
}

export async function executeCommand(
	command: string,
	args: string[]
): Promise<number> {
	logger.info("Loading configuration...")
	const config = await loadConfig()

	logger.info("Checking service status...")
	const statusResults = await status(false)

	const allRunning = statusResults.every((service) => service.running)

	if (!allRunning) {
		const stoppedServices = statusResults
			.filter((service) => !service.running)
			.map((service) => service.name)
			.join(", ")

		throw new Error(
			`Localport services not running: ${stoppedServices}. Run \`localport start\` first.`
		)
	}

	const programName = basename(process.cwd())

	logger.info("Assigning ports...")
	const portAssignments = await assignAutoPorts(config, programName)

	logger.info("Configuring DNS and proxy...")
	await configureProxy(portAssignments)

	const env: Record<string, string> = {}
	for (const [portKey, portInfo] of Object.entries(portAssignments)) {
		env[portKey] = String(portInfo.port)
	}

	logger.info(`Executing: ${command} ${args.join(" ")}`)
	return await run(command, args, env)
}
