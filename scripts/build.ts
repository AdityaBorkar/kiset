#!/usr/bin/env bun

import { $, build, file } from "bun"

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
	logger.success("Type declarations generated")
}

async function updatePackageFiles() {
	logger.info("Updating package.json...")
	const pkgFile = file("./package.json")
	const pkg = await pkgFile.json()
	pkg.bin = {
		kiset: "dist/cli.js"
	}
	pkg.exports["."] = {
		import: "./dist/index.js",
		types: "./dist/index.d.ts"
	}
	pkgFile.write(`${JSON.stringify(pkg, null, "\t")}\n`)
	logger.success("package.json updated")

	logger.info("Updating jsr.json...")
	const jsrFile = file("./jsr.json")
	const jsr = await jsrFile.json()
	jsr.exports = "./dist/index.js"
	jsr.version = pkg.version
	jsr.publish.include = pkg.files
	jsrFile.write(`${JSON.stringify(jsr, null, "\t")}\n`)
	logger.success("jsr.json updated")
}

async function main() {
	logger.info(`Building kiset`)

	await cleanDist()
	await buildEntryPoints()
	await generateTypes()
	await updatePackageFiles()

	logger.success("✓ Build complete!")
}

if (import.meta.main) {
	main().catch((error) => {
		logger.error("Build failed:", error)
		process.exit(1)
	})
}
