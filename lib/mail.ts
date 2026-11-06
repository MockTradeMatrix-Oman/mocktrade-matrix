/**
 * Transactional email for guardian consent.
 *
 * Three transports, picked automatically:
 *   1. BREVO_API_KEY   — HTTPS API, works on hosts that block SMTP (Render free).
 *   2. RESEND_API_KEY  — HTTPS API, needs a verified sending domain.
 *   3. SMTP_*          — Gmail app password or any SMTP relay, for local/paid hosts.
 *
 * When nothing is configured the caller still gets the consent link and the UI
 * falls back to copy/share. Set MAIL_TRANSPORT=json to render without sending.
 */

import nodemailer, { type Transporter } from "nodemailer";

export type MailResult = {
  sent: boolean;
  skipped: boolean;
  error?: string;
  preview?: string;
};

const FROM = process.env.MAIL_FROM || "MockTrade Matrix <mocktradematrix@gmail.com>";
const REPLY_TO = process.env.MAIL_REPLY_TO || "mocktradematrix@gmail.com";

let cached: Transporter | null = null;

function provider(): "json" | "brevo" | "resend" | "smtp" | null {
  if (process.env.MAIL_TRANSPORT === "json") return "json";
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return null;
}

export function mailConfigured() {
  return provider() !== null;
}

function fromParts() {
  const match = FROM.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].replace(/^"|"$/g, "") || "MockTrade Matrix", email: match[2] };
  return { name: "MockTrade Matrix", email: FROM.trim() };
}

function transporter(): Transporter {
  if (cached) return cached;
  if (process.env.MAIL_TRANSPORT === "json") {
    cached = nodemailer.createTransport({ jsonTransport: true });
    return cached;
  }
  const port = Number(process.env.SMTP_PORT || 465);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user: process.env.SMTP_USER as string, pass: process.env.SMTP_PASS as string },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return cached;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type GuardianEmailInput = {
  to: string;
  studentName: string;
  studentEmail: string;
  age: number | null;
  region: string;
  approveUrl: string;
};

export function guardianEmailContent(input: GuardianEmailInput) {
  const { to, studentName, studentEmail, age, region, approveUrl } = input;
  const name = escapeHtml(studentName);
  const email = escapeHtml(studentEmail);
  const link = escapeHtml(approveUrl);
  const ageText = age && age > 0 ? `${age}` : "under 18";
  const regionText = region === "US" ? "United States ($ USD)" : "India (₹ INR)";
  const subject = `Approve ${studentName}'s MockTrade Matrix access`;

  const text = [
    `Hello,`,
    ``,
    `${studentName} (${studentEmail}, age ${ageText}, ${regionText}) has asked to use MockTrade Matrix — a free, 100% simulated trading platform for learning about markets.`,
    ``,
    `Because they are under 18, their access stays locked until a parent or legal guardian approves it. No real money, securities or crypto is ever deposited, bought or sold.`,
    ``,
    `Review the request and record your decision here:`,
    approveUrl,
    ``,
    `The link is private to you. Approving confirms that you are ${studentName}'s parent or legal guardian and that you consent to their use of this educational simulation. You can withdraw consent at any time from their account settings.`,
    ``,
    `If you were not expecting this email, you can ignore it — access will remain locked.`,
    ``,
    `Questions? Reply to this email or write to mocktradematrix@gmail.com.`,
    ``,
    `MockTrade Matrix`,
    `Simulate · Learn · Earn`,
    `This is an educational simulation, not a brokerage or investment adviser.`,
  ].join("\n");

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16202c;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8ef;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:22px 26px;background:#07110d;color:#ffffff;">
            <div style="font-size:17px;font-weight:700;letter-spacing:-0.2px;">MockTrade <span style="color:#2fe3a0;">Matrix</span></div>
            <div style="margin-top:4px;font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:#8ea39a;">Guardian consent</div>
          </td>
        </tr>
        <tr>
          <td style="padding:26px;">
            <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Approve ${name}&rsquo;s simulation access</h1>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#3d4b5c;">
              <strong>${name}</strong> (${email}) has asked to use MockTrade Matrix, a free platform where learners practise
              investing with virtual money. They are ${ageText} and study in ${regionText}.
            </p>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#3d4b5c;">
              Because they are under 18, their account stays locked until you decide. No real money, securities or crypto
              is ever deposited, bought or sold — every trade is simulated.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0;">
              <tr><td style="border-radius:10px;background:#0e9668;">
                <a href="${link}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Review and decide</a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b7a8d;">Or paste this private link into your browser:</p>
            <p style="margin:0 0 18px;font-size:12px;line-height:1.6;word-break:break-all;"><a href="${link}" style="color:#0e9668;">${link}</a></p>
            <p style="margin:0 0 14px;font-size:12px;line-height:1.65;color:#3d4b5c;">
              Approving confirms that you are ${name}&rsquo;s parent or legal guardian and that you consent to their use of
              this educational simulation. You can withdraw consent at any time from their account settings.
            </p>
            <p style="margin:0;font-size:12px;line-height:1.65;color:#6b7a8d;">
              If you were not expecting this email, ignore it — access stays locked. Questions? Reply here or write to
              <a href="mailto:mocktradematrix@gmail.com" style="color:#0e9668;">mocktradematrix@gmail.com</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 26px;border-top:1px solid #e2e8ef;background:#fafcfd;font-size:11px;line-height:1.6;color:#7d8b9c;">
            MockTrade Matrix · Simulate · Learn · Earn<br>
            An educational simulation. Not a brokerage and not investment advice.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { from: FROM, to, replyTo: REPLY_TO, subject, text, html };
}

export async function sendGuardianEmail(input: GuardianEmailInput): Promise<MailResult> {
  const mode = provider();
  if (!mode) {
    return { sent: false, skipped: true, error: "Email is not configured on this server." };
  }

  const message = guardianEmailContent(input);

  try {
    if (mode === "json") {
      const info = await transporter().sendMail(message);
      return {
        sent: true,
        skipped: false,
        preview: String((info as { message?: string }).message ?? ""),
      };
    }

    if (mode === "brevo") {
      await postJson(
        "https://api.brevo.com/v3/smtp/email",
        {
          "api-key": process.env.BREVO_API_KEY as string,
          "content-type": "application/json",
          accept: "application/json",
        },
        {
          sender: fromParts(),
          to: [{ email: message.to }],
          replyTo: { email: message.replyTo },
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }
      );
      return { sent: true, skipped: false };
    }

    if (mode === "resend") {
      await postJson(
        "https://api.resend.com/emails",
        {
          authorization: `Bearer ${process.env.RESEND_API_KEY as string}`,
          "content-type": "application/json",
        },
        {
          from: message.from,
          to: [message.to],
          reply_to: message.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }
      );
      return { sent: true, skipped: false };
    }

    await transporter().sendMail(message);
    return { sent: true, skipped: false };
  } catch (err) {
    return {
      sent: false,
      skipped: false,
      error: err instanceof Error ? err.message : "The email could not be sent.",
    };
  }
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      data?.message ??
      data?.error?.message ??
      (typeof data?.error === "string" ? data.error : null) ??
      data?.errors?.[0]?.message ??
      `The email provider returned ${res.status}.`;
    throw new Error(message);
  }
  return data;
}
