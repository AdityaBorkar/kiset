#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs"
import { $, build } from "bun"

import consola from "consola"

const logger = consola
const DIST_DIR = "dist"

async function cleanDist() {
	logger.info("Cleaning dist directory...")
	await $`rm -rf ${DIST_DIR}`
	await $`mkdir -p ${DIST_DIR}`
}

async function buildEntryPoints() {
	logger.info("Building entry points...")

	const result = await build({
		// minify: true,
		// splitting: true,
		entrypoints: ["./src/index.ts", "./src/cli.ts"],
		external: ["bun"],
		format: "esm",
		outdir: DIST_DIR,
		root: "./src",
		sourcemap: false,
		target: "bun",
		tsconfig: "./tsconfig.json"
	})
	if (!result.success) {
		logger.error("Library build failed:")
		for (const msg of result.logs) {
			logger.error(msg)
		}
		throw new Error("Library build failed")
	}

	logger.success("Build complete")
}

async function generateTypes() {
	logger.info("Generating type declarations...")
	await $`bun tsc --emitDeclarationOnly --declaration --outDir ${DIST_DIR}`
	// await $`mv ${DIST_DIR}/src/*.d.ts ${DIST_DIR}/`
	// await $`rmdir ${DIST_DIR}/src`
	logger.success("Type declarations generated")
}

async function updatePackageJson() {
	logger.info("Updating package.json...")
	const pkgPath = "package.json"
	const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))

	pkg.bin = { kiset: "dist/cli.js" }
	pkg.exports["."] = {
		import: "./dist/index.js",
		types: "./dist/index.d.ts"
	}

	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`)
	logger.success("package.json updated")
}

async function main() {
	logger.info(`Building kiset`)

	await cleanDist()
	await buildEntryPoints()
	await generateTypes()
	await updatePackageJson()

	logger.success("✓ Build complete!")
}

if (import.meta.main) {
	main().catch((error) => {
		logger.error("Build failed:", error)
		process.exit(1)
	})
}
