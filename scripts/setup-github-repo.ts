import { consola } from "consola"
import ora from "ora"

function getEnvVar(name: string): string {
	return (process.env[name] || Bun.env[name]) as string
}

type BranchProtectionConfig = {
	requiredApprovingReviewCount: number
	dismissStaleReviews: boolean
	requireUpToDateBeforeMerge: boolean
	requiresStatusChecks: boolean
}

async function validateToken(token: string) {
	const response = await fetch("https://api.github.com/user", {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`
		}
	})

	if (response.status === 401) {
		throw new Error("GitHub token is invalid or expired")
	}

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Failed to validate token: ${error}`)
	}

	const scopes = response.headers.get("X-OAuth-Scopes") || ""

	if (!scopes.includes("repo")) {
		throw new Error(
			`Token missing required scope 'repo'. Available scopes: ${scopes}`
		)
	}
}

async function setBranchProtection(
	owner: string,
	repo: string,
	branch: string,
	config: BranchProtectionConfig,
	token: string
) {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`,
		{
			body: JSON.stringify({
				enforce_admins: false,
				require_up_to_date_before_merge: config.requireUpToDateBeforeMerge,
				required_pull_request_reviews: {
					dismiss_stale_reviews: config.dismissStaleReviews,
					required_approving_review_count: config.requiredApprovingReviewCount
				},
				required_status_checks: config.requiresStatusChecks
					? {
							contexts: [],
							strict: false
						}
					: null,
				restrictions: null
			}),
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${token}`
			},
			method: "PUT"
		}
	)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Failed to set protection for ${branch}: ${error}`)
	}

	return response.json()
}

async function setDefaultBranch(
	owner: string,
	repo: string,
	defaultBranch: string,
	token: string
) {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}`,
		{
			body: JSON.stringify({
				default_branch: defaultBranch
			}),
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${token}`
			},
			method: "PATCH"
		}
	)

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Failed to set default branch: ${error}`)
	}

	return response.json()
}

async function setupGitHubRepo() {
	const owner = getEnvVar("GITHUB_OWNER")
	const repo = getEnvVar("GITHUB_REPO")
	const token = getEnvVar("GITHUB_TOKEN")

	if (!owner || !repo || !token) {
		consola.error(
			"Missing required environment variables: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN"
		)
		process.exit(1)
	}

	const spinner = ora("Setting up GitHub repository").start()

	spinner.text = "Validating GitHub token"
	await validateToken(token)

	try {
		const canaryConfig: BranchProtectionConfig = {
			dismissStaleReviews: true,
			requiredApprovingReviewCount: 1,
			requiresStatusChecks: true,
			requireUpToDateBeforeMerge: true
		}

		const stableConfig: BranchProtectionConfig = {
			dismissStaleReviews: true,
			requiredApprovingReviewCount: 2,
			requiresStatusChecks: true,
			requireUpToDateBeforeMerge: true
		}

		spinner.text = "Setting up canary branch protection"
		await setBranchProtection(owner, repo, "canary", canaryConfig, token)

		spinner.text = "Setting up stable branch protection"
		await setBranchProtection(owner, repo, "stable", stableConfig, token)

		spinner.text = "Setting default branch to stable"
		await setDefaultBranch(owner, repo, "stable", token)

		spinner.succeed("GitHub repository setup complete")
	} catch (error) {
		spinner.fail(`Setup failed: ${error}`)
		process.exit(1)
	}
}

setupGitHubRepo()

// # Branch Setup Instructions

// ## 2. Configure Branch Protection (via GitHub UI or API)

// ### canary Branch

// - Require pull request reviews before merging
// - Require 1 approval
// - Dismiss stale approvals when new commits are pushed
// - Require branches to be up to date before merging
// - Require status checks to pass before merging

// ### Stable Branch

// - Require pull request reviews before merging
// - Require 2 approvals
// - Dismiss stale approvals when new commits are pushed
// - Require branches to be up to date before merging
// - Require status checks to pass before merging

// ## 4. Set Default Branch

// Set `stable` as the default branch for production releases.
