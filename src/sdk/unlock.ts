import ora from "ora"

import type { Arguments } from "#/cli"
import { LOCKFILE } from "#/utils"

export async function unlock(
	_: null,
	{ verbose }: Arguments
): Promise<boolean> {
	const spinner = verbose ? ora().start() : null

	if (spinner) spinner.text = "Unlocking lockfile..."
	const result = await LOCKFILE.UNSAFE_unlock()

	if (result) {
		spinner?.succeed("LockFile unlocked successfully.")
	} else {
		spinner?.fail("Failed to unlock LockFile.")
	}
	return result
}
