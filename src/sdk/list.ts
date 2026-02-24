import type { Arguments } from "#/cli"
import { getProjectConfig } from "#/utils"
import { getPortAssignments } from "#/utils/port-assignment"

export async function list(
	{ name, projectId }: { name?: string; projectId?: string },
	{ verbose }: Arguments
) {
	const config = await getProjectConfig()
	const projId = projectId || config?.projectId
	// @ts-expect-error
	const assignments = await getPortAssignments({ name, projectId: projId })
	if (verbose) {
		console.log("Assignments:")
		console.log(JSON.stringify(assignments, null, 2))
	}
	return assignments
}
