import { $ } from "bun"
import { env } from "../env"

export async function checkRunscEnvironment(): Promise<boolean> {
  return new Promise(async resolve => {
    runscAvailable()
      .then(available => {
        if (!available) {
          if (!isDev()) {
            console.error(
              "gVisor (runsc) is not available and is required for production."
            )
            process.exit(1)
          } else {
            console.warn(
              "WARN: gVisor (runsc) is not available and will not be used for transpilation. This will break in production."
            )
          }
        }
        resolve(available)
      })
      .catch(error => {
        console.error("Error checking runsc availability:", error)
        process.exit(1)
      })
  })
}

function isDev() {
  return env.ENV === "development"
}

async function runscAvailable(): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const { stdout, stderr, exitCode } = await $`docker info`.quiet()
      if (exitCode !== 0) return reject(stderr)
      return resolve(stdout.includes("runsc"))
    } catch (error) {
      return reject(error)
    }
  })
}
