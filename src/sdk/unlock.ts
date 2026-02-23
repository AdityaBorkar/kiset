import ora from "ora"

import { LOCKFILE } from "#/utils"

export async function unlock(verbose = false): Promise<boolean> {
	const spinner = verbose ? ora().start() : null

	// spinner.text = "Getting lockfile status..."

	if (spinner) spinner.text = "Unlocking lockfile..."
	const result = await LOCKFILE.unlock()

	if (spinner) {
		result
			? spinner.succeed("LockFile unlocked successfully.")
			: spinner.fail("Failed to unlock LockFile.")
	}
	return result
}
