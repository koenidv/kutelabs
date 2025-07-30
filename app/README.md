# kutelabs app

Deploy: [![Netlify Status](https://api.netlify.com/api/v1/badges/10305205-1aca-4d18-89ea-d768c1f76315/deploy-status)](https://app.netlify.com/sites/kutelabs/deploys)
, Staging: [![Netlify Staging Status](https://api.netlify.com/api/v1/badges/10305205-1aca-4d18-89ea-d768c1f76315/deploy-status?branch=main)](https://app.netlify.com/sites/kutelabs/deploys)

This will be the frontend for users to complete challenges along the story.

```sh
bun run dev
```

(optionally generate astro types using `bunx astro sync`)

## Deployment

The web app is continuously deployed via Netlify on push to `release/app` and available at [kutelabs.koeni.dev](https://kutelabs.koeni.dev).
A staging environment for `main` is available at [main--kutelabs.netlify.app](https://main--kutelabs.netlify.app).

## Environment Variables

| Variable                        | Description                                          | Default                          |
| ------------------------------- | ---------------------------------------------------- | -------------------------------- |
| `PUBLIC_API_BASE_URL`           | API base url                                         | `https://api.kutelabs.koeni.dev` |
| `PUBLIC_POSTHOG_API_KEY`        | PostHog key                                          | _undefined_                      |
| `SENTRY_DSN`                    | Sentry DSN _cannot be specified using dotenv_        | _undefined_                      |
| `SENTRY_AUTH_TOKEN`             | Sentry Auth Token _cannot be specified using dotenv_ | _undefined_                      |
| `PUBLIC_CLERK_PUBLISHABLE_KEY`  | Clerk public key for authentication.                 | _undefined_                      |
| `CLERK_SECRET_KEY`              | Clerk secret key for authentication.                 | _undefined_                      |
| `PUBLIC_TRANSPILE_REQUIRE_AUTH` | Require Clerk auth for transpilation on server       | `true`                           |

## Challenge Execution

Once the user finishes configuring blocks or writing code, the provided code will be transpiled, if necessary, and run. Each challenge includes a set of tests that the code will be tested against to determine if the challenge was completed.

If the challenge submission contains _any_ user-generated code, it will be treated or compiled to as Kotlin code, transpiled to JavaScript, and executed.
If it contains _no_ user-generated code, it will be compiled to JavaScript and executed.
Read about [execution security](#security) below.

## Observability

The web app is instrumented with PostHog for user analytics and Sentry for error tracking.

## Authentication

Authentication is handled by Clerk. Signing in is only required for challenges that include user-generated Kotlin code, progress is also stored locally and synced to the server once the user signs in.

## Security

User-generated code is executed in a worker thread using a Web Worker. This thread is isolated from the main thread and has no access to the DOM or other resources. The user code is further limited by only passing the absolute necessary data and uses messages to call functions outside the worker.This thread is terminated after the execution is complete.

SSL termination is handled by Netlify, which also adds security-relevant headers and prevents the classic web attacks.
