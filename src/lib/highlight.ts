// Project descriptions can mark a standout result inline with **double
// asterisks**, e.g. "A luxury clothing rental platform. **1st place at
// DragonzDen.**". Category lists render those spans bold and in the
// category's accent colour; everywhere else (tiles, page metadata, the
// project's own header) uses the description with those spans left out.
// Kept free of fs/Node imports so client components can use it.

export interface DescriptionPart {
  text: string;
  highlight: boolean;
}

/** The description with every highlighted span removed entirely — what tiles, metadata and the project's own page show. */
export function stripHighlight(text: string): string {
  return text.replace(/\s*\*\*(.+?)\*\*/g, '').trim();
}

export function splitHighlight(text: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), highlight: false });
    parts.push({ text: m[1], highlight: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), highlight: false });
  return parts;
}
