// French formatting. Note: fr-FR uses a narrow no-break space (U+202F) as thousands separator.
const integerFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export const NBSP = ' ';

export function formatInteger(value: number): string {
  return integerFormat.format(value);
}

// French typography: no-break space before ":" (and ";", "!", "?").
export function label(text: string, value: string | number): string {
  return `${text}${NBSP}: ${typeof value === 'number' ? formatInteger(value) : value}`;
}
