/**
 * Checks the document matcher without OCR.
 *
 * The rule under test: image quality is recorded but never blocks. Only the
 * name, address and document number decide the outcome.
 */
import { verifyDocumentText } from "../lib/kyc.ts";

const base = { docType: "aadhaar", accountName: "Gate Test" };

const aadhaarText = `
GOVERNMENT OF INDIA
NAME: GATE TEST
ADDRESS: 12 MG ROAD, INDIRANAGAR, BENGALURU, KARNATAKA 560038
AADHAAR NO: 1234 5678 9012
`;

const cases = [
  { label: "blurry but all fields correct", text: aadhaarText, confidence: 18, expect: true },
  { label: "sharp and all fields correct", text: aadhaarText, confidence: 92, expect: true },
  { label: "wrong name", text: aadhaarText.replace("GATE TEST", "SOMEONE ELSE"), confidence: 90, expect: false },
  { label: "missing address", text: "GOVERNMENT OF INDIA\nNAME: GATE TEST\nAADHAAR NO: 1234 5678 9012", confidence: 90, expect: false },
  { label: "missing number", text: "GOVERNMENT OF INDIA\nNAME: GATE TEST\nADDRESS: 12 MG ROAD, INDIRANAGAR, BENGALURU, KARNATAKA 560038", confidence: 90, expect: false },
  { label: "no text at all", text: "", confidence: 0, expect: false },
];

let failures = 0;
for (const c of cases) {
  const r = verifyDocumentText({
    text: c.text,
    confidence: c.confidence,
    docType: base.docType,
    accountName: base.accountName,
  });
  const pass = r.ok === c.expect;
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"} | ${c.label} | confidence=${r.confidence} | checks=${JSON.stringify(r.checks)} | ${r.reasons[0] ?? "—"}`
  );
}

console.log(failures === 0 ? "\nall cases passed" : `\n${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
