const fs = require('fs').promises;
const path = require('path');

async function formatForDemo() {
  // Read the COLO 2 extraction results
  const resultsPath = path.join(__dirname, '../extraction_results/colo2_extraction_results.json');
  const data = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
  
  // Format for the demo page - take first 20 signs for better performance
  const formattedData = {
    pdfFile: data.pdfFile,
    pageNumber: 1,
    imageSize: {
      width: 6048,
      height: 4320
    },
    extractedSigns: data.extractedSigns.slice(0, 20).map(sign => ({
      text: sign.text,
      signType: sign.signType,
      boundingBox: sign.boundingBox,
      confidence: sign.confidence
    })),
    timestamp: data.timestamp,
    processingTime: 5000
  };
  
  console.log('Formatted extraction data for demo:');
  console.log('=====================================');
  console.log(`PDF: ${formattedData.pdfFile}`);
  console.log(`Signs: ${formattedData.extractedSigns.length} (showing first 20 of ${data.signsExtracted})`);
  console.log('\nSigns included:');
  formattedData.extractedSigns.forEach(sign => {
    console.log(`  - ${sign.text} at (${sign.boundingBox.x_percentage.toFixed(1)}%, ${sign.boundingBox.y_percentage.toFixed(1)}%)`);
  });
  
  console.log('\n\nReady to paste into demo page:');
  console.log('--------------------------------');
  console.log(JSON.stringify(formattedData, null, 2));
  
  // Save to file
  const outputPath = path.join(__dirname, '../extraction_results/demo_data.json');
  await fs.writeFile(outputPath, JSON.stringify(formattedData, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
}

formatForDemo().catch(console.error);