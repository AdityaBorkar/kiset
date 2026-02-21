import { $, file } from "bun"

import { getLocalportPortsDir } from "#/utils"
import { CADDY_PORT, DNSMASQ_PORT, PATHS } from "#/utils/constants"

export const PORTS_DIR = getLocalportPortsDir()
export const ASSIGNMENTS_FILE = `${PORTS_DIR}/assignments.json`

export type Assignments = Record<string, number[]>

export type ServiceInfo = {
	name: string
	port: number
	statePath: string
	pidPath: string
}

export const SERVICES: ServiceInfo[] = [
	{
		name: "dnsmasq",
		pidPath: PATHS.DNSMASQ_PID,
		port: DNSMASQ_PORT,
		statePath: PATHS.DNSMASQ_STATE
	},
	{
		name: "caddy",
		pidPath: PATHS.CADDY_PID,
		port: CADDY_PORT,
		statePath: PATHS.CADDY_STATE
	}
]

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
