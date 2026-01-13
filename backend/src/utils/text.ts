export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ");
}

export function compactText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
