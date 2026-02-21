export async function tryCatch<T>(
	promise: Promise<T>
): Promise<{ result?: T; error?: string }> {
	try {
		const result = await promise
		return { result }
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err)
		return { error }
	}
}
