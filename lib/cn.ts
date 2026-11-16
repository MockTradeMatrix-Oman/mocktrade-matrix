/**
 * Join truthy class names.
 *
 * This lives outside `components/ui.tsx` (a client module) so server
 * components can call it directly during render. Client modules re-export it
 * for compatibility.
 */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
