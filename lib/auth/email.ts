import { createTranslator } from "next-intl";
import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/** Lifetime of a magic link (Auth.js email provider maxAge), in minutes. */
export const MAGIC_LINK_MINUTES = 15;
const DEFAULT_FROM = "Certidrill <no-reply@certidrill.com>";
const MESSAGES = { en, fr } as const;

/** Sender (EMAIL_FROM); an empty value falls back to the default. */
function sender(): string {
  const from = process.env.EMAIL_FROM?.trim();
  return from ? from : DEFAULT_FROM;
}

/**
 * SMTP options from EMAIL_SERVER (smtp://user:pass@host:587 or smtps://…:465).
 * The connection is always encrypted: implicit TLS for smtps://, and STARTTLS
 * required for smtp:// — a magic link is a credential and is never sent in
 * clear text, even if the server does not offer STARTTLS.
 */
export function smtpOptions(server: string): SMTPTransport.Options & { host: string; port: number; secure: boolean } {
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

function translator(locale: string) {
  const l: Locale = isLocale(locale) ? locale : defaultLocale;
  return createTranslator({ locale: l, messages: MESSAGES[l], namespace: "email" });
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);

export interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

/** The magic link e-mail, in the user's language: plain text and a simple HTML version. */
export function magicLinkMessage({ url, locale }: { url: string; locale: string }): EmailMessage {
  const t = translator(locale);
  const { host } = new URL(url);
  const minutes = MAGIC_LINK_MINUTES;
  const lang = isLocale(locale) ? locale : defaultLocale;
  const link = escapeHtml(url);
  const muted = "margin:16px 0 0;font-size:13px;line-height:1.5;color:#555";
  const html = [
    "<!doctype html>",
    `<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(t("subject", { host }))}</title></head>`,
    '<body style="margin:0;padding:24px 12px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">',
    // Preview text shown by mail clients next to the subject; hidden in the body.
    `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(t("preheader", { minutes }))}</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px">',
    "<tr><td>",
    '<p style="margin:0 0 24px;font-size:20px;font-weight:700">Certidrill</p>',
    `<p style="margin:0 0 24px;font-size:16px;line-height:1.5">${escapeHtml(t("intro"))}</p>`,
    `<p style="margin:0"><a href="${link}" style="display:inline-block;padding:12px 24px;background:#0f6cbd;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">${escapeHtml(t("button"))}</a></p>`,
    `<p style="${muted}">${escapeHtml(t("expires", { minutes }))}</p>`,
    `<p style="${muted}">${escapeHtml(t("fallback"))}<br><a href="${link}" style="color:#0f6cbd;word-break:break-all">${link}</a></p>`,
    `<p style="${muted}">${escapeHtml(t("ignore"))}</p>`,
    "</td></tr></table>",
    "</td></tr></table>",
    "</body></html>",
  ].join("\n");
  return {
    subject: t("subject", { host }),
    text: [t("intro"), "", url, "", t("expires", { minutes }), "", t("ignore")].join("\n"),
    html,
  };
}

/**
 * Sends the magic link by SMTP (EMAIL_SERVER), in the user's language. Without
 * SMTP, the link is only written to the server log when AUTH_LOG_MAGIC_LINKS=true
 * (development, or a personal instance whose administrator reads the logs).
 */
export async function sendMagicLink({ to, url, locale = defaultLocale }: { to: string; url: string; locale?: string }): Promise<void> {
  const server = process.env.EMAIL_SERVER;
  if (!server) {
    if (process.env.AUTH_LOG_MAGIC_LINKS !== "true") throw new Error("EMAIL_SERVER is not configured");
    console.info(`[auth] magic link for ${to}: ${url}`);
    return;
  }
  await transportFor(server).sendMail({ to, from: sender(), ...magicLinkMessage({ url, locale }) });
}

function transportFor(server: string) {
  const { host, port, secure, auth } = smtpOptions(server);
  // Spelled out so that static analysis sees the TLS settings at the call.
  // Bounded waits (nodemailer waits up to 10 minutes on a silent socket): a
  // stuck SMTP server fails the sign-in request or the check quickly.
  return createTransport({ host, port, secure, requireTLS: true, auth, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 30_000 });
}

/** Removes the SMTP user name and password from a message (they may appear in a server reply). */
export function redactSmtp(message: string, server: string): string {
  let url: URL;
  try {
    url = new URL(server);
  } catch {
    return message;
  }
  const secrets = new Set<string>();
  for (const [raw, min] of [[url.password, 1], [url.username, 3]] as const) {
    // The password is always masked; a very short user name would mask ordinary words.
    if (raw.length < min) continue;
    secrets.add(raw);
    try {
      secrets.add(decodeURIComponent(raw));
    } catch {
      // Not decodable: the raw form is enough.
    }
  }
  let out = message;
  // Longest first, so that a secret containing another one is removed whole.
  for (const s of [...secrets].sort((a, b) => b.length - a.length)) out = out.split(s).join("***");
  return out;
}

export interface SmtpCheck {
  host: string;
  port: number;
  /** "tls": implicit TLS (smtps://); "starttls": upgraded on connection. */
  encryption: "tls" | "starttls";
  from: string;
  messageId: string;
}

/**
 * Checks the SMTP settings: connects, authenticates, then sends a test e-mail
 * to `to`. Errors never contain the SMTP credentials.
 */
export async function sendTestEmail({ to, locale = defaultLocale }: { to: string; locale?: string }): Promise<SmtpCheck> {
  const server = process.env.EMAIL_SERVER;
  if (!server) throw new Error("EMAIL_SERVER is not configured");
  const { host, port, secure } = smtpOptions(server);
  const from = sender();
  const t = translator(locale);
  try {
    const transport = transportFor(server);
    await transport.verify();
    const info = await transport.sendMail({ to, from, subject: t("testSubject"), text: t("testBody", { server: `${host}:${port}` }) });
    return { host, port, encryption: secure ? "tls" : "starttls", from, messageId: String(info.messageId ?? "") };
  } catch (err) {
    // nodemailer codes (EAUTH, ECONNECTION, ETIMEDOUT…) say which step failed.
    const code = (err as { code?: unknown } | null)?.code;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(redactSmtp(typeof code === "string" ? `${code}: ${message}` : message, server));
  }
}
