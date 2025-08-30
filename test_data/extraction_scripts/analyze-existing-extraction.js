// Since we know the original extraction found 78 text annotations but only returned 4 signs,
// let's modify the existing extraction to be less restrictive and see what else was found

const fs = require('fs');

console.log('=== Analysis of Current Extraction Results ===\n');

// Let's examine what patterns we should be looking for based on the expected characteristics
console.log('Expected sign number characteristics from your example:');
console.log('- Numbers like: 2001, 2001.1, 2001.2, 2002.1, 2002, 2003, 2004');
console.log('- Sign codes like: BID-1.2, ID-5.3, BC-1.9A, BC-1.0, FI-4.1, P-5.2');
console.log('- Located in main floor plan area (not legend/metadata)');
console.log('- Similar font size and style\n');

// Read the current results
const results = JSON.parse(fs.readFileSync('test_data/extraction_results/all_extraction_results.json', 'utf8'));
const pdf13 = results.results['000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf'][0];

console.log('Current extraction found these 4 signs:');
pdf13.extractedSigns.forEach((sign, i) => {
  console.log(`${i+1}. "${sign.text}"`);
  console.log(`   Position: (${sign.boundingBox.x_percentage.toFixed(1)}%, ${sign.boundingBox.y_percentage.toFixed(1)}%)`);
  console.log(`   Size: ${sign.boundingBox.width_percentage.toFixed(2)}% x ${sign.boundingBox.height_percentage.toFixed(2)}%`);
  console.log(`   Raw size: ${sign.rawBounds.width}x${sign.rawBounds.height} pixels`);
  console.log(`   Aspect ratio: ${(sign.rawBounds.width / sign.rawBounds.height).toFixed(1)}`);
  console.log(`   Analysis: This appears to be from the ${sign.boundingBox.x_percentage > 80 ? 'LEGEND/METADATA area' : 'main plan area'}`);
  console.log();
});

console.log('=== Issues with Current Results ===');
console.log('1. All detected signs are from the legend area (x > 80%)');
console.log('2. Missing the actual floor plan sign numbers');
console.log('3. "888" has aspect ratio 0.2 (vertical text, likely not a sign)');
console.log('4. Need to capture the 74 other text annotations that were filtered out');

console.log('\n=== Next Steps ===');
console.log('The original extraction script found 78 total text annotations.');
console.log('We need to modify the filtering to:');
console.log('1. Include text from the main plan area (x < 75%)');
console.log('2. Look for 4-digit patterns specifically');
console.log('3. Consider text size appropriate for sign numbers');
console.log('4. Save all text for manual review');

// Let's check if we have the TypeScript source to modify
if (fs.existsSync('test_data/extraction_scripts/extract-signs.ts')) {
  console.log('\n✓ Found TypeScript extraction script for modification');
} else {
  console.log('\n✗ TypeScript extraction script not found');
}

console.log('\nRecommendation: Modify the existing extraction script to be less restrictive.');
console.log('Focus on main plan area and save ALL detected text for analysis.');