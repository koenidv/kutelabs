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

| Variable          | Description  | Default                          |
| ----------------- | ------------ | -------------------------------- |
| `API_BASE_URL`    | API base url | `https://api.kutelabs.koeni.dev` |
| `POSTHOG_API_KEY` | PostHog key  | _undefined_                      |
