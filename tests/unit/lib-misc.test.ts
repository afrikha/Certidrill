import { afterEach, describe, expect, it, vi } from "vitest";

const { sendMail, verify } = vi.hoisted(() => ({ sendMail: vi.fn(), verify: vi.fn() }));
vi.mock("nodemailer", () => ({ createTransport: vi.fn(() => ({ sendMail, verify })) }));

import { isSameOrigin } from "@/lib/security/csrf";
import { isAnswered, isComplete, type PublicBody } from "@/lib/questions/public";
import { logError, logEvent } from "@/lib/log";
import { createTransport } from "nodemailer";
import { accountExistsMessage, EMAIL_VERIFY_HOURS, MAGIC_LINK_MINUTES, magicLinkMessage, redactSmtp, sendAccountExistsEmail, sendMagicLink, sendTestEmail, sendVerificationEmail, smtpOptions, verificationMessage } from "@/lib/auth/email";
import { cn } from "@/lib/utils";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isSameOrigin (CSRF)", () => {
  const r = (headers: Record<string, string>) => new Request("http://app.local/api/x", { method: "POST", headers });
  it("accepts our origin, referer or forwarded host, refuses anything else", () => {
    expect(isSameOrigin(r({ origin: "http://app.local" }))).toBe(true);
    expect(isSameOrigin(r({ referer: "http://app.local/dashboard" }))).toBe(true);
    expect(isSameOrigin(r({ origin: "https://certidrill.com", "x-forwarded-host": "certidrill.com" }))).toBe(true);
    expect(isSameOrigin(r({ origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(r({ origin: "not a url" }))).toBe(false);
    expect(isSameOrigin(r({}))).toBe(false);
  });
});

describe("response completeness", () => {
  const choice = (id: string) => ({ id, html: id });
  const bodies: [PublicBody, unknown, unknown][] = [
    [{ type: "single", options: [choice("a")] }, { optionId: "a" }, {}],
    [{ type: "multi", options: [choice("a"), choice("b")], choose: 2 }, { optionIds: ["a", "b"] }, { optionIds: ["a"] }],
    [{ type: "yesno_statements", statements: [choice("s1"), choice("s2")] }, { values: { s1: true, s2: false } }, { values: { s1: true } }],
    [{ type: "dropdown", layout: "code", segments: [{ kind: "text", text: "x" }, { kind: "slot", id: "k", options: [choice("o")] }] }, { values: { k: "o" } }, { values: {} }],
    [{ type: "dragdrop", items: [choice("i")], targets: [choice("t1"), choice("t2")], reuse: true }, { mapping: { t1: "i", t2: "i" } }, { mapping: { t1: "i" } }],
    [{ type: "ordering", actions: [choice("a"), choice("b"), choice("c")], count: 2 }, { sequence: ["a", "b"] }, { sequence: ["a"] }],
    [{ type: "hotarea", prompts: [choice("p")], rows: [[{ area: "c1" }]] }, { values: { p: "c1" } }, { values: {} }],
    [{ type: "series_yesno", solutionHtml: "" }, { value: false }, { value: "no" }],
  ];
  it.each(bodies)("%#: complete vs incomplete", (body, complete, incomplete) => {
    expect(isComplete(body, complete)).toBe(true);
    expect(isComplete(body, incomplete)).toBe(false);
    expect(isComplete(body, null)).toBe(false);
    expect(isComplete(body, "x")).toBe(false);
  });
  it("isAnswered detects any given part", () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered({ optionIds: [] })).toBe(false);
    expect(isAnswered({ values: {} })).toBe(false);
    expect(isAnswered({ optionId: null })).toBe(false);
    expect(isAnswered({ values: { s1: false } })).toBe(true);
    expect(isAnswered({ value: false })).toBe(true);
    expect(isAnswered({ sequence: ["a"] })).toBe(true);
  });
});

