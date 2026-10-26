// Locale-aware formatting, one formatter per language dictionary.
// fr-FR: narrow no-break space (U+202F) as thousands separator, no-break space before ":" and "%"; U+202F before
// "!", "?" and ";" (AC-35). en: comma as thousands separator, no space before ":" or "%".
export const NBSP = ' ';
// Narrow no-break space, before "!", "?" and ";".
export const NNBSP = ' ';

export type Formatter = {
  integer(value: number): string;
  label(text: string, value: string | number): string;
};

export function formatter(locale: string): Formatter {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const beforeColon = locale.toLowerCase().startsWith('fr') ? NBSP : '';
  const integer = (value: number) => numbers.format(value);
  return {
    integer,
    label: (text, value) => `${text}${beforeColon}: ${typeof value === 'number' ? integer(value) : value}`,
  };
}

// French helpers used by fr.ts.
const french = formatter('fr-FR');
export const formatInteger = french.integer;
export const label = french.label;
