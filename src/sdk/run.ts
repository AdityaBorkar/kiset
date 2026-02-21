import { basename } from "node:path"

import { loadConfig } from "#/utils/config"
import { logger } from "#/utils/logger"
import { assignAutoPorts } from "./managers/port-manager"
import { configureProxy } from "./managers/proxy-manager"
import { status } from "./status"

async function run(
	command: string,
	args: string[],
	env: Record<string, string>
): Promise<number> {
	const proc = Bun.spawn([command, ...args], {
		env: { ...process.env, ...env },
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

	const env = Object.fromEntries(
		Object.entries(portAssignments).map(([portKey, portInfo]) => [
			portKey,
			String(portInfo.port)
		])
	)

	logger.info(`Executing: ${command} ${args.join(" ")}`)
	return await run(command, args, env)
}
