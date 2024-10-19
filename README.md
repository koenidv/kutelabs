# kutelabs

scratch from scratch; a cute way to learn kotlin.

kutelabs will be a learning platform for children to learn Kotlin.

The user will be led on a learning journey that starts by introducing basic concepts with visual blocks. After completing these introduction challenges the blocks start to turn into regular code, one by one, to teach Kotlin syntax, un til eventually the challenges consist of writing custom Kotlin scripts.
The project's focus will lie on the blocks/mixed content editor, which will be implemented as a framework-agnostic web component. A secondary focus will be transpiling and executing the user~created code in a safe environment.

## Dockerizing

### Isolation Image for Transpilation

`docker build server/isolated -t transpiler:latest -f server/isolated/transpiler.dockerfile`

### Server

`docker build . -t kutelabs-server:latest -f server/Dockerfile`
`docker run -v /var/run/docker.sock:/var/run/docker.sock -v data:/data kutelabs-server:latest`
