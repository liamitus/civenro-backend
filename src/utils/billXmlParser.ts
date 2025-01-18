// src/utils/billXmlParser.ts

export const BillXmlParser = {
  extractSections,
};

/**
 * Entry point: decides if root is <bill> or <resolution>, calls parse logic.
 */
async function extractSections(xmlObj: any) {
  if (xmlObj.bill) {
    return parseBillOrResolution(xmlObj.bill);
  } else if (xmlObj.resolution) {
    return parseBillOrResolution(xmlObj.resolution);
  } else {
    console.warn('Unknown top-level node:', Object.keys(xmlObj));
    return [];
  }
}

/**
 * parseBillOrResolution: top-level logic for <bill> or <resolution> docs.
 */
function parseBillOrResolution(
  topNode: any
): { heading: string; content: string }[] {
  const results: { heading: string; content: string }[] = [];
  if (!Array.isArray(topNode.$$)) return results;

  const legisBodies = topNode.$$.filter(
    (child: any) => child['#name'] === 'legis-body'
  );
  for (const lb of legisBodies) {
    const sections = lb.$$.filter((c: any) => c['#name'] === 'section');
    for (const sec of sections) {
      const { sectionEnum, sectionHeader } = extractSectionHeading(sec);

      // e.g. "SEC. 2" -> "SEC. 2. Additional rip and replace funding"
      const numericHeading = `SEC. ${sectionEnum}`;
      const fullHeading = sectionHeader
        ? `${numericHeading} ${sectionHeader}`
        : numericHeading;

      const subsecs = sec.$$.filter((ch: any) => ch['#name'] === 'subsection');
      if (subsecs.length === 0) {
        // parse entire <section> as one chunk
        let content = '';
        if (sectionHeader.toLowerCase() === 'short title') {
          content = findShortTitle(sec);
        } else {
          content = findDirectText(sec);
        }
        results.push({ heading: fullHeading, content });
      } else {
        // multiple <subsection>
        for (const sub of subsecs) {
          const { subEnum, subHeader } = extractSubsectionHeading(sub);
          const subHeading = buildSubsectionHeading(
            numericHeading,
            subEnum,
            subHeader
          );

          let content = parseNodeInReadingOrder(sub);

          // Optionally remove leading "prefix" from the content
          const prefix = `${subEnum} ${subHeader}`.trim();
          if (prefix && content.startsWith(prefix)) {
            content = content.substring(prefix.length).trim();
          }

          if (content.length > 0) {
            results.push({ heading: subHeading, content });
          }
        }
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------
//                 Heading Extraction & Building
// ---------------------------------------------------------------------

function extractSectionHeading(sectionNode: any) {
  let sectionEnum = '';
  let sectionHeader = '';

  if (!sectionNode.$$) return { sectionEnum, sectionHeader };

  // <enum>
  const eChild = sectionNode.$$.find((ch: any) => ch['#name'] === 'enum');
  if (eChild && typeof eChild._ === 'string') {
    sectionEnum = eChild._.trim();
  }

  // <header> (could contain nested children or direct text)
  const hChild = sectionNode.$$.find((ch: any) => ch['#name'] === 'header');
  if (hChild) {
    sectionHeader = parseNodeInReadingOrder(hChild).replace(/\s+/g, ' ').trim();
  }

  return { sectionEnum, sectionHeader };
}

function extractSubsectionHeading(subNode: any) {
  let subEnum = '';
  let subHeader = '';
  if (!subNode.$$) return { subEnum, subHeader };

  const eChild = subNode.$$.find((ch: any) => ch['#name'] === 'enum');
  if (eChild && typeof eChild._ === 'string') {
    subEnum = eChild._.trim();
  }

  const hChild = subNode.$$.find((ch: any) => ch['#name'] === 'header');
  if (hChild) {
    subHeader = parseNodeInReadingOrder(hChild).replace(/\s+/g, ' ').trim();
  }

  return { subEnum, subHeader };
}

function buildSubsectionHeading(
  topLevelHeading: string,
  subEnum: string,
  subHeader: string
): string {
  let heading = topLevelHeading;
  if (subEnum) {
    const subEnumClean = subEnum.replace(/^\(/, '').replace(/\)$/, '');
    heading += ` (${subEnumClean})`;
  }
  if (subHeader) {
    heading += ` ${subHeader}`;
  }
  return heading;
}

// ---------------------------------------------------------------------
//                 Main Text Parsing
// ---------------------------------------------------------------------

/**
 * parseNodeInReadingOrder:
 * - Reads node.$$ in order (with charsAsChildren: true).
 * - Recursively processes child tags, stitching them into a final string.
 */
function parseNodeInReadingOrder(node: any): string {
  if (!Array.isArray(node.$$)) {
    return typeof node._ === 'string' ? node._ : '';
  }

  // If we find an <enum> or <header> among children, we might skip certain text chunks
  const skipText = shouldSkipTextNode(node);

  let output = '';
  for (const child of node.$$) {
    // Optional approach: use a dispatch object rather than switch
    const handler =
      childNodeHandlers[child['#name']] || childNodeHandlers.default;
    output += handler(child, skipText);
  }

  output = output
    // 1. Condense all whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // 2. Remove space right after '(' and before ')'
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    // 3. Ensure space if we have a period immediately followed by '('
    .replace(/\.\(/g, '. (')
    // 4. Ensure space between adjacent parentheses, e.g. ")("
    .replace(/\)\(/g, ') (')
    // 5. add missing space after colon if immediately followed by "("
    .replace(/:\(/g, ': (');

  // You could do more post-processing here
  return output;
}

/**
 * Decide if we skip raw text. For example, if we see <enum>(a)</enum> in the same node,
 * the raw text might contain "(a)" redundantly.
 */
function shouldSkipTextNode(node: any): boolean {
  const hasEnumChild = node.$$.some((ch: any) => ch['#name'] === 'enum');
  const hasHeaderChild = node.$$.some((ch: any) => ch['#name'] === 'header');
  return hasEnumChild || hasHeaderChild;
}

/**
 * A utility to condense appended text.
 * Ensures there's a space if needed.
 */
function appendText(existing: string, next: string): string {
  if (!next) return existing;
  if (!existing) return next;

  // If existing ends with '.' and next starts with '(' → insert a space
  if (existing.endsWith('.') && next.startsWith('(')) {
    return existing + ' ' + next;
  }
  return existing + ' ' + next;
}

// ---------------------------------------------------------------------
//                 Child Node Handlers
// ---------------------------------------------------------------------

/**
 * Instead of a giant switch, we can define a lookup table from #name -> function.
 * Each function receives (childNode, skipText) and returns the text to append.
 */
const childNodeHandlers: Record<
  string,
  (child: any, skipText?: boolean) => string
> = {
  // 1) Text chunk
  __text__: (child, skipText) => {
    if (skipText) return '';
    return child._ || '';
  },

  // 2) <external-xref>
  'external-xref': (child) => {
    const xrefText = parseNodeInReadingOrder(child).trim();
    return xrefText; // or wrap in parentheses, e.g. `(${xrefText})`
  },

  // 3) <quote>
  quote: (child) => {
    let quoteText = '';
    if (typeof child._ === 'string') {
      quoteText = child._.trim();
    } else if (Array.isArray(child.$$)) {
      quoteText = parseNodeInReadingOrder(child).trim();
    }
    return quoteText ? ` "${quoteText}"` : '';
  },

  // 4) <short-title>, <emphasis>, <symbol>
  'short-title': (child) => parseNodeInReadingOrder(child),
  emphasis: (child) => parseNodeInReadingOrder(child),
  symbol: (child) => parseNodeInReadingOrder(child),

  // <term>: wrap content in quotes
  term: (child) => {
    const termText = parseNodeInReadingOrder(child).trim();
    return termText ? ` "${termText}"` : '';
  },

  // 5) <paragraph>
  paragraph: (child) => parseParagraph(child),

  // 6) <text>
  text: (child) => {
    if (child.$$ && child.$$.length > 0) {
      return parseNodeInReadingOrder(child);
    }
    if (typeof child._ === 'string') {
      return child._;
    }
    return '';
  },

  // 7) <enum>
  enum: (child) => {
    if (typeof child._ === 'string') {
      return ` ${child._.trim()} `;
    }
    return '';
  },

  // 8) <header>
  header: (child) => {
    // parse children in one line
    return ' ' + parseNodeInReadingOrder(child).replace(/\s+/g, ' ');
  },

  // 9) structural nodes: subparagraph, item, subsection, section, preamble, etc.
  subparagraph: (child) => ' ' + parseNodeInReadingOrder(child),
  item: (child) => ' ' + parseNodeInReadingOrder(child),
  subsection: (child) => ' ' + parseNodeInReadingOrder(child),
  section: (child) => ' ' + parseNodeInReadingOrder(child),
  preamble: (child) => ' ' + parseNodeInReadingOrder(child),

  // 10) default fallback
  default: (child) => {
    // parse recursively
    return ' ' + parseNodeInReadingOrder(child);
  },
};

// ---------------------------------------------------------------------
//                 Paragraph Parsing
// ---------------------------------------------------------------------

function parseParagraph(node: any): string {
  if (!node.$$) return '';

  let out = '';
  let i = 0;

  while (i < node.$$.length) {
    const child = node.$$[i];
    if (!child) {
      i++;
      continue;
    }

    // If <enum>...
    if (child['#name'] === 'enum' && typeof child._ === 'string') {
      out = appendText(out, child._);
      i++;
      continue;
    }

    // If <header> followed by <text> that starts with "The term"
    if (
      child['#name'] === 'header' &&
      typeof child._ === 'string' &&
      i + 1 < node.$$.length
    ) {
      const headerText = child._.trim();
      const next = node.$$[i + 1];
      if (
        next?.['#name'] === 'text' &&
        typeof next._ === 'string' &&
        next._.trim().startsWith('The term')
      ) {
        // Insert "The term "Header""
        let textContent = next._.trim();
        const replaced = textContent.replace(
          /^The term/,
          `The term "${headerText}"`
        );
        out = appendText(out, replaced);
        i += 2;
        continue;
      } else {
        // No special pattern
        out = appendText(out, headerText);
        i++;
        continue;
      }
    }

    // If <text>
    if (child['#name'] === 'text') {
      if (child.$$) {
        out = appendText(out, parseNodeInReadingOrder(child));
      } else if (typeof child._ === 'string') {
        out = appendText(out, child._);
      }
    }
    // If <subparagraph>
    else if (child['#name'] === 'subparagraph') {
      out = appendText(out, parseNodeInReadingOrder(child));
    }
    // fallback: recursively parse
    else if (child.$$) {
      out = appendText(out, parseParagraph(child));
    }

    i++;
  }

  return out.trim();
}

// ---------------------------------------------------------------------
//                Helper Functions (Short Title, etc.)
// ---------------------------------------------------------------------

function findShortTitle(sectionNode: any): string {
  const quotes = findAllNodes(sectionNode, 'quote');
  for (const q of quotes) {
    if (q.$$) {
      const stChild = q.$$.find((x: any) => x['#name'] === 'short-title');
      if (stChild) {
        return parseNodeInReadingOrder(stChild).trim();
      }
    }
  }
  return '';
}

function findDirectText(sectionNode: any): string {
  if (!sectionNode.$$) return '';
  const textNode = sectionNode.$$.find(
    (child: any) => child['#name'] === 'text'
  );
  if (!textNode) return '';
  return parseNodeInReadingOrder(textNode).replace(/\s+/g, ' ').trim();
}

function findAllNodes(node: any, name: string): any[] {
  let results: any[] = [];
  if (!node.$$) return results;

  for (const child of node.$$) {
    if (child['#name'] === name) {
      results.push(child);
    }
    if (child.$$) {
      results = results.concat(findAllNodes(child, name));
    }
  }
  return results;
}
