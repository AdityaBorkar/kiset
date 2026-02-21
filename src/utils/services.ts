import { $, file } from "bun"

import { CADDY_PORT, DNSMASQ_PORT } from "./constants.ts"
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

export const SERVICES: ServiceInfo[] = [
	{
		name: "dnsmasq",
		pidPath: paths.dnsmasq_pid,
		port: DNSMASQ_PORT,
		statePath: paths.dnsmasq_state
	},
	{
		name: "caddy",
		pidPath: paths.caddy_pid,
		port: CADDY_PORT,
		statePath: paths.caddy_state
	}
]

export interface ServiceStatus {
	dnsWorking?: boolean
	error?: string
	healthy?: boolean
	httpWorking?: boolean
	name: string
	pid?: string
	port?: number
	running: boolean
}

export interface ServiceState {
	pid: number
	port: number
}

export async function readServiceState(
	statePath: string
): Promise<ServiceState | null> {
	try {
		const content = await file(statePath).text()
		const state = JSON.parse(content) as ServiceState
		return state
	} catch {
		return null
	}
}

export async function readPidWithBackwardsCompat(
	statePath: string,
	pidPath: string
): Promise<number | null> {
	const state = await readServiceState(statePath)
	if (state) return state.pid

	try {
		const content = await file(pidPath).text()
		return Number.parseInt(content.trim(), 10)
	} catch {
		return null
	}
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

export async function cleanupPartialState(pids: number[], stateDir: string) {
	for (const pid of pids) {
		try {
			await $`kill ${pid} 2>/dev/null || true`
		} catch {}
	}
	await $`rm -f ${stateDir}/dnsmasq.pid ${stateDir}/caddy.pid ${stateDir}/dnsmasq.json ${stateDir}/caddy.json 2>/dev/null || true`
}
