import { $, file } from "bun"

import { getPaths } from "./paths.ts"

const paths = getPaths()
export const PORTS_DIR = paths.ports
export const ASSIGNMENTS_FILE = `${PORTS_DIR}/assignments.json`

export type Assignments = Record<string, number[]>

export type ServiceInfo = {
	name: string
	port: number
	statePath: string
	pidPath: string
}

export interface ServiceStatus {
	error?: string | undefined
	healthy?: boolean
	name: string
	pid?: string
	port?: number
	running: boolean
}

export interface ServiceState {
	pid: number
	port: number
}

export async function readAssignments(): Promise<Assignments> {
	const f = file(ASSIGNMENTS_FILE)
	if (!(await f.exists())) {
		await $`mkdir -p ${PORTS_DIR}`
		return {}
	}
	return JSON.parse(await f.text())
}

export async function writeAssignments(
	assignments: Assignments
): Promise<void> {
	await $`mkdir -p ${PORTS_DIR}`
	await file(ASSIGNMENTS_FILE).write(JSON.stringify(assignments, null, 2))
}
