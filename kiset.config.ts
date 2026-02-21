import { defineConfig } from "./src/index"

const environment = process.env.NODE_ENV || "development"

export default defineConfig({
	environment,
	infisical: {
		siteUrl:
			environment === "development"
				? "https://localhost:5301"
				: "https://app.infisical.com"
	},
	ports: {
		CONVEX_DASHBOARD_PORT: {},
		CONVEX_DB_PORT: {},
		CONVEX_ORIGIN_PORT: {},
		VITE_SERVER_PORT: { name: "maitri-global" }
	},
	projectId: "maitri-global"
})

// import { InfisicalSDK } from "@infisical/sdk"

// // Inject Infisical
// async function injectInfisical() {
// 	const infisical = new InfisicalSDK({
// 		siteUrl: "https://app.infisical.com" // or self-hosted URL
// 	})

// 	await infisical.auth().universalAuth.login({
// 		clientId: process.env.INFISICAL_CLIENT_ID,
// 		clientSecret: process.env.INFISICAL_CLIENT_SECRET
// 	})

// 	// fetch secrets
// 	const secrets = await infisical.secrets().listSecrets({
// 		environment: "dev",
// 		projectId: process.env.INFISICAL_PROJECT_ID,
// 		secretPath: "/"
// 	})

// 	// inject into process.env
// 	for (const secret of secrets.secrets) {
// 		process.env[secret.secretKey] = secret.secretValue
// 	}
// }
