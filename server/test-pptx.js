// ES Module test script
import { parsePPTX, parseSlidesByPPTX } from "./utils/pptxParser.js";
import fs from 'fs';
import path from 'path';

console.log("PPTX parser imported successfully");
console.log("Functions available:", {
  parsePPTX: typeof parsePPTX,
  parseSlidesByPPTX: typeof parseSlidesByPPTX,
});

console.log("Note: Using officeparser for more reliable PPTX extraction");

console.log(
  "PPTX parser ready for use - implement the following in your code:"
);
console.log(`
1. Upload PPTX files to Supabase storage
2. Extract text using parsePPTX() or parseSlidesByPPTX()
3. Process the extracted text with AI services
4. Return the results to the client
`);

// Uncomment to test with a local PPTX file if available
/*
const testFile = './test.pptx';
if (fs.existsSync(testFile)) {
  console.log(`\nTesting with local file: ${testFile}`);
  const buffer = fs.readFileSync(testFile);
  
  // Test the parser
  parsePPTX(buffer)
    .then(text => {
      console.log("\nExtracted text sample:");
      console.log(text.substring(0, 300) + '...');
      console.log(`\nTotal character count: ${text.length}`);
    })
    .catch(err => {
      console.error("Error testing PPTX parser:", err);
    });
} else {
  console.log("\nNo test file found. To test with a real PPTX file:");
  console.log("1. Add a test.pptx file to the server directory");
  console.log("2. Uncomment the test code in test-pptx.js");
  console.log("3. Run 'node test-pptx.js' again");
}
*/
