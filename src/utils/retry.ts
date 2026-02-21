export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 5,
	baseDelay: number = 100,
	maxDelay: number = 5000
): Promise<T> {
	let lastError: unknown

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error
			if (attempt < maxRetries - 1) {
				const delay = Math.min(baseDelay * 2 ** attempt, maxDelay)
				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}
	}

	throw lastError
}
