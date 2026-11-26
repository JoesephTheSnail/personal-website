import { describe, expect, it } from 'vitest';
import { splitHighlight, stripHighlight } from './highlight';

// A description marks its standout result with **double asterisks**. Everything except the
// category lists must show the description without that phrase, and the lists must be able to
// split it back out, so the two helpers have to agree.
describe('description highlights', () => {
  const sleep = '8 months studying screens and sleep. **A self-run study of 8 people across 85 nights.**';

  it('removes a trailing highlight and the space before it', () => {
    expect(stripHighlight(sleep)).toBe('8 months studying screens and sleep.');
  });

  it('removes a highlight in the middle without joining the words around it', () => {
    expect(stripHighlight('Built it. **1st place.** Then shipped it.')).toBe('Built it. Then shipped it.');
  });

  it('leaves text with no highlight alone', () => {
    expect(stripHighlight('Plain description.')).toBe('Plain description.');
    expect(splitHighlight('Plain description.')).toEqual([{ text: 'Plain description.', highlight: false }]);
  });

  it('splits plain and highlighted parts in order', () => {
    expect(splitHighlight(sleep)).toEqual([
      { text: '8 months studying screens and sleep. ', highlight: false },
      { text: 'A self-run study of 8 people across 85 nights.', highlight: true },
    ]);
  });

  it('handles several highlights and keeps the text between them', () => {
    expect(splitHighlight('a **b** c **d** e').map((p) => [p.text, p.highlight])).toEqual([
      ['a ', false],
      ['b', true],
      [' c ', false],
      ['d', true],
      [' e', false],
    ]);
  });

  it('does not treat a lone pair of asterisks as a highlight', () => {
    expect(splitHighlight('5 ** 2 is math')).toEqual([{ text: '5 ** 2 is math', highlight: false }]);
  });
});
