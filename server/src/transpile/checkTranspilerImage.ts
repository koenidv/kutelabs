import { $ } from "bun"

export async function checkTranspilerImage() {
  $`docker images transpiler`
    .nothrow()
    .quiet()
    .then(({ stdout, stderr, exitCode }) => {
      if (exitCode !== 0) {
        console.error("Error while checking Docker images:", stderr)
        process.exit(1)
      }
      if (!stdout.includes("transpiler")) {
        console.error("Docker image 'transpiler' is NOT present.")
        process.exit(1)
      }
    })
    .catch(error => {
      console.error("Error running docker images:", error)
      process.exit(1)
    })
}
