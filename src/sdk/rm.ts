import { $, file } from "bun"

import { getLocalportPortsDir } from "#/utils"

const PORTS_DIR = getLocalportPortsDir()
const ASSIGNMENTS_FILE = `${PORTS_DIR}/assignments.json`

type Assignments = Record<string, number[]>

async function readAssignments(): Promise<Assignments> {
	const f = file(ASSIGNMENTS_FILE)
	if (!(await f.exists())) {
		return {}
	}
	return JSON.parse(await f.text())
}

async function writeAssignments(assignments: Assignments): Promise<void> {
	await $`mkdir -p ${PORTS_DIR}`
	await file(ASSIGNMENTS_FILE).write(JSON.stringify(assignments, null, 2))
}

export async function rm(
	program: string,
	ports?: number[]
): Promise<number[] | boolean> {
	const assignments = await readAssignments()

	if (!(program in assignments)) {
		throw new Error(`Program '${program}' has no port assignments`)
	}

	if (ports === undefined || ports.length === 0) {
		delete assignments[program]
		await writeAssignments(assignments)
		return true
	}

	const existingPorts = assignments[program] || []

	for (const port of ports) {
		if (!existingPorts.includes(port)) {
			throw new Error(`Port ${port} is not assigned to '${program}'`)
		}
	}

	const remainingPorts = existingPorts.filter((p) => !ports.includes(p))

	if (remainingPorts.length === 0) {
		delete assignments[program]
	} else {
		assignments[program] = remainingPorts
	}

	await writeAssignments(assignments)
	return ports
}
