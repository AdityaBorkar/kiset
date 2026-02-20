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
