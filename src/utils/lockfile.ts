import { open } from "node:fs/promises"
import { file, sleep } from "bun"

import { logger } from "#/utils"

export class LockFile {
	private lockPath: string
	private acquired = false

	constructor(lockPath: string) {
		this.lockPath = lockPath
	}

	async acquire(timeout: number = 5000): Promise<boolean> {
		const startTime = Date.now()
		const pid = process.pid

		while (Date.now() - startTime < timeout) {
			try {
				const fd = await open(this.lockPath, "wx")
				await fd.write(`${pid}\n`)
				await fd.close()
				this.acquired = true
				return true
			} catch (error) {
				const err = error as NodeJS.ErrnoException
				if (err.code === "EEXIST") {
					await sleep(100)
					continue
				}
				throw error
			}
		}

		throw new Error(
			`Could not acquire lock on ${this.lockPath}. Is another operation in progress?`
		)
	}

	async release(): Promise<void> {
		if (this.acquired) {
			try {
				const lockFile = file(this.lockPath)
				await lockFile.delete()
			} catch {}
			this.acquired = false
		}
	}

	async isLocked(): Promise<boolean> {
		const lockFile = file(this.lockPath)
		return await lockFile.exists()
	}

	async UNSAFE_unlock(props: { verbose?: boolean } = {}): Promise<boolean> {
		try {
			// TODO: Identify the process holding the lock and gracefully KILL the process
			const lockFile = file(this.lockPath)
			const acquired = await lockFile.exists()
			if (!acquired) {
				return true
			}
			await lockFile.delete()
			if (props.verbose) {
				logger.info("Lock released successfully (unsafe)")
			}
			return true
		} catch (err) {
			if (props.verbose) {
				logger.info("Lock released successfully (unsafe)")
				logger.error(`Failed to release lock: ${err}`)
			}
			return false
		}
	}
}
