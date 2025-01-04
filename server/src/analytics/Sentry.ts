import * as Sentry from "@sentry/bun"

Sentry.init({
  dsn: "https://4c4a7d2025b8dac3716891a06b09b847@o4506236025634817.ingest.us.sentry.io/4508586416144384",
  tracesSampleRate: 1.0,
})

try {
  throw new Error('Sentry Bun test');
} catch (e) {
  Sentry.captureException(e);
}