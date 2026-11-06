/**
 * Real, offline KYC document checks.
 *
 * The image never leaves this machine: `scripts/ocr.mjs` runs Tesseract on it,
 * we validate the extracted text, then the image is deleted. Only the
 * extracted fields, a hash and the outcome are kept for audit.
 */

export type DocType = "aadhaar" | "pan" | "passport" | "license";

export const DOC_TYPES: Array<{ id: DocType; label: string; note: string; hint: string }> = [
  { id: "aadhaar", label: "Aadhaar", note: "India · 12-digit", hint: "Show the front with your name, full address and the 12-digit number." },
  { id: "pan", label: "PAN card", note: "India · tax ID", hint: "The PAN card carries your name, father's name and the 10-character PAN." },
  { id: "passport", label: "Passport", note: "International", hint: "Photo page: name, address, passport number and the MRZ lines." },
  { id: "license", label: "Driver's licence", note: "Regional", hint: "Name, address and the licence number must all be legible." },
];

export type KycChecks = {
  readable: boolean;
  name: boolean;
  address: boolean;
  number: boolean;
};

export type KycResult = {
  ok: boolean;
  checks: KycChecks;
  reasons: string[];
  extractedName: string | null;
  extractedAddress: string | null;
  confidence: number;
};

const ADDRESS_WORDS =
  /(road|street|st\.|lane|nagar|colony|sector|block|flat|house|apt|apartment|floor|village|district|city|state|pin|zip|post|tehsil|taluk|layout|cross|main|near|opposite|marg|chowk|bazaar|po\b|suburb|province|county|avenue|ave\b|drive|blvd)/i;

const HEADER_WORDS =
  /^(government|india|republic|aadhaar|pan|passport|licen[cs]e|driving|driver|income tax|unique identification|authority|card|front|back|address|name|dob|date of birth|male|female|gender|signature|photo|pin code|zip code)/i;

function normalise(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[|_]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .toUpperCase();
}

function lines(text: string) {
  return normalise(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/^[^A-Z0-9]+/, "").replace(/[^A-Z0-9)\].]+$/, "").trim())
    .filter(Boolean);
}

function words(value: string) {
  return value.split(/[^A-Z]+/).filter((w) => w.length >= 2);
}

function labelledLine(all: string[], label: RegExp) {
  for (let i = 0; i < all.length; i++) {
    if (!label.test(all[i])) continue;
    const inline = all[i].replace(label, "").replace(/^[\s:.\-]+/, "").trim();
    if (inline.length >= 3) return { value: inline, index: i };
    const next = all[i + 1] ?? "";
    if (next.length >= 3 && !HEADER_WORDS.test(next)) return { value: next, index: i + 1 };
  }
  return null;
}

