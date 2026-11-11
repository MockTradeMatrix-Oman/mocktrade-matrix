"use client";

import { useState } from "react";
import { Check, Download, Link2, Printer } from "lucide-react";

export function CertificateActions({
  download = false,
  printHref,
}: {
  download?: boolean;
  printHref?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {printHref ? (
        <a href={printHref} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
          <Printer size={13} /> Print / Save as PDF
        </a>
      ) : (
        <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
          <Printer size={13} /> Print / Save as PDF
        </button>
      )}
      {download && (
        <a href="/api/certificate?format=html" className="btn btn-dark btn-sm">
          <Download size={13} /> HTML
        </a>
      )}
      <button type="button" onClick={copyLink} className="btn btn-dark btn-sm">
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
