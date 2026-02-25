import type { Arguments } from "#/cli"
import { getPortAssignments, getProjectConfig } from "#/utils"

export async function list(
	{ name, projectId }: { name?: string; projectId?: string },
	{ verbose }: Arguments
) {
	const projId = projectId || (await getProjectConfig())?.projectId
	const assignments = await getPortAssignments({ name, projectId: projId })
	if (verbose) {
		console.log("Assignments:")
		console.log(JSON.stringify(assignments, null, 2))
	}
	return assignments
}
