/** biome-ignore-all lint/suspicious/noExplicitAny: NOT A CORE PROGRAM */

import { createOpencode } from "@opencode-ai/sdk"
import { consola } from "consola"
import ora from "ora"

type Options = {
	skipContributing: boolean
	skipReadme: boolean
	version?: string
}

function parseArgs(): Options {
	const args = process.argv.slice(2)
	const options: Options = {
		skipContributing: false,
		skipReadme: false
	}

	for (const arg of args) {
		if (arg === "--skip-contributing") {
			options.skipContributing = true
		}
		if (arg === "--skip-readme") {
			options.skipReadme = true
		}
		if (arg.startsWith("--version=")) {
			options.version = arg.replace("--version=", "")
		}
	}

	return options
}

async function getLastTag(): Promise<string> {
	const spinner = ora("Getting last release tag").start()
	try {
		const result = Bun.spawnSync(["git", "describe", "--tags", "--abbrev=0"])
		if (result.stdout.toString().trim()) {
			spinner.succeed(`Found last tag: ${result.stdout.toString().trim()}`)
			return result.stdout.toString().trim()
		}
	} catch {
		spinner.warn("No tags found, using initial commit")
	}

	try {
		const result = Bun.spawnSync(["git", "rev-list", "--max-parents=0", "HEAD"])
		spinner.succeed(`Using initial commit: ${result.stdout.toString().trim()}`)
		return result.stdout.toString().trim()
	} catch (error) {
		spinner.fail("Failed to get initial commit")
		throw error
	}
}

async function getGitChanges(fromTag: string): Promise<string> {
	const spinner = ora("Getting git changes").start()
	try {
		const result = Bun.spawnSync([
			"git",
			"log",
			`${fromTag}..HEAD`,
			"--oneline",
			"--no-merges"
		])
		const stdout = result.stdout.toString()
		spinner.succeed(
			`Found ${stdout.split("\n").filter(Boolean).length} commits`
		)
		return stdout.trim()
	} catch (error) {
		spinner.fail("Failed to get git log")
		throw error
	}
}

async function readFileContent(path: string): Promise<string> {
	try {
		return await Bun.file(path).text()
	} catch {
		return ""
	}
}

async function getProjectAnalysis(client: object): Promise<string> {
	const spinner = ora("Analyzing project structure").start()

	try {
		const files = await (client as any).find.files({
			query: { query: "*.{ts,js,json,md}" }
		})

		const sourceFiles =
			files.data?.filter((f: string) => f.startsWith("src/")) || []

		spinner.succeed(`Analyzed ${sourceFiles.length} source files`)
		return JSON.stringify(
			{
				sourceFileCount: sourceFiles.length,
				sourceFiles: sourceFiles.slice(0, 50)
			},
			null,
			2
		)
	} catch (error) {
		spinner.warn("Failed to analyze project, using basic structure")
		return JSON.stringify(
			{
				error: (error as Error).message
			},
			null,
			2
		)
	}
}

async function generateChangelogEntry(
	client: object,
	version: string,
	gitChanges: string,
	existingChangelog: string
): Promise<string> {
	const spinner = ora("Generating CHANGELOG entry").start()

	try {
		const session = await (client as any).session.create({
			body: { title: "Generate CHANGELOG entry" }
		})

		const prompt = `You are generating a CHANGELOG entry following Keep a Changelog format.

Current version to document: ${version}

Git commits since last release:
${gitChanges}

Existing CHANGELOG.md content:
${existingChangelog}

Please generate a CHANGELOG entry for version ${version}. The entry should:
1. Follow Keep a Changelog format (https://keepachangelog.com/en/1.0.0/)
2. Categorize changes into: Added, Changed, Deprecated, Removed, Fixed, Security
3. Be concise but informative
4. Reference commits where relevant
5. Start with "## [${version}]" heading

Return ONLY the new changelog entry (nothing else).`

		const result = await (client as any).session.prompt({
			body: {
				parts: [{ text: prompt, type: "text" }]
			},
			path: { id: (session as any).id }
		})

		spinner.succeed("Generated CHANGELOG entry")

		const assistantMessage = (result as any).data
		if (assistantMessage?.parts?.[0]?.text) {
			return assistantMessage.parts[0].text
		}

		throw new Error("No text in response")
	} catch (error) {
		spinner.fail("Failed to generate CHANGELOG entry")
		throw error
	}
}

