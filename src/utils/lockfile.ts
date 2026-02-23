import { file, sleep } from "bun"

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
			const isLocked = await this.isLocked()
			if (isLocked) {
				await sleep(100)
				continue
			}

			try {
				await file(this.lockPath).write(`${pid}\n`)
				this.acquired = true
				return true
			} catch (error) {
				const err = error as NodeJS.ErrnoException
				if (err.code === "EEXIST") {
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

	async unlock() {
		// TODO: Identify the process holding the lock and gracefully KILL the process
		// try {
		// 	const lockFile = file(this.lockPath)
		// 	await lockFile.delete()
		// } catch {}
		return false
	}
}
