import { basename } from "node:path"

import { assignAutoPorts, getProjectConfig, logger } from "#/utils"
import { configureProxy } from "#/utils/caddy"
import { status } from "./service.status"

async function exec(
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

export async function run(command: string, args: string[]): Promise<number> {
	logger.info("Loading configuration...")
	const config = await getProjectConfig()

	logger.info("Checking service status...")
	const statusResults = await status(false)
	const allRunning = Object.values(statusResults).every(
		(service) => service.running
	)
	if (!allRunning) {
		throw new Error(
			`Run \`kiset start\` first and make sure all services are running.`
		)
	}

	const programName = basename(process.cwd())

	logger.info("Assigning ports...")
	const portAssignments = await assignAutoPorts(config, programName)

	logger.info("Configuring DNS and proxy...")
	await configureProxy(portAssignments)

	logger.info("Environment variables:")
	const env = Object.fromEntries(
		Object.entries(portAssignments).map(([portKey, portInfo]) => [
			portKey,
			String(portInfo.port)
		])
	)

	logger.info(`Executing: ${command} ${args.join(" ")}`)
	return await exec(command, args, env)
}
