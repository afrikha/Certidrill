import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * SMTP options from EMAIL_SERVER (smtp://user:pass@host:587 or smtps://…:465).
 * The connection is always encrypted: implicit TLS for smtps://, and STARTTLS
 * required for smtp:// — a magic link is a credential and is never sent in
 * clear text, even if the server does not offer STARTTLS.
 */
export function smtpOptions(server: string): SMTPTransport.Options {
  let url: URL;
  try {
    url = new URL(server);
  } catch {
    // The TypeError of new URL() carries the input (password included) in error.input.
    throw new Error("EMAIL_SERVER is not a valid URL");
  }
  if (url.protocol !== "smtp:" && url.protocol !== "smtps:") throw new Error("EMAIL_SERVER must be an smtp:// or smtps:// URL");
  // nodemailer used to read options from the query string (?pool=true,
  // ?ignoreTLS=true…). They are refused rather than silently ignored.
  if (url.search) throw new Error("EMAIL_SERVER: query parameters are not supported");
  // An unencoded # in the password starts a fragment: the rest would be lost silently.
  if (url.hash || (url.pathname !== "" && url.pathname !== "/")) {
    throw new Error("EMAIL_SERVER: unexpected path or # (write %23 for # in the password)");
  }
  const secure = url.protocol === "smtps:";
  const defaultPort = secure ? 465 : 587;
  // Port 465 is implicit TLS: smtp:// would wait for a STARTTLS that never comes
  // (nodemailer never inferred TLS from the port for smtp:// URLs either).
  if (!secure && url.port === "465") throw new Error("EMAIL_SERVER: port 465 needs smtps:// (implicit TLS)");
  return {
    // An IPv6 literal keeps its brackets in URL.hostname ("[::1]").
    host: url.hostname.replace(/^\[(.*)\]$/, "$1"),
    port: url.port ? Number(url.port) : defaultPort,
    secure,
    requireTLS: true,
    auth: url.username ? { user: decodeCredential(url.username), pass: decodeCredential(url.password) } : undefined,
  };
}

function decodeCredential(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // Never echo the value: it is a password.
    throw new Error("EMAIL_SERVER: the user name or password is not URL-encoded (write %25 for %, %40 for @)");
  }
}

/**
 * Sends the magic link by SMTP (EMAIL_SERVER). Without SMTP, the link is only
 * written to the server log when AUTH_LOG_MAGIC_LINKS=true (development, or a
 * personal instance whose administrator reads the logs).
 */
export async function sendMagicLink({ to, url }: { to: string; url: string }): Promise<void> {
  const server = process.env.EMAIL_SERVER;
  if (!server) {
    if (process.env.AUTH_LOG_MAGIC_LINKS !== "true") throw new Error("EMAIL_SERVER is not configured");
    console.info(`[auth] magic link for ${to}: ${url}`);
    return;
  }
  const { host } = new URL(url);
  const { host: smtpHost, port, secure, auth } = smtpOptions(server);
  // Spelled out so that static analysis sees the TLS settings at the call.
  const transport = createTransport({ host: smtpHost, port, secure, requireTLS: true, auth });
  await transport.sendMail({
    to,
    from: process.env.EMAIL_FROM ?? "Certidrill <no-reply@certidrill.com>",
    subject: `Certidrill — sign-in link / lien de connexion (${host})`,
    text: [
      "Use this link to sign in to Certidrill. It expires in 15 minutes.",
      "Utilisez ce lien pour vous connecter à Certidrill. Il expire dans 15 minutes.",
      "",
      url,
      "",
      "If you did not request it, ignore this e-mail. / Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    ].join("\n"),
  });
}
