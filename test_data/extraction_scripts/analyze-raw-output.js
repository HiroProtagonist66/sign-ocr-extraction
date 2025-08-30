const fs = require('fs');

// Read the full extraction results
const results = JSON.parse(fs.readFileSync('test_data/extraction_results/all_extraction_results.json', 'utf8'));

console.log('=== Analysis of PDF 13 Results ===');
const pdf13 = results.results['000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf'][0];

console.log(`Image size: ${pdf13.imageSize.width}x${pdf13.imageSize.height}`);
console.log(`Found ${pdf13.extractedSigns.length} sign numbers`);

console.log('\n=== Detected Sign Numbers ===');
pdf13.extractedSigns.forEach((sign, i) => {
  console.log(`${i+1}. "${sign.text}" at (${sign.boundingBox.x_percentage.toFixed(1)}%, ${sign.boundingBox.y_percentage.toFixed(1)}%)`);
  console.log(`   Size: ${sign.boundingBox.width_percentage.toFixed(2)}% x ${sign.boundingBox.height_percentage.toFixed(2)}%`);
  console.log(`   Raw bounds: ${sign.rawBounds.width}x${sign.rawBounds.height} pixels`);
});

// Look for patterns that might indicate real sign numbers
console.log('\n=== Pattern Analysis ===');
console.log('Based on your example (2001.1, 2001.2, etc.), we should look for:');
console.log('- 4-digit numbers: 2001, 2002, 2003, etc.');
console.log('- 4-digit.decimal: 2001.1, 2001.2, etc.');

console.log('\n=== Size Analysis ===');
console.log('Current detected signs have these characteristics:');
pdf13.extractedSigns.forEach(sign => {
  const aspectRatio = sign.rawBounds.width / sign.rawBounds.height;
  console.log(`"${sign.text}": ${sign.rawBounds.width}x${sign.rawBounds.height}px (ratio: ${aspectRatio.toFixed(1)})`);
});