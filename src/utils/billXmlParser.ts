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
      const topLevelHeading = buildSectionHeading(sectionEnum, sectionHeader);

      // see if <section> has <subsection> children
      const subsecs = sec.$$.filter((ch: any) => ch['#name'] === 'subsection');
      if (subsecs.length === 0) {
        // parse entire <section> as one chunk
        let content = '';
        if (sectionHeader.toLowerCase() === 'short title') {
          // Special handling for "Short title"
          content = findShortTitle(sec);
        } else {
          // If it’s not a short title, just look for <text> or child nodes
          content = findDirectText(sec);
        }

        results.push({ heading: topLevelHeading, content });
      } else {
        // multiple subsections => one chunk per <subsection>
        for (const sub of subsecs) {
          const { subEnum, subHeader } = extractSubsectionHeading(sub);
          const subHeading = buildSubsectionHeading(
            topLevelHeading,
            subEnum,
            subHeader
          );

          // Gather text from the subsection
          let content = parseChildrenInOrder(sub);

          // Remove leading subsection enumeration and header if present
          const prefix = `${subEnum} ${subHeader}`.trim();
          if (content.startsWith(prefix)) {
            content = content.substring(prefix.length).trim();
          }

          if (content.length > 20) {
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
  if (hChild && typeof hChild._ === 'string') {
    sectionHeader = hChild._.trim();
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
  if (hChild && typeof hChild._ === 'string') {
    subHeader = hChild._.trim();
  }

  return { subEnum, subHeader };
}

/**
 * Build a heading like "SEC. 2. Repayment of Federal financial assistance..."
 */
function buildSectionHeading(
  sectionEnum: string,
  sectionHeader: string
): string {
  if (!sectionEnum && !sectionHeader) return '';
  if (sectionEnum.toLowerCase().startsWith('sec.')) {
    return `${sectionEnum} ${sectionHeader}`.trim();
  }
  return `SEC. ${sectionEnum} ${sectionHeader}`.trim();
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
 * parseChildrenInOrder: read node.$$ (the array of child objects),
 * and build a single string, preserving the order in which they appear.
 */
function parseChildrenInOrder(node: any): string {
  if (!node.$$) return '';

  let out = '';
  for (const child of node.$$) {
    switch (child['#name']) {
      case '_':
        // Plain text content
        out += child._;
        break;

      case 'quote': {
        // A <quote> might contain <short-title> or text
        const quoteText = parseChildrenInOrder(child).trim();
        // Wrap quote text in quotation marks
        if (quoteText) out += `"${quoteText}"`;
        break;
      }

      case 'term':
        // e.g. <term>SomeTerm</term>
        out += ' ' + parseChildrenInOrder(child);
        break;

      case 'short-title': {
        // e.g. <short-title>Some Act Title</short-title>
        if (typeof child._ === 'string') {
          out += child._;
        } else if (child.$$) {
          out += parseChildrenInOrder(child);
        }
        break;
      }

      case 'paragraph':
        out += ' ' + parseParagraph(child);
        break;

      case 'text': {
        // <text> can often have direct text in child._ or nested children
        if (typeof child._ === 'string') {
          out += ' ' + child._;
        }
        if (child.$$) {
          out += ' ' + parseChildrenInOrder(child);
        }
        break;
      }

      case 'clause':
      case 'subparagraph':
      case 'item':
      case 'subsection':
      case 'section':
      case 'preamble': {
        // Recursively parse
        out += ' ' + parseChildrenInOrder(child);
        break;
      }

      case 'enum':
        if (typeof child._ === 'string') {
          out += ` ${child._}`;
        }
        break;

      case 'header':
        if (typeof child._ === 'string') {
          out += ' ' + child._;
        }
        break;

      default:
        // Possibly handle <table>, <list>, etc. if you have them
        if (child.$$) {
          out += ' ' + parseChildrenInOrder(child);
        }
        break;
    }
  }

  // Clean up extra spaces
  return out.trim().replace(/\s+/g, ' ');
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
      if (typeof child._ === 'string') out += ' ' + child._;
      if (child.$$) {
        out += ' ' + parseChildrenInOrder(child);
      }
    }
    // Handle <subparagraph> nodes
    else if (child['#name'] === 'subparagraph') {
      out += ' ' + parseChildrenInOrder(child);
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
        // if direct text
        if (typeof stChild._ === 'string') return stChild._.trim();
        // or parse children
        if (stChild.$$) return parseChildrenInOrder(stChild).trim();
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
  // If there's direct text in textNode._, append it
  if (typeof textNode._ === 'string') {
    output += textNode._;
  }
  // Also parse any nested children (paragraph, subparagraph, etc.)
  if (textNode.$$) {
    output += ' ' + parseChildrenInOrder(textNode);
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
