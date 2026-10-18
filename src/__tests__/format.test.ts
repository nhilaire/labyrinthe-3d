import { formatInteger, label } from '../i18n/format';

describe('French formatting', () => {
  it('groups thousands with a narrow no-break space', () => {
    expect(formatInteger(12345)).toBe('12 345');
  });

  it('puts a no-break space before a colon', () => {
    expect(label('Score', 3)).toBe('Score : 3');
  });
});
