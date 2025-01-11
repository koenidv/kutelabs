import * as Sentry from "@sentry/bun"

Sentry.init({
  dsn: process.env["SENTRY_DSN"],
  tracesSampleRate: 1.0,
})

try {
  throw new Error('Sentry Bun test');
} catch (e) {
  Sentry.captureException(e);
}