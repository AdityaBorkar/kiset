import { $, file } from "bun"

import { getPaths } from "#/utils"
import { CADDY_PORT, DNSMASQ_PORT, PATHS } from "#/utils/constants"

export const PORTS_DIR = getPaths().ports
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

export async function cleanupPartialState(pids: number[], stateDir: string) {
	for (const pid of pids) {
		try {
			await $`kill ${pid} 2>/dev/null || true`
		} catch {}
	}
	await $`rm -f ${stateDir}/dnsmasq.pid ${stateDir}/caddy.pid ${stateDir}/dnsmasq.json ${stateDir}/caddy.json 2>/dev/null || true`
}
