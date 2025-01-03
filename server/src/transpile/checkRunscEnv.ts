import { $ } from "bun"
import { env } from "../env"

export async function checkRunscEnvironment(): Promise<boolean> {
  return new Promise(async resolve => {
    runscAvailable()
      .then(available => {
        if (!available) {
          if (!isDev() && env.TRANSPILER_GVISOR) {
            console.error(
              "gVisor (runsc) is not available and is required for production."
            )
            process.exit(1)
          } else if (!isDev()) {
            console.warn(
              "WARN: gVisor (runsc) is DISABLED. Transpilation security might be compromised."
            )
          } else {
            console.warn(
              "WARN: gVisor (runsc) is not available and will not be used for transpilation. This will break in production."
            )
          }
        }
        resolve(available)
      })
      .catch(error => {
        console.error("Error checking runsc availability:", error, "Exiting.")
        process.exit(1)
      })
  })
}

function isDev() {
  return env.ENV === "development"
}

async function runscAvailable(): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    $`docker info`
      .nothrow()
      .quiet()
      .then(({ stdout, stderr, exitCode }) => {
        if (exitCode !== 0) {
          console.log("exit code is ", exitCode)
          return reject(stderr.toString())
        }
        return resolve(stdout.includes("runsc"))
      })
      .catch(error => {
        console.error("Error checking runsc availability. Is Docker mounted?", error)
        reject(error)
      })
  })
}
