import { logger, readAssignments } from "#/utils"

export async function list(
	program?: string
): Promise<Record<string, number[]> | number[]> {
	const assignments = await readAssignments()
	const allFlag = true
	const verbose = false

	if (allFlag) {
		logger.info(JSON.stringify(assignments, null, 2))
		return assignments
	}

	if (!(program in assignments)) {
		if (verbose) {
			logger.error(`Program '${program}' has no port assignments`)
		} else {
			throw new Error(`Program '${program}' has no port assignments`)
		}
		return {}
	}

	const projectAssignments = assignments[program] || []
	logger.info(
		`Ports assigned to '${program}': [${projectAssignments.join(", ")}]`
	)
	return projectAssignments
}
