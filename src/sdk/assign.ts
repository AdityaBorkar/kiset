import { $, file } from "bun"

import { getLocalportPortsDir } from "../utils"

const PORTS_DIR = getLocalportPortsDir()
const ASSIGNMENTS_FILE = `${PORTS_DIR}/assignments.json`

type Assignments = Record<string, number[]>

async function readAssignments(): Promise<Assignments> {
	const f = file(ASSIGNMENTS_FILE)
	if (!(await f.exists())) {
		await $`mkdir -p ${PORTS_DIR}`
		return {}
	}
	return JSON.parse(await f.text())
}

async function writeAssignments(assignments: Assignments): Promise<void> {
	await $`mkdir -p ${PORTS_DIR}`
	await file(ASSIGNMENTS_FILE).write(JSON.stringify(assignments, null, 2))
}

export async function assign(
	program: string,
	ports: number[]
): Promise<number[]> {
	const assignments = await readAssignments()

	for (const port of ports) {
		if (port < 1 || port > 65535) {
			throw new Error(`Invalid port number: ${port} (must be 1-65535)`)
		}
		if (!Number.isInteger(port)) {
			throw new Error(`Port must be an integer: ${port}`)
		}
	}

	const usedPorts = new Set<number>()
	for (const [prog, progPorts] of Object.entries(assignments)) {
		if (prog !== program) {
			for (const p of progPorts) {
				usedPorts.add(p)
			}
		}
	}

	for (const port of ports) {
		if (usedPorts.has(port)) {
			throw new Error(`Port ${port} is already assigned to another program`)
		}
	}

	const existingPorts = assignments[program] || []
	const newPortsSet = new Set([...existingPorts, ...ports])
	const finalPorts = Array.from(newPortsSet).sort((a, b) => a - b)

	assignments[program] = finalPorts
	await writeAssignments(assignments)

	return finalPorts
}
