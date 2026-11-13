import { createTranslator } from "next-intl";
import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/** Lifetime of a magic link (Auth.js email provider maxAge), in minutes. */
export const MAGIC_LINK_MINUTES = 15;
/** Lifetime of the link that confirms a sign-up (lib/auth/signup.ts), in hours. */
export const EMAIL_VERIFY_HOURS = 24;
const DEFAULT_FROM = "Certidrill <no-reply@certidrill.com>";
const MESSAGES = { en, fr } as const;

/** Sender (EMAIL_FROM); an empty value falls back to the default. */
function sender(): string {
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  return from === "" ? DEFAULT_FROM : from;
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

interface Layout {
  locale: string;
  subject: string;
  preheader: string;
  intro: string;
  button: { label: string; url: string };
  /** Short paragraphs under the button (expiry, what to do if unexpected). */
  notes: string[];
  fallback: string;
}

/** Plain text and simple HTML (inline styles, as mail clients need) around one call to action. */
function render({ locale, subject, preheader, intro, button, notes, fallback }: Layout): EmailMessage {
  const lang = isLocale(locale) ? locale : defaultLocale;
  const link = escapeHtml(button.url);
  const muted = "margin:16px 0 0;font-size:13px;line-height:1.5;color:#555";
  const [first, ...rest] = notes;
  const html = [
    "<!doctype html>",
    `<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>`,
    '<body style="margin:0;padding:24px 12px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">',
    // Preview text shown by mail clients next to the subject; hidden in the body.
    `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px">',
    "<tr><td>",
    '<p style="margin:0 0 24px;font-size:20px;font-weight:700">Certidrill</p>',
    `<p style="margin:0 0 24px;font-size:16px;line-height:1.5">${escapeHtml(intro)}</p>`,
    `<p style="margin:0"><a href="${link}" style="display:inline-block;padding:12px 24px;background:#0f6cbd;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">${escapeHtml(button.label)}</a></p>`,
    ...(first ? [`<p style="${muted}">${escapeHtml(first)}</p>`] : []),
    `<p style="${muted}">${escapeHtml(fallback)}<br><a href="${link}" style="color:#0f6cbd;word-break:break-all">${link}</a></p>`,
    ...rest.map((n) => `<p style="${muted}">${escapeHtml(n)}</p>`),
    "</td></tr></table>",
    "</td></tr></table>",
    "</body></html>",
  ].join("\n");
  return { subject, text: [intro, "", button.url, ...notes.flatMap((n) => ["", n])].join("\n"), html };
}

/** The magic link e-mail, in the user's language: plain text and a simple HTML version. */
export function magicLinkMessage({ url, locale }: { url: string; locale: string }): EmailMessage {
  const t = translator(locale);
  const { host } = new URL(url);
  const minutes = MAGIC_LINK_MINUTES;
  return render({
    locale,
    subject: t("subject", { host }),
    preheader: t("preheader", { minutes }),
    intro: t("intro"),
    button: { label: t("button"), url },
    notes: [t("expires", { minutes }), t("ignore")],
    fallback: t("fallback"),
  });
}

/** Sent after a sign-up: the link that verifies the address (lib/auth/signup.ts). */
export function verificationMessage({ url, locale }: { url: string; locale: string }): EmailMessage {
  const t = translator(locale);
  const hours = EMAIL_VERIFY_HOURS;
  return render({
    locale,
    subject: t("verifySubject"),
    preheader: t("verifyPreheader", { hours }),
    intro: t("verifyIntro"),
    button: { label: t("verifyButton"), url },
    notes: [t("verifyExpires", { hours }), t("verifyIgnore")],
    fallback: t("fallback"),
  });
}

/**
 * Sent instead of a verification link when someone signs up with an address
 * that already has an account: the sign-up page answers the same either way,
 * so it does not reveal which addresses are registered.
 */
export function accountExistsMessage({ url, locale }: { url: string; locale: string }): EmailMessage {
  const t = translator(locale);
  return render({
    locale,
    subject: t("existsSubject"),
    preheader: t("existsIntro"),
    intro: t("existsIntro"),
    button: { label: t("existsButton"), url },
    notes: [t("existsIgnore")],
    fallback: t("fallback"),
  });
}

/**
 * Sends a message by SMTP (EMAIL_SERVER). Without SMTP, the link is only
 * written to the server log when AUTH_LOG_MAGIC_LINKS=true (development, or a
 * personal instance whose administrator reads the logs).
 */
async function send({ to, message, link, kind }: { to: string; message: EmailMessage; link: string; kind: string }): Promise<void> {
  const server = process.env.EMAIL_SERVER;
  if (!server) {
    if (process.env.AUTH_LOG_MAGIC_LINKS !== "true") throw new Error("EMAIL_SERVER is not configured");
    console.info(`[auth] ${kind} for ${to}: ${link}`);
    return;
  }
  try {
    await transportFor(server).sendMail({ to, from: sender(), ...message });
  } catch (err) {
    // The error is logged by the caller: never with the SMTP credentials.
    throw new Error(redactSmtp(err instanceof Error ? err.message : String(err), server));
  }
}

/** Sends the magic link, in the user's language. */
export function sendMagicLink({ to, url, locale = defaultLocale }: { to: string; url: string; locale?: string }): Promise<void> {
  return send({ to, message: magicLinkMessage({ url, locale }), link: url, kind: "magic link" });
}

export function sendVerificationEmail({ to, url, locale = defaultLocale }: { to: string; url: string; locale?: string }): Promise<void> {
  return send({ to, message: verificationMessage({ url, locale }), link: url, kind: "e-mail verification link" });
}

export function sendAccountExistsEmail({ to, url, locale = defaultLocale }: { to: string; url: string; locale?: string }): Promise<void> {
  return send({ to, message: accountExistsMessage({ url, locale }), link: url, kind: "account exists notice" });
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
  const decode = (raw: string) => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw; // Not decodable: the raw form is what would be sent.
    }
  };
  const user = decode(url.username);
  const pass = decode(url.password);
  const base64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
  const secrets = new Set<string>();
  // The password is always masked; a user name under 3 characters would mask ordinary words.
  for (const [raw, value, min] of [[url.password, pass, 1], [url.username, user, 3]] as const) {
    if (value.length < min) continue;
    // As written in EMAIL_SERVER, decoded, and base64 (AUTH LOGIN sends each one so).
    secrets.add(raw).add(value).add(base64(value));
  }
  // AUTH PLAIN sends "\0user\0password" in base64.
  if (pass) secrets.add(base64(`\0${user}\0${pass}`));
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
 * to `to`. Errors never contain the SMTP password, nor a user name of 3
 * characters or more (as written, decoded or base64).
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
