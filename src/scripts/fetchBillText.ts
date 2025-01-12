// src/scripts/fetchBillText.ts

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { parseStringPromise } from 'xml2js';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Minimal mapping from your Bill's `billType` to Congress.gov endpoint’s format
// Adjust these as needed based on your project’s naming.
const BILL_TYPE_MAP: Record<string, string> = {
  house_bill: 'hr',
  senate_bill: 's',
  house_concurrent_resolution: 'hconres',
  house_joint_resolution: 'hjres',
  house_resolution: 'hres',
  senate_concurrent_resolution: 'sconres',
  senate_joint_resolution: 'sjres',
  senate_resolution: 'sres',
};

/**
 * Main function to fetch the *latest* text for bills that don’t yet have text
 */
export async function fetchBillTextFunction() {
  try {
    // 1. Find bills that have no associated text yet
    const billsNeedingText = await prisma.bill.findMany({
      where: {
        billId: 'house_bill-9326-118',
      },
      // limit the number of bills each run to manage rate limits
      take: 10,
    });
    // const billsNeedingText = await prisma.bill.findMany({
    //   where: {
    //     billTexts: {
    //       none: {},
    //     },
    //   },
    //   // limit the number of bills each run to manage rate limits
    //   take: 10,
    // });

    console.log(`Found ${billsNeedingText.length} bills needing text.`);

    // 2. Iterate through each bill and retrieve text
    for (const bill of billsNeedingText) {
      try {
        const { congress, apiBillType, billNumber } = parseBillId(bill.billId);
        if (!congress || !apiBillType || !billNumber) {
          console.warn(
            `Skipping bill ${bill.billId} — unable to parse congress/billType/billNumber.`
          );
          continue;
        }

        console.log(`Fetching text versions for Bill: ${bill.billId}`);

        // 2a. Get list of text versions from Congress.gov
        const versionsResponse = await axios.get(
          `https://api.congress.gov/v3/bill/${congress}/${apiBillType}/${billNumber}/text`,
          {
            params: {
              api_key: process.env.CONGRESS_DOT_GOV_API_KEY,
            },
          }
        );

        const textVersions = versionsResponse.data?.textVersions;
        if (
          !textVersions ||
          !Array.isArray(textVersions) ||
          textVersions.length === 0
        ) {
          console.warn(`No textVersions found for ${bill.billId}.`);
          continue;
        }

        // 2b. Select the latest version by date
        const sortedByDateDesc = textVersions
          .filter((tv: any) => !!tv.date)
          .sort((a: any, b: any) => {
            const aDate = dayjs(a.date);
            const bDate = dayjs(b.date);
            return bDate.valueOf() - aDate.valueOf();
          });
        const latestVersion =
          sortedByDateDesc.length > 0 ? sortedByDateDesc[0] : textVersions[0];

        // We specifically want "Formatted XML" for best structure
        const xmlFormat = latestVersion.formats.find(
          (fmt: any) => fmt.type === 'Formatted XML'
        );
        const textFormat = latestVersion.formats.find(
          (fmt: any) => fmt.type === 'Formatted Text'
        );
        if (!xmlFormat?.url) {
          console.warn(
            `No Formatted XML URL found for ${bill.billId}, skipping.`
          );
          continue;
        }

        console.log(
          `Fetching XML for bill ${bill.billId} from: ${xmlFormat.url}`
        );
        const { data: rawXml } = await axios.get(xmlFormat.url);
        const { data: rawText } = await axios.get(textFormat.url);

        // Quick sanity check
        if (!rawXml || typeof rawXml !== 'string') {
          console.warn(`XML response was empty for ${bill.billId}. Skipping.`);
          continue;
        }

        console.log(`Fetched ${rawXml.length} chars of XML for ${bill.billId}`);

        // (Optional) Step 2A: Store RAW XML in DB or S3
        // If you have a BillXml model or a column in BillText for rawXml, do something like:
        // await prisma.billXml.create({ data: { billId: bill.id, xml: rawXml } });
        // For demonstration, we’ll parse it next:

        // 3. Parse the XML -> JS object
        let xmlObj: any;
        try {
          xmlObj = await parseStringPromise(rawXml);
        } catch (e: any) {
          console.error(`Failed to parse XML for ${bill.billId}:`, e.message);
          continue;
        }

        // 4. Extract text chunks from the parsed XML
        //    We'll do a simple approach: loop over <section> elements, build text from them.
        //    The structure can vary depending on the DTD. Let’s assume something like <bill><legis-body><section>...
        const sections = extractSections(xmlObj);

        debugger;
        // 5. For each section, we store in BillText
        //    In an advanced scenario, you'd chunk further by paragraph if sections are huge.
        //    Or store them in a vector DB.
        for (const sec of sections) {
          const { heading, content } = sec;
          // We skip empty content
          if (!content || content.trim().length < 20) {
            continue;
          }

          // Create a BillText record
          await prisma.billText.create({
            data: {
              billId: bill.id, // numeric PK from Bill
              heading: heading, // optional field if you have it in your schema
              text: content,
            },
          });
        }

        // 6. Mark success
        console.log(
          `Saved ${sections.length} sections of text for Bill ${bill.billId}`
        );
      } catch (error: any) {
        console.error(`Error processing bill ${bill.billId}:`, error?.message);
      }

      // 5. Respect rate limits — 5,000 requests/hour => ~1.39 requests/sec
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log('Finished fetching bill texts.');
  } catch (error: any) {
    console.error('Error in fetchBillText:', error?.message);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Parses a billId like "house_bill-30-119" into objects for the Congress.gov endpoint.
 * Example returns:
 * {
 *    congress: 119,
 *    apiBillType: "hr",
 *    billNumber: 30
 * }
 */
function parseBillId(billId: string): {
  congress: number | null;
  apiBillType: string | null;
  billNumber: number | null;
} {
  try {
    const parts = billId.split('-');
    if (parts.length < 3) {
      return { congress: null, apiBillType: null, billNumber: null };
    }

    const [billTypeRaw, numberRaw, congressRaw] = parts;
    const apiBillType = BILL_TYPE_MAP[billTypeRaw] || null;
    const billNumber = parseInt(numberRaw, 10) || null;
    const congress = parseInt(congressRaw, 10) || null;

    return { congress, apiBillType, billNumber };
  } catch (error) {
    console.error('parseBillId error:', (error as Error).message);
    return { congress: null, apiBillType: null, billNumber: null };
  }
}

// ---------------------------------------------------------------------
//                       SECTION EXTRACTION
// ---------------------------------------------------------------------

/**
 * Top-level dispatch function that figures out whether the doc is <bill>, <resolution>, etc.
 * Returns an array of { heading, content } for each top-level section in the doc.
 */
export function extractSections(
  xmlObj: any
): { heading: string; content: string }[] {
  // If it's a <bill>:
  if (xmlObj.bill) {
    return extractBillSections(xmlObj.bill);
  }

  // If it's a <resolution>:
  if (xmlObj.resolution) {
    return extractResolutionSections(xmlObj.resolution);
  }

  // Potentially handle other doc types (like <amendment>, <usc-chapter>), etc.
  console.warn('Unknown top-level tag(s):', Object.keys(xmlObj));
  return [];
}

/**
 * Extract sections from a <bill> node, which typically has:
 *   <bill>
 *     <legis-body>
 *       <section> ... </section>
 *       <section> ... </section>
 *     </legis-body>
 *   </bill>
 *
 * We'll return an array of { heading, content }.
 * But each <section> might yield multiple items if it has multiple <subsection>.
 */
function extractBillSections(
  billNode: any
): { heading: string; content: string }[] {
  const results: { heading: string; content: string }[] = [];
  const legisBodies = asArray(billNode['legis-body']);

  for (const lb of legisBodies) {
    // <section> may exist
    const rawSections = asArray(lb.section);

    for (const sec of rawSections) {
      // Build the top-level "SEC. 2" style heading
      // often in <enum> plus <header>
      const sectionEnum = sec.enum?.[0]?.trim() || '';
      const sectionHeader = sec.header?.[0]?.trim() || '';
      // e.g. "SEC. 2. Repayment of Federal financial assistance..."

      // Combine them into something like "SEC. 2 Repayment of Federal financial assistance..."
      // or keep them separate if you prefer
      const topLevelHeading = buildSectionHeading(sectionEnum, sectionHeader);

      // Now let's see if the <section> has <subsection>
      const subsecs = asArray(sec.subsection);

      // If there are no <subsection> tags, we can treat the entire <section> as one chunk
      if (subsecs.length === 0) {
        // Just gather everything from the <section> itself
        const fullText = extractSectionContent(
          sec,
          /* topLevelHeading */ topLevelHeading
        );
        results.push({
          heading: topLevelHeading,
          content: fullText,
        });
        continue;
      }

      // If we DO have <subsection>, let's create a chunk for each one
      // e.g. (a), (b), (c)...
      for (const sub of subsecs) {
        const subEnum = sub.enum?.[0]?.trim() || '';
        const subHeader = sub.header?.[0]?.trim() || '';

        // Build something like "SEC. 2 (a) In General."
        const subHeading = buildSubsectionHeading(
          topLevelHeading,
          subEnum,
          subHeader
        );

        // Recursively gather all text from this <subsection> (including <paragraph>, <clause>, etc.)
        let content = recursivelyGatherAllText(sub);

        // Remove the leading enumeration if it matches subEnum
        //    e.g., if subEnum = "(a)" and content starts with "(a)"
        //    This regex matches something like "(a) " or "(a)."
        if (subEnum) {
          // subEnum is usually "(a)" or "(b)", so we can do a small regex:
          // We only remove it if it’s the *very start* of content.
          const safeEnum = subEnum.replace(/[\(\)]/g, '\\$&'); // escape parens for regex
          const re = new RegExp(`^${safeEnum}\\s*`, 'i');
          // ^\(a\)\s* basically
          content = content.replace(re, '');
        }

        // Only push if there's enough text to be interesting
        if (content.length > 20) {
          results.push({
            heading: subHeading,
            content,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Build a heading like "SEC. 2. Repayment of Federal financial assistance by shipyards..."
 * or "SEC. 2 (Definitions.)" etc.
 */
function buildSectionHeading(
  sectionEnum: string,
  sectionHeader: string
): string {
  // If the enum is "2." we might do "SEC. 2" or "SEC. 2."
  // Up to you how you format it:
  if (!sectionEnum && !sectionHeader) return '';
  if (sectionEnum.toLowerCase().startsWith('sec.')) {
    // Already has "SEC. X" form
    return `${sectionEnum} ${sectionHeader}`.trim();
  }
  // Otherwise do "SEC. 2 (header)"
  return `SEC. ${sectionEnum} ${sectionHeader}`.trim();
}

/**
 * Build a heading for a subsection, e.g. "SEC. 2 (a) In General."
 * If subEnum = "a)", subHeader = "In General."
 */
function buildSubsectionHeading(
  topLevelHeading: string,
  subEnum: string,
  subHeader: string
): string {
  let shortHeading = topLevelHeading;

  // Insert subsection enumeration
  if (subEnum) {
    // subEnum is typically "(a)"
    // We can remove the parens if we’re adding them ourselves:
    const subEnumClean = subEnum.replace(/^\(/, '').replace(/\)$/, '');
    // Then produce something like: "SEC. 2. Repayment ... (a)"
    shortHeading += ` (${subEnumClean})`;
  }

  // Insert subHeader if it exists
  if (subHeader) {
    shortHeading += ` ${subHeader}`;
  }

  return shortHeading;
}

/**
 * Extract sections from a <resolution> node, which typically has:
 *   <resolution>
 *     <preamble> ... </preamble>  (optional)
 *     <resolution-body>
 *       <section> ... </section>
 *     </resolution-body>
 *   </resolution>
 */
function extractResolutionSections(
  resNode: any
): { heading: string; content: string }[] {
  const results: { heading: string; content: string }[] = [];

  // 1. If there's a <preamble> with <whereas> sub-elements
  //    You might treat each "whereas" as a separate chunk or combine them.
  //    This is optional; some resolutions don't have <preamble>.
  const preambles = asArray(resNode.preamble);
  for (const pm of preambles) {
    // each <whereas>
    const whereases = asArray(pm.whereas);
    for (const w of whereases) {
      const chunkText = recursivelyGatherAllText(w);
      // We label them “Whereas” or something:
      results.push({ heading: 'Whereas', content: chunkText });
    }
  }

  // 2. The <resolution-body> -> <section> approach
  const resBodies = asArray(resNode['resolution-body']);
  for (const rb of resBodies) {
    const rawSections = asArray(rb.section);
    for (const sec of rawSections) {
      const heading = sec.header?.[0] || `Section ${sec.enum?.[0] || ''}`;
      const content = extractSectionContent(sec);

      results.push({ heading, content });
    }
  }

  return results;
}

/**
 * Recursively extracts text from a <section> object by looking at <text>,
 * <paragraph>, <subsection>, <clause>, etc.
 * Returns a single big string that is the concatenation of everything in that section.
 *
 * If you want multiple sub-chunks (e.g. one chunk per <paragraph>), you'd do it differently.
 */
function extractSectionContent(
  sectionObj: any,
  topLevelHeading?: string
): string {
  const heading = sectionObj.header?.[0] || '';

  // -------------------------------------------------------------
  // SPECIAL CASE: "Short title" section => extract only <short-title>
  // -------------------------------------------------------------
  if (heading.toLowerCase().includes('short title')) {
    const maybeShortTitle = extractShortTitleFromSection(sectionObj);
    if (maybeShortTitle) {
      return maybeShortTitle;
    }
    // If we fail to find <short-title>, we could return empty or fallback
    // return '';
    // or continue to normal extraction
  }

  let result = '';

  // 1. <text> array is often direct text
  if (sectionObj.text) {
    result += ' ' + extractTextFromArray(sectionObj.text);
  }

  // 2. <paragraph> array
  if (sectionObj.paragraph) {
    const paragraphs = asArray(sectionObj.paragraph);
    for (const p of paragraphs) {
      // paragraphs can also have <text>, <subparagraph>, <clause>...
      result += ' ' + recursivelyGatherAllText(p);
    }
  }

  // 3. <clause>, <subparagraph>, <item>, etc.
  //    Add more if you see them in the data:
  if (sectionObj.clause) {
    const clauses = asArray(sectionObj.clause);
    for (const c of clauses) {
      result += ' ' + recursivelyGatherAllText(c);
    }
  }

  // 4. If <section> is nested inside <section> (sometimes happens)
  if (sectionObj.section) {
    const nestedSections = asArray(sectionObj.section);
    for (const ns of nestedSections) {
      result += ' ' + extractSectionContent(ns);
    }
  }

  return result.trim();
}

/**
 * Recursively gather text from any node that might have <text>, <paragraph>,
 * <subsection>, <clause>, <subparagraph>, etc. This is a fallback
 * if we suspect there's a deeper tree structure we haven't explicitly
 * handled in extractSectionContent().
 */
function recursivelyGatherAllText(node: any): string {
  let acc = '';

  // If node has <text>, collect it
  if (node.text) {
    acc += ' ' + extractTextFromArray(node.text);
  }

  // If node has <paragraph>, do the same
  if (node.paragraph) {
    const paragraphs = asArray(node.paragraph);
    for (const p of paragraphs) {
      acc += ' ' + recursivelyGatherAllText(p);
    }
  }

  // If node has <subsection>
  if (node.subsection) {
    const subsecs = asArray(node.subsection);
    for (const ss of subsecs) {
      acc += ' ' + recursivelyGatherAllText(ss);
    }
  }

  // If node has <clause>
  if (node.clause) {
    const clauses = asArray(node.clause);
    for (const c of clauses) {
      acc += ' ' + recursivelyGatherAllText(c);
    }
  }

  // If node has <subparagraph>, <item>, etc., you can add them as well:
  if (node.subparagraph) {
    const sps = asArray(node.subparagraph);
    for (const sp of sps) {
      acc += ' ' + recursivelyGatherAllText(sp);
    }
  }

  // If <section> is nested (rare, but possible)
  if (node.section) {
    const nestedSections = asArray(node.section);
    for (const ns of nestedSections) {
      acc += ' ' + extractSectionContent(ns); // or recursivelyGatherAllText(ns)
    }
  }

  if (node.term) {
    const termArr = asArray(node.term);
    for (const t of termArr) {
      // t might be an object with `_` or a string
      acc += ` ${extractTextFromArray([t])}`;
    }
  }

  if (node.enum && node.enum[0]) {
    acc = ` ${node.enum[0]}` + acc;
  }

  return acc.trim();
}

/**
 * If the section is "Short title," look specifically for <short-title>.
 * Example XML:
 *   <section ...>
 *     <header>Short title</header>
 *     <text>
 *       This Act may be cited as the
 *       <quote>
 *         <short-title>Supporting National Security with Spectrum Act</short-title>
 *       </quote>.
 *     </text>
 *   </section>
 */
function extractShortTitleFromSection(sectionObj: any): string | null {
  // Check if <text> array exists
  if (!sectionObj.text) return null;
  const textArr = asArray(sectionObj.text);

  for (const textItem of textArr) {
    // textItem could be a string or an object with child nodes

    // If it's an object, see if it has .quote
    if (textItem && typeof textItem === 'object') {
      // quote might be an array or single object
      const quotes = asArray(textItem.quote);
      for (const q of quotes) {
        if (q && q['short-title']) {
          const stArr = asArray(q['short-title']);
          // Usually .['short-title'] is a string array or an object with _
          if (stArr.length > 0) {
            // If it's just a string, return it
            if (typeof stArr[0] === 'string') {
              return stArr[0].trim();
            }
            // If it's an object with an underscore
            else if (stArr[0]._) {
              return stArr[0]._.trim();
            }
          }
        }
      }
    }

    // If textItem is a string that *happens* to contain "short-title" for some reason, you'd parse differently
    // but typically <short-title> is a separate node in <quote>.
  }

  return null;
}

/**
 * Flatten an array of text nodes/objects into a single string.
 * For example, "text": ["Some text", { _: "some text" }]
 */
function extractTextFromArray(arr: any[]): string {
  let result = '';

  for (const item of arr) {
    if (typeof item === 'string') {
      // It's a raw string
      result += ' ' + item;
    } else if (item && typeof item === 'object') {
      // Often xml2js puts text under the `_` key
      if (typeof item._ === 'string') {
        result += ' ' + item._;
      }

      // If item.quote is present, we want it to appear immediately
      if (item.quote) {
        debugger;
        const quotes = asArray(item.quote);
        for (const q of quotes) {
          const quoted = extractTextFromArray([q]);
          result += ` "${quoted}"`;
        }
      }

      if (item.term) {
        const termArr = asArray(item.term);
        for (const t of termArr) {
          // t might be string or object
          result += ' ' + extractTextFromArray([t]);
        }
      }

      // If the item has child tags, you could recursively parse them, but typically
      // <text> array items are either strings or { _: 'some text' }.
    }
  }

  return result.trim();
}

/**
 * Helper that ensures we treat the given field as an array
 * even if it’s a single object.
 */
function asArray(val: any): any[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// For direct invocation:
if (require.main === module) {
  fetchBillTextFunction();
}
