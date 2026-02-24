import type { Arguments } from "#/cli"

type PortAssignments = Record<string, Record<string, number>>

export async function list(
	{ name }: { name: string },
	{ verbose }: Arguments
): Promise<PortAssignments | Record<string, number>> {
	// const assignments = await readAssignments()
	// if (program) {
	// 	const result = assignments[program] ?? {}
	// 	logger.info(JSON.stringify(result, null, 2))
	// 	return result
	// }
	// logger.info(JSON.stringify(assignments, null, 2))
	// return assignments
	// 			const ports = Object.values(result as Record<string, number>)
	// 			logger.info(`'${program}' ports: [${ports.join(", ")}]`)
	// 			const assignments = result as Record<string, Record<string, number>>
	// 			const entries = Object.entries(assignments)
	// 			if (entries.length === 0) {
	// 				logger.info("No port assignments found")
	// 			} else {
	// 				for (const [prog, ports] of entries) {
	// 					const portValues = Object.values(ports)
	// 					logger.info(`${prog}: [${portValues.join(", ")}]`)
	// 				}
	// 			}
}
