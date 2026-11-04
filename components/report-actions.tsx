"use client";

import { useState } from "react";
import { Check, Download, FileCode2, Link2, Printer } from "lucide-react";

export function ReportActions() {
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
      <a href="/api/portfolio/report?format=csv" className="btn btn-dark btn-sm">
        <Download size={13} /> CSV
      </a>
      <a href="/api/portfolio/report?format=html" className="btn btn-dark btn-sm">
        <FileCode2 size={13} /> HTML
      </a>
      <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
        <Printer size={13} /> Print / Save as PDF
      </button>
      <button type="button" onClick={copyLink} className="btn btn-dark btn-sm">
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
