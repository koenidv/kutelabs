# kutelabs server

This is the backend for transpilation and user progress persistence.

```sh
bun run dev
```

The images are built for amd64 and arm64 and available on as [koenidv/kutelabs-server](https://hub.docker.com/r/koenidv/kutelabs-server) and [koenidv/kutelabs-transpiler](https://hub.docker.com/r/koenidv/kutelabs-transpiler) on Docker Hub.

## Deployment

GitHub Actions builds and pushes the server image on push to `release/server`.

![ci visualization](../docs/server_cd.drawio.svg)

## Build & Run

You will need to enable containerd to build multiplatform images ([Docker Engine](https://docs.docker.com/engine/storage/containerd/), [Docker Desktop](https://docs.docker.com/desktop/containerd/)).

### 1. Build Isolation Image for Transpilation

From the repository root, run:

```sh
docker build --platform linux/amd64,linux/arm64 server/isolated -f server/isolated/transpiler.dockerfile -t kutelabs-transpiler
```

### 2. Build Server Image

Again from the repository root (build requires the shared package):

```sh
docker build --platform linux/amd64,linux/arm64 . -f server/Dockerfile -t kutelabs-server
```

### 3. Run Server

Docker 26+ is required to run the server. On older versions, transpilation will fail with useless error messages.
Please ensure that [gVisor is installed](https://gvisor.dev/docs/user_guide/install/) on the host machine. Alternatively, set `ENV` to `development` to disable the sandbox.
The transpiler image must be available before running the server. You can [specify the image name](#env) in an environment variable.
You will also need to provide a postgres instance for user data persistence.

```sh
docker run -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v data:/data -e TRANSPILER_NAME=kutelabs-transpiler kutelabs-server:latest
```

or use the provided compose file.

## Env

| Variable                  | Description                                                                          | Default                      |
| ------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- |
| `DATA_VOLUME_NAME`        | Name of the volume used for shared data between server and transpiler.               | _undefined_                  |
| `DATA_DIR`                | Absolute path instead of docker volume. Will be used if `DATA_VOLUME NAME` is unset. | `$(pwd)/data`                |
| `PORT`                    | The port to listen on.                                                               | `3000`                       |
| `ENV`                     | Environment hint: `development` or `production`.                                     | _undefined_                  |
| `APP_ORIGIN`              | Origin of the app for CORS and CSRF.                                                 | `https://kutelabs.koeni.dev` |
| `TRANSPILATION_BACKEND`   | Use kute server or Kotlin playground (KUTE \| PLAYGROUND)                            | KUTE                         |
| `TRANSPILE_REQUIRE_AUTH`  | Require Clerk authentication for transpilation requests.                             | `true`                       |
| `TRANSPILER_NAME`         | Name of the transpiler image to use. Do not include a tag, will use latest.          | `kutelabs-transpiler`        |
| `TRANSPILER_MEMORY`       | Memory limit for the transpiler container.                                           | `768m`                       |
| `TRANSPILER_MEMORY_SWAP`  | Memory swap limit for the transpiler container.                                      | `768m`                       |
| `TRANSPILER_CPU`          | CPU limit for the transpiler container.                                              | _undefined_                  |
| `TRANSPILER_TIMEOUT`      | Timeout for transpilation in milliseconds.                                           | `60000`                      |
| `TRANSPILER_GVISOR`       | Enable gVisor sandbox for transpiler.                                                | `true`                       |
| `CACHE_ENABLED`           | Enable caching of transpiled code.                                                   | `true`                       |
| `POSTHOG_API_KEY`         | PostHog API key for analytics.                                                       | _undefined_                  |
| `POSTHOG_HOST`            | PostHog host URL.                                                                    | `https://eu.i.posthog.com`   |
| `POSTHOG_IDENTIFIER`      | Server identifier for PostHog.                                                       | `local`                      |
| `SENTRY_DSN`              | Sentry DSN for error tracking.                                                       | _undefined_                  |
| `DB_HOST`                 | Postgres host.                                                                       | `localhost`                  |
| `DB_PORT`                 | Postgres port.                                                                       | `5432`                       |
| `DB_USER`                 | Postgres user.                                                                       | `kutelabs`                   |
| `DB_PASSWORD`             | Postgres password.                                                                   | `kutelabs`                   |
| `DB_NAME`                 | Postgres database.                                                                   | `kutelabs`                   |
| `DB_SSL`                  | Wether to use SSL for db connection                                                  | `false`                      |
| `CLERK_PUBLISHABLE_KEY`   | Clerk publishable key for authentication.                                            | _undefined_                  |
| `CLERK_SECRET_KEY`        | Clerk secret key for authentication.                                                 | _undefined_                  |

## Tests

The server is tested with bun's test runner. Run the tests with:

```sh
bun test
```

## Security

The transpilation step is run in a gVisor-run docker container without network and limited resource access to prevent malicious code from being run. gVisor does not completly isolate the container, but considering that the code is not being executed, this should be sufficient.

## Observability

The server captures transpilation events in PostHog to track usage, performance, and correlate this with app behavior. Errors are reported to Sentry for debugging.

## Authorization

Authentication is handled by Clerk. The default authorization scope is required for transpilation and reading/updating user data.

## Validation

Due to a bug in bun with blobs. Once this is fixed, including @hono/zod-validator will simplify validation.

## tRPC

I planned to migrate to tRPC at some point, for a self-documenting API, hono makes this very easy. It's not implemented yet.