export function extractName(text: string): string | null {
  const all = lines(text);
  const labelled = labelledLine(all, /^(?:FULL\s+)?NAME\b/);
  if (labelled) {
    const value = labelled.value.replace(/\s{2,}/g, " ").slice(0, 80);
    if (words(value).length >= 2) return value;
  }
  // Fall back to the first plausible human-name line (2–4 alphabetic words).
  for (const line of all) {
    if (HEADER_WORDS.test(line)) continue;
    if (/\d/.test(line)) continue;
    const w = line.split(/\s+/).filter((x) => /^[A-Z][A-Z.'-]{1,}$/.test(x));
    if (w.length >= 2 && w.length <= 4 && line.length <= 60) return line;
  }
  return null;
}

export function extractAddress(text: string): string | null {
  const all = lines(text);
  const labelled = labelledLine(all, /^(?:PERMANENT\s+|RESIDENTIAL\s+|FULL\s+)?ADDRESS\b/);
  if (labelled) {
    const parts = [labelled.value];
    for (let i = labelled.index + 1; i < all.length && parts.length < 3; i++) {
      const next = all[i];
      if (HEADER_WORDS.test(next) || /^(?:AADHAAR|PAN|PASSPORT|LICENCE|LICENSE|DOB|DATE OF BIRTH|GENDER|SIGNATURE)\b/.test(next)) break;
      if (next.length < 4) break;
      parts.push(next);
    }
    return parts.join(", ").replace(/\s{2,}/g, " ").slice(0, 220);
  }

  // No label: pick the densest window of address-ish lines.
  for (let i = 0; i < all.length; i++) {
    const window = all.slice(i, i + 3).join(", ");
    if (ADDRESS_WORDS.test(window) && /\d{4,6}/.test(window) && window.length >= 16) {
      return window.slice(0, 220);
    }
  }
  return null;
}

function hasPostalCode(value: string) {
  return /\b\d{6}\b/.test(value) || /\b\d{5}(?:-\d{4})?\b/.test(value);
}

function hasStreetWord(value: string) {
  return ADDRESS_WORDS.test(value);
}

const NUMBER_PATTERNS: Record<DocType, { re: RegExp; label: string }> = {
  aadhaar: { re: /\b\d{4}\s?\d{4}\s?\d{4}\b/, label: "12-digit Aadhaar number" },
  pan: { re: /\b[A-Z]{5}\d{4}[A-Z]\b/, label: "10-character PAN (ABCDE1234F)" },
  passport: { re: /\b[A-Z]\d{7}\b/, label: "passport number (letter + 7 digits)" },
  license: {
    re: /\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}\b|\b[A-Z]{2}\d{2}[-\s]?\d{11}\b|\b[A-Z]{2}\d{13}\b/,
    label: "driving licence number",
  },
};

export function verifyDocumentText(opts: {
  text: string;
  confidence: number;
  docType: DocType;
  accountName: string;
}): KycResult {
  const { text, confidence, docType, accountName } = opts;
  const flat = normalise(text).replace(/\s+/g, " ");
  const letters = (flat.match(/[A-Z]/g) ?? []).length;
  const reasons: string[] = [];

  // Image quality is recorded for diagnostics but is deliberately NOT a gate.
  // A blurry photo that still yields the name, address and document number
  // passes; only the fields themselves decide.
  const readable = confidence >= 55 && flat.trim().length >= 40 && letters >= 20;

  if (letters < 5 && flat.trim().length < 20) {
    return {
      ok: false,
      checks: { readable, name: false, address: false, number: false },
      reasons: ["No text could be read at all. Use a brighter, flatter photo with the whole document in frame."],
      extractedName: null,
      extractedAddress: null,
      confidence: Math.round(confidence),
    };
  }

  const extractedName = extractName(text);
  const accountTokens = words(normalise(accountName)).filter((w) => w.length >= 2);
  const documentTokens = new Set(words(flat));
  const nameMatchesAccount =
    accountTokens.length > 0 && accountTokens.every((t) => documentTokens.has(t));
  const nameHasFullName = extractedName ? words(extractedName).length >= 2 : false;
  const name = Boolean(extractedName) && nameHasFullName && nameMatchesAccount;
  if (!name) {
    if (!extractedName) reasons.push("No name line was found on the document.");
    else if (!nameHasFullName) reasons.push("The name on the document looks incomplete — the full name must be printed.");
    else reasons.push(`The document does not show the account name “${accountName}”. Use a document issued in that name.`);
  }

  const extractedAddress = extractAddress(text);
  const address =
    extractedAddress !== null &&
    extractedAddress.length >= 14 &&
    hasStreetWord(extractedAddress) &&
    hasPostalCode(extractedAddress);
  if (!address) {
    if (!extractedAddress) reasons.push("No address was found. The document must show your full address.");
    else if (!hasStreetWord(extractedAddress)) reasons.push("The address is missing a street, locality or district line.");
    else reasons.push("The address is missing a PIN / ZIP code.");
  }

  const number = NUMBER_PATTERNS[docType].re.test(flat);
  if (!number) {
    reasons.push(`Could not find the ${NUMBER_PATTERNS[docType].label} for the selected document type.`);
  }

  const checks: KycChecks = { readable, name, address, number };
  return {
    ok: checks.name && checks.address && checks.number,
    checks,
    reasons,
    extractedName: extractedName ? titleCase(extractedName) : null,
    extractedAddress: extractedAddress ? titleCase(extractedAddress) : null,
    confidence: Math.round(confidence),
  };
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(And|Of|The)\b/g, (m) => m.toLowerCase());
}

export function maskName(value: string | null) {
  if (!value) return null;
  return value
    .split(/\s+/)
    .map((part, i) => (i === 0 ? part : part.length <= 2 ? part : `${part[0]}${"•".repeat(part.length - 1)}`))
    .join(" ");
}
