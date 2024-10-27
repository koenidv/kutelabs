# kutelabs Server

This will be the backend for transpilation, authentication, and user progress persistency.

## Running

To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```
open http://localhost:3000

## Building

For building the server image, please refer to the [Dockerizing](/README.md#dockerizing) section in the root README.

## Env

| Variable | Description | Default |
| --- | --- | --- |
| `TRANSPILER_NAME` | Name of the transpiler image to use. Do not include a tag. | `kutelabs-transpiler` |
| `DATA_DIR` | Temp/cache data mount. | `/data` |
| `PORT` | The port to listen on. | `3000` |
| `ENVIRONMENT` | Environment hint: `development` or `production`. |`undefined` |
