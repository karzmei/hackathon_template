import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Audit/message timestamp for actions taken now, e.g. "20 Jun 14:32".
export function nowStamp(d: Date = new Date()): string {
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

// Copy text to the clipboard. Thin wrapper over navigator.clipboard so callers can
// await it and swap implementations without touching the UI.
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// The RM digest kicker for today, e.g. "MORNING DIGEST · FRI 20 JUN".
export function digestLabel(d: Date = new Date()): string {
  const day = d
    .toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase();
  return `MORNING DIGEST · ${day}`;
}
