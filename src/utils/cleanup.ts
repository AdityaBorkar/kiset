import { $ } from "bun"

import { PATHS } from "#/utils"

export async function cleanup(pids: number[] = []) {
	for (const pid of pids) {
		await $`kill ${pid} 2>/dev/null || true`.catch(() => {})
	}
	await $`rm -f ${PATHS.STATE_DIR} ${PATHS.LOCKFILE} 2>/dev/null || true`
}
