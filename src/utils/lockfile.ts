import { file } from "bun"

export class LockFile {
	private lockPath: string
	private acquired = false

	constructor(lockPath: string) {
		this.lockPath = lockPath
	}

	async acquire(timeout: number = 5000): Promise<void> {
		const startTime = Date.now()
		const pid = process.pid

		while (Date.now() - startTime < timeout) {
			const lockFile = file(this.lockPath)
			const exists = await lockFile.exists()

			if (!exists) {
				try {
					await lockFile.write(`${pid}\n`)
					this.acquired = true
					return
				} catch (error) {
					const err = error as NodeJS.ErrnoException
					if (err.code === "EEXIST") {
						continue
					}
					throw error
				}
			}
			await new Promise((resolve) => setTimeout(resolve, 50))
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

	async withLock<T>(fn: () => Promise<T>): Promise<T> {
		await this.acquire()
		try {
			return await fn()
		} finally {
			await this.release()
		}
	}
}
