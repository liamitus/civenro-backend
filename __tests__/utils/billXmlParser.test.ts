// __tests__/utils/billXmlParser.test.ts
import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { BillTextService } from '../../src/services/BillTextService';
import { BillXmlParser } from '../../src/utils/billXmlParser';

describe('BillXmlParser', () => {
  const xmlFixturesDir = path.join(__dirname, '..', 'fixtures', 'xml');
  const jsonFixturesDir = path.join(__dirname, '..', 'fixtures', 'json');

  // Read the directory for .xml files
  const xmlFiles = fs
    .readdirSync(xmlFixturesDir)
    .filter((file) => file.endsWith('.xml'));

  xmlFiles.forEach((xmlFile) => {
    it(`should correctly parse fixture: ${xmlFile}`, async () => {
      // 1. Read the XML content
      const xmlPath = path.join(xmlFixturesDir, xmlFile);
      const xmlContent = fs.readFileSync(xmlPath, 'utf-8');

      // 3. Extract the sections using your parser
      const sections = await BillTextService.parseXmlIntoSections(xmlContent);

      // Derive the JSON filename from the XML filename
      const baseName = path.parse(xmlFile).name; // e.g. H118_HR_9326_IH
      const jsonFile = `${baseName}.json`;
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
