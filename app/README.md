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

| Variable            | Description                                          | Default                          |
| ------------------- | ---------------------------------------------------- | -------------------------------- |
| `API_BASE_URL`      | API base url                                         | `https://api.kutelabs.koeni.dev` |
| `POSTHOG_API_KEY`   | PostHog key                                          | _undefined_                      |
| `SENTRY_DSN`        | Sentry DSN _cannot be specified using dotenv_        | _undefined_                      |
| `SENTRY_AUTH_TOKEN` | Sentry Auth Token _cannot be specified using dotenv_ | _undefined_                      |

## Observability

The web app is instrumented with PostHog for user analytics and Sentry for error tracking.
