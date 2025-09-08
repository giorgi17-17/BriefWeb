// lib/posthog.js
import { PostHog } from "posthog-node";

const POSTHOG_KEY  = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://eu.i.posthog.com";

let ph = null;
if (POSTHOG_KEY) {
  ph = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 1000,
  });
  console.log("[posthog] enabled");
} else {
  console.log("[posthog] disabled (no POSTHOG_KEY)");
}

// Safe capture (no-op if disabled)
export function phCapture(distinctId, event, properties = {}, groups) {
  if (!ph) return;
  ph.capture({
    distinctId: String(distinctId || "anonymous"),
    event,
    properties,
    groups,
    timestamp: new Date(),
  });
}

// Ensure buffers are flushed on shutdown
export async function phShutdown() {
  if (!ph) return;
  try {
    await ph.flushAsync();
    await ph.shutdownAsync?.();
  } catch {}
}

// Utility: measure duration (ms) from a bigint t0
export function durationMsFrom(t0) {
  const ns = process.hrtime.bigint() - t0;
  return Number(ns) / 1e6;
}

// Optional: attach graceful shutdown once in your bootstrap
export function attachPosthogLifecycle() {
  const wrap = (sig) => async () => {
    await phShutdown();
    process.exit(sig === "SIGINT" ? 130 : 143);
  };
  process.on("SIGTERM", wrap("SIGTERM"));
  process.on("SIGINT", wrap("SIGINT"));
}
