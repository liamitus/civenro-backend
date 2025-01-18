// src/utils/billXmlParser.ts

/**
 * BillXmlParser:
 * Functions responsible for traversing the parsed XML object
 * and extracting sections, subsections, paragraphs, etc.
 */

export const BillXmlParser = {
  extractSections,
};

async function extractSections(xmlObj: any) {
  // top-level might have 'bill' or 'resolution'
  if (xmlObj.bill) {
    return parseBillOrResolution(xmlObj.bill);
  } else if (xmlObj.resolution) {
    return parseBillOrResolution(xmlObj.resolution);
  } else {
    console.warn('Unknown top-level node:', Object.keys(xmlObj));
    return [];
  }
}

function parseBillOrResolution(
  topNode: any
): { heading: string; content: string }[] {
  const results: { heading: string; content: string }[] = [];
  if (!Array.isArray(topNode.$$)) return results;

  // 1. Find any <legis-body> children
  const legisBodies = topNode.$$.filter(
    (child: any) => child['#name'] === 'legis-body'
  );

  for (const lb of legisBodies) {
    // inside each <legis-body>, find <section> children
    const sections = lb.$$.filter((c: any) => c['#name'] === 'section');

    for (const sec of sections) {
      const { sectionEnum, sectionHeader } = extractSectionHeading(sec);

      // We'll build two forms:
      // 1) numericHeading = "SEC. {sectionEnum}."
      // 2) fullHeading = numericHeading + " " + {sectionHeader}
      // e.g. numericHeading = "SEC. 2."
      //      fullHeading = "SEC. 2. Repayment of Federal financial assistance..."
      const numericHeading = `SEC. ${sectionEnum}`;
      const fullHeading = sectionHeader
        ? `${numericHeading} ${sectionHeader}`
        : numericHeading;

      // see if <section> has <subsection> children
      const subsecs = sec.$$.filter((ch: any) => ch['#name'] === 'subsection');
      if (subsecs.length === 0) {
        // parse entire <section> as one chunk
        let content = '';
        if (sectionHeader.toLowerCase() === 'short title') {
          // Special handling for "Short title"
          content = findShortTitle(sec);
        } else {
          // If it’s not a short title, just gather direct text
          content = findDirectText(sec);
        }

        // Just push "fullHeading" (e.g. "SEC. 2. Repayment...")
        results.push({ heading: fullHeading, content });
      } else {
        // multiple subsections => one chunk per <subsection>
        // Optionally, you can store a "top-level" section record as well
        // If you want the top-level heading + empty content, you could do:
        // results.push({ heading: fullHeading, content: '' });

        for (const sub of subsecs) {
          const { subEnum, subHeader } = extractSubsectionHeading(sub);

          // Build a subsection heading using only numericHeading, not the entire "Repayment..." header
          // So we get "SEC. 2. (a) In general" instead of "SEC. 2. Repayment... (a) In general"
          const subHeading = buildSubsectionHeading(
            numericHeading, // base "SEC. 2."
            subEnum,
            subHeader
          );

          // Gather text from the subsection
          let content = parseNodeInReadingOrder(sub);

          // Remove leading subsection enumeration/header if present in the text
          // (this is optional or up to your preference)
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
//                       Heading Extraction
// ---------------------------------------------------------------------

function extractSectionHeading(sectionNode: any) {
  let sectionEnum = '';
  let sectionHeader = '';

  if (!sectionNode.$$) return { sectionEnum, sectionHeader };

  const eChild = sectionNode.$$.find((ch: any) => ch['#name'] === 'enum');
  if (eChild && typeof eChild._ === 'string') {
    sectionEnum = eChild._.trim();
  }

  const hChild = sectionNode.$$.find((ch: any) => ch['#name'] === 'header');
  if (hChild) {
    if (hChild.$$ && hChild.$$.length > 0) {
      sectionHeader = parseNodeInReadingOrder(hChild)
        .replace(/\s+/g, ' ')
        .trim();
    } else if (typeof hChild._ === 'string') {
      sectionHeader = hChild._.trim();
    }
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
    if (hChild.$$ && hChild.$$.length > 0) {
      subHeader = parseNodeInReadingOrder(hChild).replace(/\s+/g, ' ').trim();
    } else if (typeof hChild._ === 'string') {
      subHeader = hChild._.trim();
    }
  }

  return { subEnum, subHeader };
}

/**
 * Build a heading for a subsection, e.g. "SEC. 2 (a) In General."
 */
function buildSubsectionHeading(
  topLevelHeading: string,
  subEnum: string,
  subHeader: string
): string {
  let shortHeading = topLevelHeading;
  if (subEnum) {
    const subEnumClean = subEnum.replace(/^\(/, '').replace(/\)$/, '');
    shortHeading += ` (${subEnumClean})`;
  }
  if (subHeader) {
    shortHeading += ` ${subHeader}`;
  }
  return shortHeading;
}

// ---------------------------------------------------------------------
//                       Main Text Parsing
// ---------------------------------------------------------------------

/**
 * parseNodeInReadingOrder:
 *   - Takes a node from xml2js with `preserveChildrenOrder: true`.
 *   - Returns the fully reconstructed text, with inline elements placed in correct sequence.
 *   - No reliance on literal `()` in the parent text for <external-xref>.
 *   - We explicitly decide how to handle each tag, e.g. wrap <external-xref> in parentheses.
 */
function parseNodeInReadingOrder(node: any): string {
  // If this node has no children, see if there's direct text in node._
  if (!Array.isArray(node.$$)) {
    return typeof node._ === 'string' ? node._ : '';
  }

  let output = '';

  // Detect whether to ignore the parent __text__
  const hasEnumChild = node.$$.some((ch: any) => ch['#name'] === 'enum');
  const hasHeaderChild = node.$$.some((ch: any) => ch['#name'] === 'header');

  // Iterate the children in the order they appear
  for (const child of node.$$) {
    switch (child['#name']) {
      // -----------------------------------------
      // 1) Text chunk
      // -----------------------------------------
      case '__text__': {
        // If we see text like "(a) FCC Auction 97..." and we also see an <enum> child
        // that has "(a)", plus a <header> child that has "FCC Auction 97 reauction…",
        // we can skip adding this text altogether:
        if (hasEnumChild || hasHeaderChild) {
          // skip it
          break;
        }
        // Otherwise, keep it
        output += child._;
        break;
      }

      // -----------------------------------------------------------------
      // 2) External references (inline), e.g. <external-xref>47 U.S.C. 309(j)</external-xref>
      // -----------------------------------------------------------------
      case 'external-xref': {
        const xrefText = parseNodeInReadingOrder(child).trim();
        // Revert to parentheses around the reference
        output += `${xrefText}`;
        break;
      }

      // -----------------------------------------------------------------
      // 3) Quote tags, e.g. <quote>$1,900,000,000</quote>
      // -----------------------------------------------------------------
      case 'quote': {
        // Keep quotes inline without extra spacing after the preceding text
        let quoteText = '';
        if (typeof child._ === 'string') {
          // e.g. $1,900,000,000
          quoteText = child._.trim();
        } else if (Array.isArray(child.$$)) {
          quoteText = parseNodeInReadingOrder(child).trim();
        }
        if (quoteText) {
          output += ` "${quoteText}"`;
        }
        break;
      }

      // -----------------------------------------------------------------
      // 4) short-title, term, etc.
      //    We treat these similarly: parse content, add any styling or punctuation
      // -----------------------------------------------------------------
      case 'short-title':
      case 'emphasis':
      case 'symbol': {
        const inlineText = parseNodeInReadingOrder(child);
        output += inlineText;
        break;
      }

      case 'term': {
        // Wrap term content in quotes for clarity.
        const termText = parseNodeInReadingOrder(child).trim();
        output += ` "${termText}"`;
        break;
      }

      case 'paragraph': {
        const paraText = parseParagraph(child);
        output += paraText;
        break;
      }

      case 'text': {
        // If <text> has child nodes, skip child._ because it's probably duplicated
        if (child.$$ && child.$$.length > 0) {
          output += parseNodeInReadingOrder(child);
        } else if (typeof child._ === 'string') {
          // Only use child._ if there are no children
          output += child._;
        }
        break;
      }

      case 'enum':
        if (typeof child._ === 'string') {
          const enumText = child._.trim();
          output += ` ${enumText} `;
        }
        break;

      case 'header': {
        // Remove newlines/spaces so headings stay on one line
        if (child.$$) {
          output += ' ' + parseNodeInReadingOrder(child).replace(/\s+/g, ' ');
        }
        break;
      }

      // -----------------------------------------------------------------
      // 5) Sub-structural nodes, like <paragraph>, <subsection>, <section>, <preamble>, etc.
      //    We parse them recursively, then add them with a space or newline, etc.
      // -----------------------------------------------------------------
      case 'subparagraph':
      case 'item':
      case 'subsection':
      case 'section':
      case 'preamble':
      case 'header':
      default: {
        // For these structural nodes, parse recursively
        // and separate them with a space so we don't jam words together.
        const nestedText = parseNodeInReadingOrder(child);
        output += ` ${nestedText}`;
        break;
      }
    }
  }

  // Clean up extra spacing around parentheses
  output = output.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  // Optionally, post-process the output to condense extra whitespace:
  return output.replace(/\s+/g, ' ').trim();
}

/**
 * parseParagraph: specifically handle <paragraph> nodes
 */
function parseParagraph(node: any): string {
  let out = '';
  if (!node.$$) return out;

  let i = 0;
  while (i < node.$$.length) {
    const child = node.$$[i];

    // Handle <enum> nodes directly
    if (child['#name'] === 'enum' && typeof child._ === 'string') {
      out += ` ${child._}`;
      i++;
      continue;
    }

    // Detect a <header> followed by a <text> starting with "The term"
    if (child['#name'] === 'header' && typeof child._ === 'string') {
      const headerText = child._.trim();
      const next = node.$$[i + 1];
      if (
        next &&
        next['#name'] === 'text' &&
        typeof next._ === 'string' &&
        next._.trim().startsWith('The term')
      ) {
        let textContent = next._.trim();
        // Replace the first occurrence of "The term" with 'The term "Header"'
        out +=
          ' ' + textContent.replace(/^The term/, `The term "${headerText}"`);
        i += 2; // Skip both the header and the text we've just processed
        continue;
      } else {
        // If not matching the pattern, just append the header
        out += ` ${headerText}`;
        i++;
        continue;
      }
    }

    // Handle <text> nodes
    if (child['#name'] === 'text') {
      if (child.$$) {
        out += ' ' + parseNodeInReadingOrder(child);
      } else if (typeof child._ === 'string') {
        out += ' ' + child._;
      }
    }
    // Handle <subparagraph> nodes
    else if (child['#name'] === 'subparagraph') {
      out += ' ' + parseNodeInReadingOrder(child);
    }
    // Recursively handle other nodes
    else {
      if (child.$$) {
        out += ' ' + parseParagraph(child);
      }
    }
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------
//                       Helper Functions
// ---------------------------------------------------------------------

/**
 * findShortTitle: if the section is titled "Short title", fetch from <short-title> inside <quote>.
 */
function findShortTitle(sectionNode: any): string {
  const quotes = findAllNodes(sectionNode, 'quote');
  for (const q of quotes) {
    if (q.$$) {
      // find <short-title>
      const stChild = q.$$.find(
        (child: any) => child['#name'] === 'short-title'
      );
      if (stChild) {
        if (stChild.$$) return parseNodeInReadingOrder(stChild).trim();
      }
    }
  }
  return '';
}

/**
 * findDirectText: for a <section> that has no <subsection>, return <text> content
 */
function findDirectText(sectionNode: any): string {
  if (!sectionNode.$$) return '';
  const textNode = sectionNode.$$.find(
    (child: any) => child['#name'] === 'text'
  );
  if (!textNode) return '';

  let output = '';
  // Also parse any nested children (paragraph, subparagraph, etc.)
  if (textNode.$$) {
    output += ' ' + parseNodeInReadingOrder(textNode);
  }

  return output.trim().replace(/\s+/g, ' ');
}

/**
 * findAllNodes: recursively gather all nodes of a given name
 */
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