describe("structured logs", () => {
  it("writes one JSON line per event outside tests, and errors always", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logEvent("quiet");
    expect(info).not.toHaveBeenCalled();
    vi.stubEnv("VITEST", "");
    vi.stubEnv("NODE_ENV", "production");
    logEvent("attempt.submitted", { id: "a1" });
    expect(JSON.parse(info.mock.calls[0]![0] as string)).toMatchObject({ level: "info", event: "attempt.submitted", id: "a1" });
    logError("boom", new Error("bad"), { url: "/x" });
    logError("boom", "plain");
    expect(JSON.parse(error.mock.calls[0]![0] as string)).toMatchObject({ level: "error", url: "/x", error: { message: "bad" } });
    expect(JSON.parse(error.mock.calls[1]![0] as string).error).toEqual({ message: "plain" });
  });
});

describe("sign-up e-mails", () => {
  const url = "https://certidrill.com/verify-email?token=abc&x=1";

  it("the verification link: what it does, how long it lasts, in the user's language", () => {
    const fr = verificationMessage({ url, locale: "fr" });
    expect(fr.subject).toBe("Confirmez votre adresse pour créer votre compte Certidrill");
    expect(fr.text.split("\n")).toEqual([
      "Merci de votre inscription à Certidrill. Cliquez sur le bouton ci-dessous, puis saisissez le mot de passe choisi à l'inscription : votre compte sera créé.",
      "",
      url,
      "",
      `Ce lien expire dans ${EMAIL_VERIFY_HOURS} heures et ne sert qu'une fois.`,
      "",
      "Si vous ne vous êtes pas inscrit, ignorez ce message : sans le mot de passe choisi à l'inscription, aucun compte ne peut être créé.",
    ]);
    expect(fr.html).toContain('<html lang="fr">');
    expect(fr.html).toContain('href="https://certidrill.com/verify-email?token=abc&amp;x=1"');
    expect(fr.html).toContain(">Confirmer mon adresse</a>");
    expect(verificationMessage({ url, locale: "de" }).subject).toBe("Confirm your address to create your Certidrill account");
  });

  it("the notice to an address that already has an account links to the sign-in page", () => {
    const en = accountExistsMessage({ url: "https://certidrill.com/login", locale: "en" });
    expect(en.subject).toBe("You already have a Certidrill account");
    expect(en.html).toContain('href="https://certidrill.com/login"');
    expect(en.text).toContain("your account has not changed");
  });

  it("are sent like magic links, and an SMTP failure never carries the credentials", async () => {
    vi.stubEnv("EMAIL_SERVER", "smtp://mailer:s3cret-pass@smtp.example.com:587");
    sendMail.mockClear();
    await sendVerificationEmail({ to: "a@example.com", url, locale: "fr" });
    await sendAccountExistsEmail({ to: "b@example.com", url: "https://certidrill.com/login" });
    expect(sendMail.mock.calls.map((c) => [c[0].to, c[0].subject])).toEqual([
      ["a@example.com", "Confirmez votre adresse pour créer votre compte Certidrill"],
      ["b@example.com", "You already have a Certidrill account"],
    ]);
    sendMail.mockRejectedValueOnce(new Error("535 auth failed for mailer / s3cret-pass"));
    await expect(sendVerificationEmail({ to: "a@example.com", url })).rejects.toThrow("535 auth failed for *** / ***");
    sendMail.mockRejectedValueOnce("socket hang up");
    await expect(sendAccountExistsEmail({ to: "a@example.com", url })).rejects.toThrow("socket hang up");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("AUTH_LOG_MAGIC_LINKS", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendVerificationEmail({ to: "a@example.com", url });
    expect(info).toHaveBeenCalledWith(`[auth] e-mail verification link for a@example.com: ${url}`);
  });
});

describe("magic link e-mail", () => {
  it("refuses to run without SMTP unless links may be logged", async () => {
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("AUTH_LOG_MAGIC_LINKS", "");
    await expect(sendMagicLink({ to: "a@example.com", url: "https://certidrill.com/x" })).rejects.toThrow(/EMAIL_SERVER/);
    vi.stubEnv("AUTH_LOG_MAGIC_LINKS", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendMagicLink({ to: "a@example.com", url: "https://certidrill.com/x" });
    expect(info).toHaveBeenCalledWith(expect.stringContaining("https://certidrill.com/x"));
  });
  it("sends the message through SMTP, in the user's language", async () => {
    vi.stubEnv("EMAIL_SERVER", "smtp://user:pass@smtp.example.com:587");
    vi.stubEnv("EMAIL_FROM", "Certidrill <noreply@example.com>");
    sendMail.mockClear();
    await sendMagicLink({ to: "a@example.com", url: "https://certidrill.com/api/auth/callback/email?token=t", locale: "fr" });
    const mail = sendMail.mock.calls[0]![0];
    expect(mail).toMatchObject({ to: "a@example.com", from: "Certidrill <noreply@example.com>", subject: "Votre lien de connexion Certidrill (certidrill.com)" });
    expect(mail.text).toContain("Cliquez sur le bouton");
    expect(mail.html).toContain('<html lang="fr">');
    // The transport gets the encrypted options, not the raw URL.
    expect(createTransport).toHaveBeenLastCalledWith(expect.objectContaining({ host: "smtp.example.com", port: 587, requireTLS: true, socketTimeout: 30_000 }));
    // Without a locale: English.
    await sendMagicLink({ to: "a@example.com", url: "https://certidrill.com/x" });
    expect(sendMail.mock.calls[1]![0].subject).toBe("Your Certidrill sign-in link (certidrill.com)");
  });

  it("builds a text and an HTML version, with the link escaped", () => {
    const url = "https://certidrill.com/api/auth/callback/email?token=t&email=a%40example.com";
    const en = magicLinkMessage({ url, locale: "en" });
    expect(en.text.split("\n")).toEqual([
      "Click the button below to sign in to Certidrill.",
      "",
      url,
      "",
      `This link expires in ${MAGIC_LINK_MINUTES} minutes and can only be used once.`,
      "",
      "If you did not request this e-mail, you can ignore it: nobody can sign in without this link.",
    ]);
    expect(en.html).toContain('href="https://certidrill.com/api/auth/callback/email?token=t&amp;email=a%40example.com"');
    expect(en.html).not.toContain("token=t&email");
    expect(en.html).toContain(">Sign in</a>");
    // An unknown locale falls back to English.
    expect(magicLinkMessage({ url, locale: "de" })).toEqual(en);
    expect(magicLinkMessage({ url: 'https://x.test/"><script>', locale: "fr" }).html).not.toContain("<script>");
  });

  it("checks the SMTP settings with a test e-mail", async () => {
    vi.stubEnv("EMAIL_SERVER", "");
    await expect(sendTestEmail({ to: "a@example.com" })).rejects.toThrow("EMAIL_SERVER is not configured");
    vi.stubEnv("EMAIL_SERVER", "smtps://apikey:s3cr%40t-key@smtp.example.com");
    // An empty EMAIL_FROM falls back to the default sender.
    vi.stubEnv("EMAIL_FROM", " ");
    sendMail.mockClear();
    sendMail.mockResolvedValueOnce({ messageId: "<m1@example.com>" });
    expect(await sendTestEmail({ to: "a@example.com", locale: "fr" })).toEqual({
      host: "smtp.example.com",
      port: 465,
      encryption: "tls",
      from: "Certidrill <no-reply@certidrill.com>",
      messageId: "<m1@example.com>",
    });
    expect(verify).toHaveBeenCalled();
    expect(sendMail.mock.calls[0]![0]).toMatchObject({ subject: "Certidrill — test SMTP", text: expect.stringContaining("smtp.example.com:465") });

    // A failure never shows the credentials, even when the server echoes them.
    verify.mockRejectedValueOnce(Object.assign(new Error("Invalid login: 535 user apikey with password s3cr@t-key refused"), { code: "EAUTH" }));
    await expect(sendTestEmail({ to: "a@example.com" })).rejects.toThrow("EAUTH: Invalid login: 535 user *** with password *** refused");
    verify.mockRejectedValueOnce("socket closed");
    await expect(sendTestEmail({ to: "a@example.com" })).rejects.toThrow("socket closed");
    vi.stubEnv("EMAIL_SERVER", "smtp://smtp.example.com");
    sendMail.mockResolvedValueOnce({});
    expect(await sendTestEmail({ to: "a@example.com" })).toMatchObject({ port: 587, encryption: "starttls", messageId: "" });
  });

  it("removes SMTP credentials from messages", () => {
    expect(redactSmtp("bad p%40ss and p@ss for login", "smtp://login:p%40ss@h")).toBe("bad *** and *** for ***");
    // The password is masked whatever its length; a user name under 3 characters is not.
    expect(redactSmtp("a b", "smtp://a:b@h")).toBe("a ***");
    // An invalid server leaves the message unchanged.
    expect(redactSmtp("unchanged", "not a url")).toBe("unchanged");
    // Base64 forms, as AUTH LOGIN and AUTH PLAIN send them.
    const b64 = (x: string) => Buffer.from(x).toString("base64");
    expect(redactSmtp(`334 ${b64("login")} ${b64("p@ss")} ${b64("\0login\0p@ss")}`, "smtp://login:p%40ss@h")).toBe("334 *** *** ***");
    // A password that is not URL-decodable is masked as written.
    expect(redactSmtp("got bad%zzpw", "smtp://login:bad%zzpw@h")).toBe("got ***");
  });

  it("always encrypts the SMTP connection", () => {
    expect(smtpOptions("smtp://user%40x:p%3Ass@smtp.example.com:2525")).toEqual({
      host: "smtp.example.com",
      port: 2525,
      secure: false,
      requireTLS: true,
      auth: { user: "user@x", pass: "p:ss" },
    });
    expect(smtpOptions("smtp://smtp.example.com")).toMatchObject({ port: 587, secure: false, requireTLS: true, auth: undefined });
    expect(smtpOptions("smtps://u:p@smtp.example.com")).toMatchObject({ port: 465, secure: true, requireTLS: true });
    expect(() => smtpOptions("http://smtp.example.com")).toThrow(/smtp:\/\//);
    expect(smtpOptions("smtp://[::1]:25").host).toBe("::1");
    expect(() => smtpOptions("smtp://u:p@smtp.example.com:465")).toThrow(/port 465 needs smtps/);
    expect(() => smtpOptions("smtp://u:p@smtp.example.com:587?ignoreTLS=true")).toThrow(/query parameters are not supported/);
    // "u:12#x@…" parses as host "u", port 12, fragment "#x@…": refused, not truncated.
    expect(() => smtpOptions("smtp://u:12#x@smtp.example.com")).toThrow(/%23 for #/);
    expect(() => smtpOptions("smtp://smtp.example.com:587/mail")).toThrow(/unexpected path/);
    expect(smtpOptions("smtp://u:12%23x@smtp.example.com:587/").auth).toEqual({ user: "u", pass: "12#x" });
    expect(smtpOptions("smtps://u:p@smtp.example.com:465")).toMatchObject({ port: 465, secure: true });
  });
  it("never puts the SMTP password in an error", () => {
    const failure = (server: string) => {
      try {
        smtpOptions(server);
      } catch (err) {
        return err as Error & { input?: unknown };
      }
      throw new Error("expected an error");
    };
    const badlyEncoded = failure("smtp://u:secret%zz@smtp.example.com");
    expect(badlyEncoded.message).toMatch(/not URL-encoded/);
    const invalid = failure("smtp//u:secret@smtp.example.com");
    expect(invalid.message).toBe("EMAIL_SERVER is not a valid URL");
    for (const err of [badlyEncoded, invalid]) {
      expect(err.input).toBeUndefined();
      expect(JSON.stringify({ ...err, message: err.message, stack: err.stack })).not.toContain("secret");
    }
  });
});

describe("cn", () => {
  it("merges Tailwind classes", () => {
    expect(cn("p-2", false && "x", "p-4")).toBe("p-4");
  });
});
