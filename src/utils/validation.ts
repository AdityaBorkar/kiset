import { chmodSync } from "node:fs"

export class ValidationError extends Error {
	constructor(field: string, reason: string) {
		super(`Invalid ${field}: ${reason}`)
		this.name = "ValidationError"
	}
}

export function validateUsername(username: string): void {
	if (!username || typeof username !== "string") {
		throw new ValidationError("username", "must be a non-empty string")
	}

	if (username.length > 32) {
		throw new ValidationError("username", "must be at most 32 characters")
	}

	if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
		throw new ValidationError(
			"username",
			"must contain only alphanumeric characters, underscores, or hyphens"
		)
	}

	if (
		username.includes("..") ||
		username.includes("\n") ||
		username.includes("\r")
	) {
		throw new ValidationError("username", "contains invalid characters")
	}
}

export function validatePath(path: string, fieldName: string): void {
	if (!path || typeof path !== "string") {
		throw new ValidationError(fieldName, "must be a non-empty string")
	}

	if (path.includes("..")) {
		throw new ValidationError(fieldName, "contains path traversal sequence")
	}

	if (path.includes("\0")) {
		throw new ValidationError(fieldName, "contains null byte")
	}

	if (path.includes("\n") || path.includes("\r")) {
		throw new ValidationError(fieldName, "contains newline character")
	}

	if (!path.startsWith("/")) {
		throw new ValidationError(fieldName, "must be an absolute path")
	}
}

export function setFilePermissions(path: string, mode: number): void {
	try {
		chmodSync(path, mode)
	} catch (error) {
		throw new Error(`Failed to set permissions for ${path}: ${error}`)
	}
}
