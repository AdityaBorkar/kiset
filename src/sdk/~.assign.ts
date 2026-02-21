// import { readAssignments, writeAssignments } from "#/utils/services"

// export async function assign(
// 	program: string,
// 	ports: number[]
// ): Promise<number[]> {
// 	const assignments = await readAssignments()

// 	for (const port of ports) {
// 		if (port < 1 || port > 65535) {
// 			throw new Error(`Invalid port number: ${port} (must be 1-65535)`)
// 		}
// 		if (!Number.isInteger(port)) {
// 			throw new Error(`Port must be an integer: ${port}`)
// 		}
// 	}

// 	const usedPorts = new Set(
// 		Object.entries(assignments)
// 			.filter(([prog]) => prog !== program)
// 			.flatMap(([, progPorts]) => progPorts)
// 	)

// 	const duplicatePorts = ports.filter((p) => usedPorts.has(p))
// 	if (duplicatePorts.length > 0) {
// 		throw new Error(
// 			`Port${duplicatePorts.length > 1 ? "s" : ""} ${duplicatePorts.join(", ")} ${duplicatePorts.length > 1 ? "are" : "is"} already assigned to another program`
// 		)
// 	}

// 	const finalPorts = Array.from(
// 		new Set([...(assignments[program] || []), ...ports])
// 	).sort((a, b) => a - b)

// 	assignments[program] = finalPorts
// 	await writeAssignments(assignments)

// 	return finalPorts
// }
