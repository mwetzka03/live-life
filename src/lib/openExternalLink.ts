export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function openExternalLink(url: string): void {
  const href = normalizeExternalUrl(url);
  if (!href) return;
  window.open(href, '_blank', 'noopener,noreferrer');
}
