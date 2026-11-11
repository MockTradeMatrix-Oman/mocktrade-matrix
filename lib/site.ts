import "server-only";
import { headers } from "next/headers";

/**
 * Absolute origin for links printed into certificates, emails and exports.
 * Render forwards the public host, so the forwarded values win over the
 * internal request host.
 */
export async function siteOrigin(): Promise<string> {
  const store = await headers();
  const host =
    store.get("x-forwarded-host") ?? store.get("host") ?? "mocktradematrix.onrender.com";
  const proto =
    store.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
