# kutelabs server

This will be the backend for transpilation, authentication, and user progress persistency.

```sh
bun run dev
```

## Deployment

GitHub Actions builds and pushes the server image on push to `release/server`.

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

```sh
docker run -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v data:/data -e TRANSPILER_NAME=kutelabs-transpiler kutelabs-server:latest
```

or use the provided compose file.

## Env

| Variable           | Description                                                                 | Default               |
| ------------------ | --------------------------------------------------------------------------- | --------------------- |
| `TRANSPILER_NAME`  | Name of the transpiler image to use. Do not include a tag, will use latest. | `kutelabs-transpiler` |
| `DATA_VOLUME_NAME` | Name of the volume used for shared data between server and transpiler.      | `kutelabs-data`       |
| `DATA_DIR`         | Temp/cache data mount.                                                      | `/data`               |
| `PORT`             | The port to listen on.                                                      | `3000`                |
| `ENV`              | Environment hint: `development` or `production`.                            | `undefined`           |
