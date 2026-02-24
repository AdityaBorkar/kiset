import { file } from "bun"

import { isPortAvailable, PATHS } from "#/utils"
import { getGlobalConfig } from "#/utils/config"
import { logger } from "#/utils/logger"

type PortAssignments = Record<string, Record<string, number>>

type PortAssignment = {
	port: number
	name?: string
}

export async function readAssignments(): Promise<PortAssignments> {
	const state = file(PATHS.ASSIGNMENTS_STATE)
	if (!(await state.exists())) {
		return {}
	}
	return await state.json()
}

export async function writeAssignments(
	assignments: PortAssignments
): Promise<void> {
	await file(PATHS.ASSIGNMENTS_STATE).write(
		JSON.stringify(assignments, null, 2)
	)
}

export async function releasePorts(programName: string): Promise<void> {
	const assignments = await readAssignments()
	delete assignments[programName]
	await writeAssignments(assignments)

	logger.info(`Released all ports for ${programName}`)
}

export async function findAvailablePort(
	startPort: number,
	endPort: number,
	excludePorts: Set<number>
): Promise<number> {
	for (let port = startPort; port <= endPort; port++) {
		if (excludePorts.has(port)) continue

		const inUse = await isPortAvailable({ hostname: "127.0.0.1", port })
		if (inUse) return port
	}

	throw new Error(
		`No available ports in range ${startPort}-${endPort}. Consider expanding the range or releasing some ports.`
	)
}

function getAssignedPorts(assignments: PortAssignments): Set<number> {
	const ports = new Set<number>()
	for (const programPorts of Object.values(assignments)) {
		for (const port of Object.values(programPorts)) {
			ports.add(port)
		}
	}
	return ports
}

export async function assignAutoPorts(
	config: {
		ports: Record<string, { dev?: number | "auto"; name?: string }>
	},
	programName: string
): Promise<Record<string, PortAssignment>> {
	const assignments = await readAssignments()
	const allAssignedPorts = getAssignedPorts(assignments)
	const assignedPorts: Record<string, PortAssignment> = {}

	const globalConfig = await getGlobalConfig()
	const portRange = globalConfig.port_assignment?.range || {
		end: 4999,
		start: 4000
	}
	const deniedPorts = new Set(globalConfig.port_assignment?.deny || [])

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
