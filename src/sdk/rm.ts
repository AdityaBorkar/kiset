import { readAssignments, writeAssignments } from "./shared"

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
