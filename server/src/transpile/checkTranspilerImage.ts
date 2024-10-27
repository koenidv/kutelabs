import { $ } from "bun"
import { env } from "../env"

export async function checkTranspilerImage() {
  $`docker images ${env.TRANSPILER_NAME}`
    .nothrow()
    .quiet()
    .then(({ stdout, stderr, exitCode }) => {
      if (exitCode !== 0) {
        console.error("Error while checking Docker images:", stderr)
        process.exit(1)
      }
      if (!stdout.includes(env.TRANSPILER_NAME)) {
        console.error(`Docker image '${env.TRANSPILER_NAME}' is NOT present`)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error("Error running docker images:", error)
      process.exit(1)
    })
}
