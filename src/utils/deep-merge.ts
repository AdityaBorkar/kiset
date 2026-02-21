export function deepMerge<T extends Record<string, unknown>>(
	target: T,
	source: Partial<T>
): T {
	const result = { ...target } as T

	for (const key in source) {
		const sourceValue = source[key]
		const targetValue = target[key]

		if (
			sourceValue !== undefined &&
			typeof sourceValue === "object" &&
			sourceValue !== null &&
			!Array.isArray(sourceValue) &&
			typeof targetValue === "object" &&
			targetValue !== null &&
			!Array.isArray(targetValue)
		) {
			result[key] = deepMerge(
				targetValue as Record<string, unknown>,
				sourceValue as Record<string, unknown>
			) as T[Extract<keyof T, string>]
		} else if (sourceValue !== undefined) {
			result[key] = sourceValue as T[Extract<keyof T, string>]
		}
	}

	return result
}
