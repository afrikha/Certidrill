import { headers } from "next/headers";
import { clientIp } from "@/lib/security/rate-limit";

/** The visitor's address in a server action or route handler (see clientIp); "unknown" outside a request. */
export async function requestIp(): Promise<string> {
  try {
    return clientIp(await headers());
  } catch {
    return "unknown";
  }
}