async function appendToChangelog(newEntry: string): Promise<void> {
	const spinner = ora("Updating CHANGELOG.md").start()

	try {
		const existingContent = await readFileContent("CHANGELOG.md")

		const unreleasedIndex = existingContent.indexOf("## [Unreleased]")

		if (unreleasedIndex === -1) {
			throw new Error("Could not find ## [Unreleased] section in CHANGELOG.md")
		}

		const beforeUnreleased = existingContent.substring(0, unreleasedIndex)
		const afterUnreleased = existingContent.substring(unreleasedIndex)

		const newContent = `${beforeUnreleased}${newEntry}\n\n${afterUnreleased}`

		await Bun.file("CHANGELOG.md").write(newContent)
		spinner.succeed("Updated CHANGELOG.md")
	} catch (error) {
		spinner.fail("Failed to update CHANGELOG.md")
		throw error
	}
}

async function regenerateDocument(
	client: object,
	docType: "CONTRIBUTING" | "README",
	projectAnalysis: string
): Promise<void> {
	const spinner = ora(`Generating ${docType}.md`).start()

	try {
		const session = await (client as any).session.create({
			body: { title: `Generate ${docType}.md` }
		})

		const existingContent = await readFileContent(`${docType}.md`)

		let prompt = ""
		if (docType === "CONTRIBUTING") {
			prompt = `Regenerate CONTRIBUTING.md based on current project.

Project analysis:
${projectAnalysis}

Existing CONTRIBUTING.md:
${existingContent}

Generate a comprehensive CONTRIBUTING.md that:
1. Explains how to set up development environment
2. Lists available scripts (check package.json)
3. Describes the project structure
4. Explains the code style guidelines
5. Describes the testing approach
6. Explains how to submit changes

Return the complete CONTRIBUTING.md content.`
		} else {
			prompt = `Regenerate README.md based on current project.

Project analysis:
${projectAnalysis}

Existing README.md:
${existingContent}

Generate a comprehensive README.md that:
1. Has a clear project title and description
2. Lists key features
3. Provides installation instructions
4. Shows usage examples
5. Explains the project structure
6. Lists available commands/scripts
7. Includes API documentation if applicable
8. Has troubleshooting section

Return the complete README.md content.`
		}

		const result = await (client as any).session.prompt({
			body: {
				parts: [{ text: prompt, type: "text" }]
			},
			path: { id: (session as any).id }
		})

		spinner.succeed(`Generated ${docType}.md`)

		const assistantMessage = (result as any).data
		if (assistantMessage?.parts?.[0]?.text) {
			await Bun.file(`${docType}.md`).write(assistantMessage.parts[0].text)
		}
	} catch (error) {
		spinner.fail(`Failed to generate ${docType}.md`)
		throw error
	}
}

async function main() {
	const options = parseArgs()

	let version = options.version
	if (!version) {
		version = await consola.prompt("Enter version number", {
			default: "0.1.0",
			type: "text"
		})
		if (!version) {
			consola.error("Version number is required")
			process.exit(1)
		}
	}

	consola.info(`Generating documentation for version ${version}`)

	const spinner = ora("Initializing OpenCode SDK").start()

	let client: object
	let server: any

	try {
		const opencode = await createOpencode()
		client = opencode.client
		server = opencode.server

		spinner.succeed("OpenCode SDK initialized")

		const lastTag = await getLastTag()
		const gitChanges = await getGitChanges(lastTag)
		const existingChangelog = await readFileContent("CHANGELOG.md")

		if (!gitChanges) {
			consola.warn("No changes found since last release")
			process.exit(0)
		}

		const changelogEntry = await generateChangelogEntry(
			client,
			version,
			gitChanges,
			existingChangelog
		)

		await appendToChangelog(changelogEntry)

		if (!options.skipContributing || !options.skipReadme) {
			const projectAnalysis = await getProjectAnalysis(client)

			if (!options.skipContributing) {
				await regenerateDocument(client, "CONTRIBUTING", projectAnalysis)
			}

			if (!options.skipReadme) {
				await regenerateDocument(client, "README", projectAnalysis)
			}
		}

		consola.success("Documentation generation complete!")
	} catch (error) {
		consola.error(`Error: ${(error as Error).message}`)
		process.exit(1)
	} finally {
		if (server) {
			await server.close()
		}
	}
}

main()
