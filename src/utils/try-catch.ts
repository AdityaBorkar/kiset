export async function tryCatch<T>(
	promise: Promise<T>
): Promise<{ result?: T; error?: string }> {
	try {
		const result = await promise
		return { result }
	} catch (error) {
		if (error instanceof Error) {
			return { error: error.message }
		}
		return { error: String(error) }
	}
}
