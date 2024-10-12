import { $ } from "bun"

export async function checkTranspilerImage() {
  try {
    const { stdout, stderr, exitCode } = await $`docker images transpiler`.quiet()
    if (exitCode !== 0) {
      console.error("Error while checking Docker images:", stderr)
      process.exit(1)
    }
    if (!stdout.includes("transpiler")) {
      console.error("Docker image 'transpiler' is NOT present.")
      process.exit(1)
    }
  } catch (error) {
    console.error("Error running docker images:", error)
    process.exit(1)
  }
}
