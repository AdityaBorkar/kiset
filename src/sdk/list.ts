import { file } from "bun"

import { getLocalportPortsDir } from "../utils"

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

export async function list(program?: string): Promise<Assignments | number[]> {
	const assignments = await readAssignments()

	if (program) {
		if (!(program in assignments)) {
			throw new Error(`Program '${program}' has no port assignments`)
		}
		return assignments[program] || []
	}

	return assignments
}
