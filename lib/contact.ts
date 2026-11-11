export const CONTACT_EMAIL = "mocktradematrix@gmail.com";

const GMAIL_COMPOSE = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`;

/** Gmail compose link with a subject and plain-text body already filled in. */
export function gmailCompose(subject: string, body: string) {
  return `${GMAIL_COMPOSE}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function institutionEmail(origin = "") {
  const body = [
    "Hi MockTradeMatrix team,",
    "",
    "I would like to discuss Institution access for my school or college.",
    "",
    `Name:`,
    `Institution:`,
    `Role:`,
    `Expected seats:`,
    `Region (India / US / other):`,
    "",
    origin ? `I came from ${origin}.` : "",
    "",
    "Thanks,",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return gmailCompose("Institution access — MockTradeMatrix", body);
}

export function premiumEmail(origin = "") {
  const body = [
    "Hi MockTradeMatrix team,",
    "",
    "I would like to ask about Premium access during the beta.",
    "",
    `Name:`,
    `Account email:`,
    "",
    origin ? `I came from ${origin}.` : "",
    "",
    "Thanks,",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return gmailCompose("Premium access — MockTradeMatrix", body);
}
