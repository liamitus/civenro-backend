// __tests__/utils/billXmlParser.test.ts
import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { BillXmlParser } from '../../src/utils/billXmlParser';

describe('BillXmlParser', () => {
  const xmlFixturesDir = path.join(__dirname, '..', 'fixtures', 'xml');
  const jsonFixturesDir = path.join(__dirname, '..', 'fixtures', 'json');

  /**
   * If you want to test multiple files in a single suite, you can
   * store them in an array or read the directory dynamically.
   */
  const testCases = [
    {
      name: 'H_R9326_Introduced_in_House',
      xmlFile: 'H_R9326_Introduced_in_House.xml',
      jsonFile: 'H_R9326_Introduced_in_House.json',
    },
    // Add more fixture pairs here as needed
  ];

  testCases.forEach(({ name, xmlFile, jsonFile }) => {
    it(`should correctly parse fixture: ${name}`, async () => {
      // 1. Read the XML content
      const xmlPath = path.join(xmlFixturesDir, xmlFile);
      const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

      // 2. Convert XML -> JS object
      const xmlObj = await parseStringPromise(xmlContent, {
        preserveChildrenOrder: true,
        explicitChildren: true,
      });

      // 3. Extract the sections using your parser
      //    - If you prefer BillTextService, do:
      //    // const sections = await BillTextService.parseXmlIntoSections(xmlContent);
      //    const sections = BillTextService.parseXmlIntoSections(xmlContent);
      //    - Otherwise, if you’re only testing the parser:
      const sections = await BillXmlParser.extractSections(xmlObj);

      // 4. Compare against the expected JSON
      const jsonPath = path.join(jsonFixturesDir, jsonFile);
      if (!fs.existsSync(jsonPath)) {
        // If the JSON file does not exist, write it out
        fs.writeFileSync(jsonPath, JSON.stringify(sections, null, 2), 'utf-8');
        throw new Error(
          `Expected JSON file did not exist; created it at ${jsonPath}. ` +
            `Please review it and adjust if necessary. Then rerun the tests.`
        );
      }

      // 5. Read the expected JSON
      const expectedJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      // 6. Use Jest’s .toEqual() to do a deep compare
      expect(sections).toEqual(expectedJson);
    });
  });
});
