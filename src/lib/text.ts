export function cleanDisplayText(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\/?a href=.*$/i, '')
    .replace(/\s+img\s+.*$/i, '')
    .replace(/\bADA Accommodation Requests?\.?/gi, ' ')
    .replace(/\bSolicitudes de Acomodaci[oó]n ADA\.?/gi, ' ')
    .replace(/\bGet accessibility information\.?/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([!?])\./g, '$1')
    .replace(/\s+\./g, '.')
    .replace(/(\.\s*){2,}/g, '. ')
    .trim();
}
