/**
 * Checks the SMTP settings (EMAIL_SERVER, EMAIL_FROM): connects, authenticates
 * and sends a test e-mail. The SMTP password is never printed (nor the user
 * name, from 3 characters).
 *   npm run email:test -- --to me@example.com [--locale fr]
 * In production (Docker): docker compose run --rm migrate npm run email:test -- --to me@example.com
 */
import { parseArgs } from "node:util";
import { sendTestEmail } from "../lib/auth/email";

async function main() {
  const { values } = parseArgs({ options: { to: { type: "string" }, locale: { type: "string" } } });
  if (!values.to) throw new Error("--to is required");
  const check = await sendTestEmail({ to: values.to, locale: values.locale });
  const encryption = check.encryption === "tls" ? "TLS" : "STARTTLS";
  const id = check.messageId ? ` (${check.messageId})` : "";
  console.log(`✔ SMTP ${check.host}:${check.port} (${encryption}) — test e-mail sent from ${check.from} to ${values.to}${id}`);
  console.log("  Check the inbox (and the spam folder), and that SPF, DKIM and DMARC pass in the message headers.");
}

try {
  await main();
} catch (err) {
  console.error(`✘ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
