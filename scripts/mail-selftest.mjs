/**
 * Renders and "sends" a guardian consent email without a network connection.
 *
 * MAIL_TRANSPORT=json makes nodemailer serialise the message instead of
 * delivering it. The Brevo branch is tested with a stubbed fetch, so no real
 * email is ever sent by this script.
 */
process.env.MAIL_TRANSPORT = "json";
process.env.MAIL_FROM = "MockTrade Matrix <mocktradematrix@gmail.com>";

const { guardianEmailContent, sendGuardianEmail, mailConfigured } = await import("../lib/mail.ts");

const input = {
  to: "parent@example.com",
  studentName: "Aarav Sharma",
  studentEmail: "aarav@example.com",
  age: 15,
  region: "IN",
  approveUrl: "https://mocktrade.example/guardian/token-123",
};

let failures = 0;
function check(label, condition) {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"} | ${label}`);
}

check("mail is configured in json mode", mailConfigured());

const mail = guardianEmailContent(input);
check("goes to the guardian address", mail.to === "parent@example.com");
check("subject names the student", mail.subject.includes("Aarav Sharma"));
check("plain text includes the consent link", mail.text.includes(input.approveUrl));
check("html includes the consent link", mail.html.includes(input.approveUrl));
check("html says no real money", /no real money/i.test(mail.html));
check("reply-to is the public inbox", mail.replyTo === "mocktradematrix@gmail.com");

const escaped = guardianEmailContent({ ...input, studentName: '<script>alert("x")</script>' });
check("student name is escaped in html", !escaped.html.includes("<script>alert"));
check("escaped name still appears in text", escaped.text.includes('<script>alert("x")</script>'));

const sent = await sendGuardianEmail(input);
check("json send returns success", sent.sent && !sent.skipped);
check("serialised message carries the link", Boolean(sent.preview?.includes(input.approveUrl)));

// ---- Brevo HTTPS branch (stubbed fetch) ----
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  calls.push({ url, init, body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ messageId: "test" }), { status: 201 });
};

delete process.env.MAIL_TRANSPORT;
process.env.BREVO_API_KEY = "test-key";
process.env.APP_URL = "https://mocktrade.example";

const brevo = await sendGuardianEmail(input);
check("brevo send returns success", brevo.sent && !brevo.skipped);
check("brevo posts to the transactional endpoint", calls[0]?.url === "https://api.brevo.com/v3/smtp/email");
check("brevo uses the API key header", calls[0]?.init.headers["api-key"] === "test-key");
check("brevo sets the guardian recipient", calls[0]?.body.to?.[0]?.email === "parent@example.com");
check("brevo sets the sender address", calls[0]?.body.sender?.email === "mocktradematrix@gmail.com");
check("brevo carries html and text", Boolean(calls[0]?.body.htmlContent && calls[0]?.body.textContent));
check("brevo html carries the link", calls[0]?.body.htmlContent.includes(input.approveUrl));

globalThis.fetch = async () =>
  new Response(JSON.stringify({ message: "Sender not verified" }), { status: 400 });
const rejected = await sendGuardianEmail(input);
check("provider errors are surfaced, not thrown", !rejected.sent && /Sender not verified/.test(rejected.error ?? ""));

globalThis.fetch = originalFetch;

console.log(failures === 0 ? "\nall cases passed" : `\n${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
