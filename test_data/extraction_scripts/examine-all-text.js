// This script will examine all raw text detected by Google Vision
// to find potential sign numbers that were missed by our filtering

const fs = require('fs');

console.log('=== Examining All Google Vision Text Annotations ===');
console.log('Looking for 4-digit numbers and sign codes that match the expected patterns...\n');

// We need to run the extraction script again but capture ALL text, not just filtered sign numbers
// For now, let's check if we have access to the raw Vision API response

const resultsFile = 'test_data/extraction_results/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1_results.json';

if (fs.existsSync(resultsFile)) {
  const rawResult = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  
  console.log('Current filtered results show only these sign numbers:');
  rawResult.extractedSigns.forEach(sign => {
    console.log(`- "${sign.text}" at (${sign.boundingBox.x_percentage.toFixed(1)}%, ${sign.boundingBox.y_percentage.toFixed(1)}%)`);
  });
  
  console.log('\nThe extraction script reported finding 78 total text annotations.');
  console.log('We need to modify the extraction to capture ALL text for analysis.');
} else {
  console.log('Raw results file not found.');
}

console.log('\n=== Recommendation ===');
console.log('We should modify the extraction script to:');
console.log('1. Save all raw text annotations (not just filtered sign numbers)');
console.log('2. Filter by size characteristics matching your example');
console.log('3. Look for patterns like: 2001, 2001.1, 2002.1, etc.');
console.log('4. Focus on text in the main plan area (x < 80%) not the legend area');