import { RequestError } from "@octokit/request-error"
import { Octokit } from "@octokit/rest"

function getEnvVar(name: string): string {
	return (process.env[name] || Bun.env[name]) as string
}

type GeneralSettingsCheck = {
	releaseImmutability: boolean
	disableWikis: boolean
	disableDiscussions: boolean
	disableProjects: boolean
	defaultCommitMessagePrTitle: boolean
	suggestUpdatePrBranches: boolean
}

type RulesetCheck = {
	name: string
	targets: string[]
	restrictCreations: boolean
	restrictUpdates: boolean
	restrictDeletions: boolean
	requiresPR: boolean
	requiresStatusChecks: boolean
	requiresUpToDate: boolean
	statusCheckContexts: string[]
	blockForcePushes: boolean
}

type RepoCheckResult = {
	branches: string[]
	defaultBranch: string
	generalSettings: GeneralSettingsCheck
	rulesets: RulesetCheck[]
}

const check = (cond: boolean) => (cond ? "✅" : "❌")

async function validateToken(octokit: Octokit): Promise<void> {
	try {
		await octokit.rest.users.getAuthenticated()
	} catch (error) {
		if (error instanceof RequestError && error.status === 401) {
			throw new Error("GitHub token is invalid or expired")
		}
		throw new Error(`Failed to validate token: ${error}`)
	}
}

async function getBranches(
	octokit: Octokit,
	owner: string,
	repo: string
): Promise<string[]> {
	const { data: branches } = await octokit.rest.repos.listBranches({
		owner,
		repo
	})
	return branches.map((b) => b.name)
}

async function getRepoData(
	octokit: Octokit,
	owner: string,
	repo: string
): Promise<{ defaultBranch: string; settings: GeneralSettingsCheck }> {
	const { data } = await octokit.rest.repos.get({ owner, repo })

	return {
		defaultBranch: data.default_branch,
		settings: {
			defaultCommitMessagePrTitle:
				(data.allow_squash_merge ?? false) &&
				(data.allow_merge_commit ?? false),
			disableDiscussions: data.has_discussions === false,
			disableProjects: data.has_projects === false,
			disableWikis: data.has_wiki === false,
			releaseImmutability: data.allow_update_branch === false,
			suggestUpdatePrBranches: data.allow_auto_merge === true
		}
	}
}

async function getRulesets(
	octokit: Octokit,
	owner: string,
	repo: string
): Promise<RulesetCheck[]> {
	const { data: rulesets } = await octokit.rest.repos.getRepoRulesets({
		owner,
		repo
	})

	if (!rulesets || !Array.isArray(rulesets)) {
		return []
	}

	return rulesets.map((ruleset) => {
		const rules = ruleset.rules || []
		const conditions = ruleset.conditions || {}
		const branchPatterns =
			(
				(conditions.ref_name as { include?: Array<{ pattern: string }> })
					?.include || []
			).map((r) => r.pattern) || []

		const requiredChecksRule = rules.find(
			(r) => r.type === "required_status_checks"
		)
		const requiredChecks =
			(
				requiredChecksRule?.parameters as
					| { checks?: Array<{ context: string }> }
					| undefined
			)?.checks || []

		return {
			blockForcePushes: rules.some((r) => r.type === "non_fast_forward"),
			name: ruleset.name || "unnamed",
			requiresPR: rules.some((r) => r.type === "pull_request"),
			requiresStatusChecks: requiredChecksRule !== undefined,
			requiresUpToDate: requiredChecks.length > 0,
			restrictCreations: rules.some((r) => r.type === "creation"),
			restrictDeletions: rules.some((r) => r.type === "deletion"),
			restrictUpdates: rules.some((r) => r.type === "update"),
			statusCheckContexts: requiredChecks.map((c) => c.context),
			targets: branchPatterns
		}
	})
}

async function checkRepository(
	octokit: Octokit,
	owner: string,
	repo: string
): Promise<RepoCheckResult> {
	const [branches, repoData, rulesets] = await Promise.all([
		getBranches(octokit, owner, repo),
		getRepoData(octokit, owner, repo),
		getRulesets(octokit, owner, repo)
	])

	return {
		branches,
		defaultBranch: repoData.defaultBranch,
		generalSettings: repoData.settings,
		rulesets
	}
}

