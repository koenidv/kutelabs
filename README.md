# kutelabs

Visit the deployed app at [kutelabs.koeni.dev](https://kutelabs.koeni.dev).

## About the Project

scratch from scratch. a cute way to learn kotlin.

kutelabs will be a learning platform for children to learn Kotlin.

The user will be led on a learning journey that starts by introducing basic concepts with visual blocks. After completing these introduction challenges the blocks start to turn into regular code, one by one, to teach Kotlin syntax, un til eventually the challenges consist of writing custom Kotlin scripts.
The project's focus will lie on the blocks/mixed content editor, which will be implemented as a framework-agnostic web component. A secondary focus will be transpiling and executing the user~created code in a safe environment.

## Build & Run

Run `bun install` to install dependencies, then refer to the package readmes:

- [app](app/README.md) / `bun run dev`
- [server](server/README.md) / `bun run dev`
- [editor-mixed](editor-mixed/README.md)

## Project Structure

![Project Structure](./docs/project_structure.drawio.svg)

Additionally to kutelab components mentioned above, the project relies on:

- [Netlify](https://www.netlify.com/) to build & serve the app
- [Clerk](https://clerk.dev/) for user management

## Workspace Structure

![Workspace Structure](./docs/workspace_structure.drawio.svg)

## Branching Strategy

kutelabs uses a simple git flow branching strategy, though as a solo developer, feature branches were only used for isolation and the main branch was used for development.

To deploy, changes are merge squashed into `release/app` and `release/server`.
