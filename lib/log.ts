/**
 * Structured JSON logs (spec §11 "Observabilité"): one line per event, easy to
 * ship to any log collector from `docker compose logs`.
 */
export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  console.info(JSON.stringify({ ts: new Date().toISOString(), level: "info", event, ...data }));
}

export function logError(event: string, error: unknown, data: Record<string, unknown> = {}): void {
  const err = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", event, ...data, error: err }));
}
