#!/usr/bin/env bun

import { $, file } from "bun"

async function analyzeChangesWithOpencode(
	diff: string
): Promise<{ type: string; summary: string }> {
	const prompt = `Analyze this git diff and provide:
1. A semver bump type (major, minor, or patch) based on conventional commits:
   - major: breaking changes, removed APIs, "BREAKING CHANGE:" in commits
   - minor: new features, new exports, new CLI commands/flags
   - patch: bug fixes, refactors, type improvements, internal changes
2. A concise one-line summary of the changes (max 80 chars)

Respond with exactly this format:
TYPE: <major|minor|patch>
SUMMARY: <one-line summary>

Diff:
${diff}`

	try {
		const output =
			"TYPE: minor\nSUMMARY: Add cf-tunnel service module with path and service management\n" // await $`opencode run ${prompt}`.text()
		const lines = output.trim().split("\n")
		const typeLine = lines.find((l) => l.startsWith("TYPE:"))
		const summaryLine = lines.find((l) => l.startsWith("SUMMARY:"))

		if (!typeLine || !summaryLine) {
			console.warn("Could not parse opencode output, defaulting to patch")
			return { summary: "Auto-generated changeset", type: "patch" }
		}

		const type = typeLine.split(":")[1]?.trim().toLowerCase()
		const summary = summaryLine.split(":")[1]?.trim()

		return {
			summary: summary || "Auto-generated changeset",
			type:
				type === "major" || type === "minor" || type === "patch"
					? type
					: "patch"
		}
	} catch (error) {
		console.warn("Opencode failed, using defaults:", error)
		return { summary: "Auto-generated changeset", type: "patch" }
	}
}

async function main(): Promise<void> {
	const diff = await $`git diff --cached -- src/`.text()
	if (diff.trim() === "") {
		console.log("No changes in src/ files, skipping changeset generation")
		process.exit(0)
	}
	const { type, summary } = await analyzeChangesWithOpencode(diff)
	const entry = `---\n"kiset": ${type}\n---\n\n${summary}\n`

	const emptyChangesetResult = await $`bun changeset --empty`.text()
	const fileName = emptyChangesetResult.split("\n")[2]?.trim().slice(9)
	await file(fileName).write(entry)

	await $`git add ${fileName}`.quiet()
	console.log(`Changeset generated: ${type} - ${summary}`)
	process.exit(0)
}

if (import.meta.main) {
	try {
		main()
	} catch (error) {
		console.error("Failed to generate changeset:", error)
		process.exit(0)
	}
}
