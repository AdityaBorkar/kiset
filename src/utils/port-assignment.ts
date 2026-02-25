import { file } from "bun"

import { isPortAvailable, PATHS } from "#/utils"

type PortAssignments = Record<string, Record<string, PortAssignment>>

type PortAssignment = {
	port: number
	name: string
	subdomain?: string
}

export async function getPortAssignments(props?: {
	name?: string | undefined
	projectId: string
}) {
	const state = file(PATHS.ASSIGNMENTS_STATE)
	const assignments = (await state.exists())
		? ((await state.json()) as PortAssignments)
		: {}

	const { projectId, name } = props || {}
	if (projectId) {
		if (name) {
			return assignments[projectId]?.[name]
		}
		return assignments[projectId] || {}
	}

	return Object.entries(assignments).flatMap(([projectId, assignment]) => {
		return Object.entries(assignment).map(([, data]) => ({
			projectId,
			...data
		}))
	})
}

export async function registerPortAssignment(props: {
	name: string
	projectId: string
	port: number
	subdomain?: string
}): Promise<void> {
	const { projectId, name, port, subdomain = "" } = props

	const state = file(PATHS.ASSIGNMENTS_STATE)
	const assignments = (await state.exists())
		? ((await state.json()) as PortAssignments)
		: {}

	if (!assignments[projectId]) {
		assignments[projectId] = {}
	}
	assignments[projectId][name] = { name, port, subdomain }

	await file(PATHS.ASSIGNMENTS_STATE).write(
		JSON.stringify(assignments, null, 2)
	)
}

// TODO: RELEASE PORTS
// export async function releasePorts(programName: string): Promise<void> {
// 	const assignments = await getPortAssignments()
// 	delete assignments[programName]
// 	await writePortAssignments(assignments)
// 	logger.info(`Released all ports for ${programName}`)
// }

export async function getRandomAvailablePort({
	startPort,
	endPort,
	exclude
}: {
	startPort: number
	endPort: number
	exclude: Set<number>
}): Promise<number> {
	const range = endPort - startPort + 1
	while (true) {
		const port = Math.floor(Math.random() * range) + startPort
		if (exclude.has(port)) continue
		if (exclude.size >= range) {
			throw new Error(
				`No available ports in range ${startPort}-${endPort}. Consider expanding the range or releasing some ports.`
			)
		}

		const available = await isPortAvailable({ hostname: "127.0.0.1", port })
		if (available) return port
		exclude.add(port)
	}
}
