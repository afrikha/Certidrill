import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { isSameOrigin } from "@/lib/security/csrf";
import { SessionError } from "@/lib/exam/session";
import { logError } from "@/lib/log";

export type ApiUser = { id: string; role: "user" | "admin"; locale: string };

/**
 * Wraps an API route handler: authentication, same-origin check on mutating
 * methods, and uniform JSON errors ({ error: code }).
 */
export function apiRoute<P>(handler: (ctx: { request: Request; user: ApiUser; params: P }) => Promise<unknown>) {
  return async (request: Request, context: { params: Promise<P> }) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
        return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
      }
      const session = await auth();
      if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      const result = await handler({ request, user: session.user as ApiUser, params: await context.params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      if (err instanceof SessionError) return NextResponse.json({ error: err.code }, { status: err.status });
      if (err instanceof ZodError) return NextResponse.json({ error: "invalid_request", issues: err.issues.map((i) => i.message) }, { status: 400 });
      if (err instanceof SyntaxError) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      if (err instanceof PayloadTooLargeError) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
      logError("api.error", err, { url: request.url, method: request.method });
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
  };
}

/** Largest JSON body accepted by the API (a response or a report is a few KB). */
export const MAX_BODY_BYTES = 64 * 1024;

export class PayloadTooLargeError extends Error {}

export async function jsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new PayloadTooLargeError();
  const text = await readText(request, MAX_BODY_BYTES);
  return text ? JSON.parse(text) : {};
}

/**
 * Reads the body as text, giving up as soon as it exceeds `limit` bytes. The
 * Content-Length check above only covers honest clients: a chunked body has
 * none, and would otherwise be read in full before being measured.
 */
async function readText(request: Request, limit: number): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    text += decoder.decode(value, { stream: true });
  }
}