function displayRuleset(
	_name: string,
	actual: RulesetCheck | undefined,
	expected: RulesetCheck
): boolean {
	if (!actual) {
		console.log(`    [❌] Ruleset does not exist`)
		return false
	}

	const targetsMatch =
		JSON.stringify(actual.targets.sort()) ===
		JSON.stringify(expected.targets.sort())

	console.log(
		`    [${check(targetsMatch)}] Targets: ${expected.targets.join(" & ")}`
	)
	console.log(`    [${check(actual.restrictCreations)}] Restrict creations`)
	console.log(`    [${check(actual.restrictDeletions)}] Restrict deletions`)
	if (expected.restrictUpdates !== null) {
		console.log(`    [${check(actual.restrictUpdates)}] Restrict updates`)
	}
	if (expected.requiresPR) {
		console.log(`    [${check(actual.requiresPR)}] Requires PR to merge`)
	}
	console.log(
		`    [${check(actual.requiresStatusChecks)}] Require status checks to pass`
	)
	console.log(
		`      [${check(actual.requiresUpToDate)}] Branches must be up to date before merging`
	)
	const checksMatch =
		JSON.stringify(actual.statusCheckContexts.sort()) ===
		JSON.stringify(expected.statusCheckContexts.sort())
	console.log(
		`      [${check(checksMatch)}] Checks: ${expected.statusCheckContexts.join(", ")}`
	)
	console.log(`    [${check(actual.blockForcePushes)}] Block force pushes`)

	return (
		targetsMatch &&
		actual.restrictCreations &&
		actual.restrictDeletions &&
		(expected.restrictUpdates === null || actual.restrictUpdates) &&
		(!expected.requiresPR || actual.requiresPR) &&
		actual.requiresStatusChecks &&
		actual.requiresUpToDate &&
		checksMatch &&
		actual.blockForcePushes
	)
}

function displayChecklist(result: RepoCheckResult): number {
	let exitCode = 0

	console.log("")
	console.log("Repository Configuration Checklist")
	console.log("")

	console.log("Branches:")
	for (const branch of ["develop", "stable"]) {
		const exists = result.branches.includes(branch)
		const isDefault = result.defaultBranch === branch
		const status = exists ? "✅" : "❌"
		const statusText = isDefault ? "exists (default)" : "exists"
		console.log(`  [${status}] ${branch} - ${exists ? statusText : "missing"}`)
		if (!exists) exitCode = 1
	}
	console.log("")

	console.log("General Settings:")
	const {
		releaseImmutability,
		disableWikis,
		disableDiscussions,
		disableProjects,
		defaultCommitMessagePrTitle,
		suggestUpdatePrBranches
	} = result.generalSettings

	console.log(`  [${check(releaseImmutability)}] Enable release immutability`)
	console.log(`  [${check(disableWikis)}] Disable Wikis`)
	console.log(`  [${check(disableDiscussions)}] Disable Discussions`)
	console.log(`  [${check(disableProjects)}] Disable Projects`)
	console.log(
		`  [${check(defaultCommitMessagePrTitle)}] Default commit message = PR Title`
	)
	console.log(
		`  [${check(suggestUpdatePrBranches)}] Always suggest updating pull request branches`
	)

	if (
		!releaseImmutability ||
		!disableWikis ||
		!disableDiscussions ||
		!disableProjects ||
		!defaultCommitMessagePrTitle ||
		!suggestUpdatePrBranches
	) {
		exitCode = 1
	}
	console.log("")

	const expectedTagRuleset: RulesetCheck = {
		blockForcePushes: true,
		name: "Tag Protection",
		requiresPR: false,
		requiresStatusChecks: true,
		requiresUpToDate: true,
		restrictCreations: true,
		restrictDeletions: true,
		restrictUpdates: true,
		statusCheckContexts: ["linting", "formatting", "types"],
		targets: ["develop", "stable"]
	}

	const expectedBranchRuleset: RulesetCheck = {
		blockForcePushes: true,
		name: "Branch Protection",
		requiresPR: true,
		requiresStatusChecks: true,
		requiresUpToDate: true,
		restrictCreations: true,
		restrictDeletions: true,
		restrictUpdates: false,
		statusCheckContexts: ["linting", "formatting", "types"],
		targets: ["develop", "stable"]
	}

	const tagRuleset = result.rulesets.find((r) => r.name === "Tag Protection")
	const branchRuleset = result.rulesets.find(
		(r) => r.name === "Branch Protection"
	)

	console.log("Rulesets:")

	console.log("  Tag Protection:")
	if (!displayRuleset("Tag Protection", tagRuleset, expectedTagRuleset)) {
		exitCode = 1
	}
	console.log("")

	console.log("  Branch Protection:")
	if (
		!displayRuleset("Branch Protection", branchRuleset, expectedBranchRuleset)
	) {
		exitCode = 1
	}

	return exitCode
}

async function setupGitHubRepo() {
	const owner = getEnvVar("GITHUB_OWNER")
	const repo = getEnvVar("GITHUB_REPO")
	const token = getEnvVar("GITHUB_TOKEN")

	if (!owner || !repo || !token) {
		console.error(
			"Missing required environment variables: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN"
		)
		process.exit(1)
	}

	const octokit = new Octokit({ auth: token })

	try {
		await validateToken(octokit)

		const result = await checkRepository(octokit, owner, repo)
		const exitCode = displayChecklist(result)

		process.exit(exitCode)
	} catch (error) {
		console.error(`Check failed: ${error}`)
		process.exit(1)
	}
}

setupGitHubRepo()
