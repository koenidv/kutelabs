# kutelabs

scratch from scratch; a cute way to learn kotlin.

kutelabs will be a learning platform for children to learn Kotlin.

The user will be led on a learning journey that starts by introducing basic concepts with visual blocks. After completing these introduction challenges the blocks start to turn into regular code, one by one, to teach Kotlin syntax, un til eventually the challenges consist of writing custom Kotlin scripts.
The project's focus will lie on the blocks/mixed content editor, which will be implemented as a framework-agnostic web component. A secondary focus will be transpiling and executing the user~created code in a safe environment.

## Dockerizing

You will need to enable containerd to build multiplatform images ([Docker Engine](https://docs.docker.com/engine/storage/containerd/), [Docker Desktop](https://docs.docker.com/desktop/containerd/)).

### 1. Build Isolation Image for Transpilation

From the repository root, run:

```sh
docker build --platform linux/amd64,linux/arm64 server/isolated -f server/isolated/transpiler.dockerfile -t kutelabs-transpiler
```

### 2. Build Server Image

Again from the repository root:

```sh
docker build --platform linux/amd64,linux/arm64 . -f server/Dockerfile -t kutelabs-server
```

### 3. Run Server

Please ensure that [gVisor is installed](https://gvisor.dev/docs/user_guide/install/) on the host machine.
The transpiler image must be available before running the server, but you can [specify the image name](/server/README.md#env) in an environment variable.

```sh
docker run -v /var/run/docker.sock:/var/run/docker.sock -v data:/data -e TRANSPILER_NAME=kutelabs-transpiler kutelabs-server:latest
```
