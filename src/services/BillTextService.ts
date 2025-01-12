// src/services/BillTextService.ts

import axios from 'axios';
import dayjs from 'dayjs';
import { parseStringPromise } from 'xml2js';
import { BillXmlParser } from '../utils/billXmlParser';

interface TextVersion {
  date: string;
  formats: {
    type: string;
    url: string;
  }[];
}

export class BillTextService {
  /**
   * Fetch the list of available text versions and return the latest by date.
   */
  static async fetchLatestTextVersion(
    congress: number,
    apiBillType: string,
    billNumber: number
  ): Promise<TextVersion | null> {
    try {
      const versionsResponse = await axios.get(
        `https://api.congress.gov/v3/bill/${congress}/${apiBillType}/${billNumber}/text`,
        {
          params: {
            api_key: process.env.CONGRESS_DOT_GOV_API_KEY,
          },
        }
      );

      const textVersions = versionsResponse.data?.textVersions as TextVersion[];
      if (!textVersions || textVersions.length === 0) {
        return null;
      }

      // Pick the latest by date
      const sortedByDateDesc = textVersions
        .filter((tv) => !!tv.date)
        .sort((a, b) => {
          const aDate = dayjs(a.date);
          const bDate = dayjs(b.date);
          return bDate.valueOf() - aDate.valueOf();
        });

      return sortedByDateDesc.length > 0
        ? sortedByDateDesc[0]
        : textVersions[0];
    } catch (error: any) {
      console.error('Failed to fetch text versions:', error.message);
      return null;
    }
  }

  /**
   * Download the "Formatted XML" and "Formatted Text" content.
   */
  static async downloadTextFormats(
    latestVersion: TextVersion,
    billId: string
  ): Promise<{ rawXml: string | null; rawText: string | null }> {
    // We specifically want "Formatted XML" for best structure
    const xmlFormat = latestVersion.formats.find(
      (fmt) => fmt.type === 'Formatted XML'
    );
    const textFormat = latestVersion.formats.find(
      (fmt) => fmt.type === 'Formatted Text'
    );

    if (!xmlFormat?.url) {
      console.warn(`No Formatted XML URL found for ${billId}, skipping.`);
      return { rawXml: null, rawText: null };
    }

    try {
      console.log(`Fetching XML for bill ${billId} from: ${xmlFormat.url}`);
      const { data: rawXml } = await axios.get(xmlFormat.url);

      let rawText: string | null = null;
      if (textFormat?.url) {
        const { data } = await axios.get(textFormat.url);
        rawText = data;
      }

      return {
        rawXml: typeof rawXml === 'string' ? rawXml : null,
        rawText: typeof rawText === 'string' ? rawText : null,
      };
    } catch (error: any) {
      console.error(
        `Error downloading text formats for ${billId}:`,
        error.message
      );
      return { rawXml: null, rawText: null };
    }
  }

  /**
   * Parse the XML -> JS object, then extract sections using our BillXmlParser.
   */
  static async parseXmlIntoSections(rawXml: string) {
    let xmlObj: any;
    try {
      xmlObj = await parseStringPromise(rawXml, {
        preserveChildrenOrder: true,
        explicitChildren: true,
      });
    } catch (e: any) {
      console.error('Failed to parse XML:', e.message);
      return [];
    }

    // Now delegate to our parser that knows how to handle <bill>, <resolution>, etc.
    return BillXmlParser.extractSections(xmlObj);
  }
}
