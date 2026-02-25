import ora from "ora"

import { caddy } from "#/services/caddy"
import {
	getGlobalConfig,
	getPortAssignments,
	getProjectConfig,
	getRandomAvailablePort,
	registerPortAssignment
} from "#/utils"
import { status } from "./service.status"

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

	if (spinner) spinner.text = "Loading configuration..."
	const gConfig = await getGlobalConfig()
	const pConfig = await getProjectConfig()

	const { hostname = "localhost" } = gConfig.server
	const { projectId } = pConfig
	const { start: startPort, end: endPort } = pConfig.port_assignment?.range || {
		end: 4999,
		start: 4000
	}
	const env: Record<string, string> = {}

	if (spinner) spinner.text = "Assigning ports..."

	const ports = (await getPortAssignments()) || []
	if (!Array.isArray(ports)) {
		throw new Error(
			`Unexpected port assignments format. Expected an object but got an array. Please check your state file for corruption.`
		)
	}
	const exclude = new Set(ports.map(({ port }) => port))
	for (const name in pConfig.ports) {
		const { subdomain = "" } = pConfig.ports[name] || {}

		// Assign Port
		let { port } =
			ports.filter((p) => p.name === name && p.projectId === projectId)?.[0] ||
			{}
		if (!port) {
			port = await getRandomAvailablePort({ endPort, exclude, startPort })
			await registerPortAssignment({ name, port, projectId })
			exclude.add(port)
		}

		// Assign subdomain and setup Reverse Proxy
		await caddy.routes.add({ hostname: `${subdomain}.${hostname}`, port })

		// Inject into env
		env[name] = port.toString()
	}

	spinner.succeed(`Executing Command: ${command} ${args.join(" ")}`)
	const subprocess = Bun.spawn([command, ...args], {
		env: { ...process.env, ...env },
		stderr: "inherit",
		stdin: "inherit",
		stdout: "inherit"
	})
	await subprocess.exited
	return subprocess.exitCode ?? 1
}
