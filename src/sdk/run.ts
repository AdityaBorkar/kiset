import ora from "ora"

import { assignAutoPorts, getProjectConfig } from "#/utils"
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

export async function run({
	command,
	args
}: {
	command: string
	args: string[]
}): Promise<number> {
	const spinner = ora().start()

	if (spinner) spinner.text = "Checking service status..."
	const statuses = await status(null, { verbose: false })
	const allRunning = Object.values(statuses).every((service) => service.running)
	if (!allRunning) {
		throw new Error(
			`Run \`kiset start\` first and make sure all services are running.`
		)
	}

	if (spinner) spinner.text = "Loading project configuration..."
	const config = await getProjectConfig()
	const { projectId } = config

	if (spinner) spinner.text = "Assigning ports..."
	const portAssignments = await assignAutoPorts(config, projectId)
	console.log({ portAssignments })

	// logger.info("Configuring DNS and proxy...")
	// await configureProxy(portAssignments)

	// const routes = await caddy.routes.list()
	// for (const { domain, port } of routes) {
	// 	logger.info(`Caddy route: ${domain} -> ${port}`)
	// 	await caddy.routes.add({ domain, port })
	// }

	if (spinner) spinner.text = "Injecting environment variables..."
	const env = Object.fromEntries(
		Object.entries(portAssignments).map(([portKey, portInfo]) => [
			portKey,
			String(portInfo.port)
		])
	)

	spinner.succeed(`Executing Command: ${command} ${args.join(" ")}`)
	return await exec(command, args, env)
}
