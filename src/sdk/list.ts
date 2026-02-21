import { readAssignments } from "./shared"

export async function list(
	program?: string
): Promise<Record<string, number[]> | number[]> {
	const assignments = await readAssignments()

	if (program) {
		if (!(program in assignments)) {
			throw new Error(`Program '${program}' has no port assignments`)
		}
		return assignments[program] || []
	}

	return assignments
}
