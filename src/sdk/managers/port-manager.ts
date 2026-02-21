import { $, file } from "bun"

import { checkPort, loadGlobalConfig } from "#/utils"
import { logger } from "#/utils/logger"

type PortAssignments = Record<string, Record<string, number>>

type PortAssignment = {
	port: number
	name?: string
}

const ASSIGNMENTS_FILE = `${
	// biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript index signature
	process.env["HOME"] ||
	// biome-ignore lint/complexity/useLiteralKeys: Required for TypeScript index signature
	process.env["USERPROFILE"]
}/.local/state/localport/ports/assignments.json`

async function readAssignments(): Promise<PortAssignments> {
	const f = file(ASSIGNMENTS_FILE)
	if (!(await f.exists())) {
		await $`mkdir -p ${ASSIGNMENTS_FILE.split("/").slice(0, -1).join("/")}`
		return {}
	}
	try {
		return JSON.parse(await f.text())
	} catch {
		return {}
	}
}

async function writeAssignments(assignments: PortAssignments): Promise<void> {
	await $`mkdir -p ${ASSIGNMENTS_FILE.split("/").slice(0, -1).join("/")}`
	await file(ASSIGNMENTS_FILE).write(JSON.stringify(assignments, null, 2))
}

export async function findAvailablePort(
	startPort: number,
	endPort: number,
	excludePorts: Set<number>
): Promise<number> {
	for (let port = startPort; port <= endPort; port++) {
		if (excludePorts.has(port)) continue

		const inUse = await checkPort(port, "127.0.0.1")
		if (!inUse) return port
	}

	throw new Error(
		`No available ports in range ${startPort}-${endPort}. Consider expanding the range or releasing some ports.`
	)
}

export async function getAssignedPorts(): Promise<Set<number>> {
	const assignments = await readAssignments()
	return new Set(
		Object.values(assignments).flatMap((ports) => Object.values(ports))
	)
}

export async function assignAutoPorts(
	config: {
		ports: Record<string, { dev?: number | "auto"; name?: string }>
	},
	programName: string
): Promise<Record<string, PortAssignment>> {
	const assignments = await readAssignments()
	const allAssignedPorts = await getAssignedPorts()
	const assignedPorts: Record<string, PortAssignment> = {}

	const globalConfig = await loadGlobalConfig()
	const portRange = globalConfig.server.port_assignment?.range || {
		end: 4999,
		start: 4000
	}
	const deniedPorts = new Set(globalConfig.server.port_assignment?.deny || [])

	for (const [portKey, portConfig] of Object.entries(config.ports)) {
		const excludePorts = new Set([...allAssignedPorts, ...deniedPorts])
		let portNumber: number

		if (typeof portConfig.dev === "number") {
			portNumber = portConfig.dev
			if (
				excludePorts.has(portNumber) &&
				!assignments[programName]?.[portKey]
			) {
				throw new Error(
					`Port ${portNumber} is already assigned to another program or is denied. Use 'auto' for automatic assignment or choose a different port.`
				)
			}
		} else {
			const existingPort = assignments[programName]?.[portKey]
			if (existingPort) {
				portNumber = existingPort
			} else {
				portNumber = await findAvailablePort(
					portRange.start,
					portRange.end,
					excludePorts
				)
			}
		}

		assignedPorts[portKey] = {
			port: portNumber,
			...(portConfig.name !== undefined ? { name: portConfig.name } : {})
		}
		allAssignedPorts.add(portNumber)
	}

	if (!assignments[programName]) {
		assignments[programName] = {}
	}

	for (const [portKey, portInfo] of Object.entries(assignedPorts)) {
		assignments[programName][portKey] = portInfo.port
	}

	await writeAssignments(assignments)

	logger.info(
		`Assigned ports for ${programName}: ${Object.entries(assignedPorts)
			.map(([k, v]) => `${k}=${v.port}`)
			.join(", ")}`
	)

	return assignedPorts
}

export async function releasePorts(programName: string): Promise<void> {
	const assignments = await readAssignments()
	delete assignments[programName]
	await writeAssignments(assignments)

	logger.info(`Released all ports for ${programName}`)
}
