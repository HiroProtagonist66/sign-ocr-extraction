#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the existing extraction results
const calibratedData = require('../extraction_results/calibrated_extraction_results.json');

// Known correct positions for a few reference signs (from visual inspection)
const referencePoints = {
  '2001': { actual: { x: 35, y: 31 }, extracted: { x: 30, y: 48 } },
  // We can add more reference points as we identify them
};

// Function to detect coordinate transformation pattern
function detectTransformation() {
  // For now, we'll use a simple observation:
  // The signs appear to be in the correct relative positions to each other,
  // but the entire coordinate system seems shifted/scaled
  
  // Based on sign 2001:
  // Extracted: x=30%, y=48%
  // Actual: x=35%, y=31% (approximately)
  
  // This suggests a possible linear transformation
  const xScale = 35 / 30;  // ~1.17
  const yScale = 31 / 48;  // ~0.65
  
  return { xScale, yScale };
}

// Function to fix coordinates for all signs
function fixCoordinates(signs) {
  const transformation = detectTransformation();
  console.log('Detected transformation:', transformation);
  
  return signs.map(sign => {
    // Apply transformation to coordinates
    const fixedX = sign.boundingBox.x_percentage * transformation.xScale;
    const fixedY = sign.boundingBox.y_percentage * transformation.yScale;
    
    return {
      ...sign,
      boundingBox: {
        ...sign.boundingBox,
        x_percentage_original: sign.boundingBox.x_percentage,
        y_percentage_original: sign.boundingBox.y_percentage,
        x_percentage: fixedX,
        y_percentage: fixedY
      },
      coordinatesFixed: true
    };
  });
}

// Main execution
console.log('Analyzing coordinate system...');
console.log(`Total signs found: ${calibratedData.extractedSigns.length}`);

// Find patterns in the data
const signGroups = {
  topRow: [],
  diagonal: [],
  leftSide: [],
  other: []
};

// Group signs by their number patterns
calibratedData.extractedSigns.forEach(sign => {
  const num = parseInt(sign.text);
  if (sign.text.startsWith('2001')) {
    signGroups.topRow.push(sign);
  } else if (num >= 2004 && num <= 2023) {
    signGroups.diagonal.push(sign);
  } else if (num >= 2002 && num <= 2003) {
    signGroups.leftSide.push(sign);
  } else {
    signGroups.other.push(sign);
  }
});

console.log('Sign groupings:');
console.log('- Top row (2001.x):', signGroups.topRow.length);
console.log('- Diagonal (2004-2023):', signGroups.diagonal.length);
console.log('- Left side (2002-2003):', signGroups.leftSide.length);
console.log('- Other:', signGroups.other.length);

// Apply coordinate fixes
const fixedSigns = fixCoordinates(calibratedData.extractedSigns);

// Save the fixed data
const outputData = {
  ...calibratedData,
  extractedSigns: fixedSigns,
  coordinateSystem: 'fixed',
  fixApplied: {
    method: 'linear_transformation',
    xScale: 1.17,
    yScale: 0.65,
    referencePoint: '2001'
  }
};

const outputPath = path.join(__dirname, '../extraction_results/fixed_coordinates.json');
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log(`\nFixed coordinates saved to: ${outputPath}`);
console.log('\nSample of fixed coordinates:');
fixedSigns.slice(0, 5).forEach(sign => {
  console.log(`${sign.text}: (${sign.boundingBox.x_percentage_original.toFixed(1)}, ${sign.boundingBox.y_percentage_original.toFixed(1)}) -> (${sign.boundingBox.x_percentage.toFixed(1)}, ${sign.boundingBox.y_percentage.toFixed(1)})`);
});