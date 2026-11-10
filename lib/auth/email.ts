import { createTransport } from "nodemailer";

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
  const transport = createTransport(server);
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
