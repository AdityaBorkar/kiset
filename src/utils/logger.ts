import consola from "consola"

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent"

const logLevels: LogLevel[] = ["debug", "info", "warn", "error", "silent"]

function getLevelIndex(level: LogLevel): number {
	return logLevels.indexOf(level)
}

export function setLogLevel(level: LogLevel): void {
	const index = getLevelIndex(level)
	consola.level = index
}

export function getLogLevel(): LogLevel {
	return logLevels[consola.level] ?? "info"
}

export const logger = consola
