const vision = require('@google-cloud/vision');
const fs = require('fs').promises;
const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');
require('dotenv').config({ path: '.env.local' });

// Initialize Vision API client
const client = new vision.ImageAnnotatorClient({
  apiKey: process.env.GOOGLE_VISION_API_KEY
});

// More comprehensive sign patterns
const SIGN_PATTERNS = {
  // 4-digit sign numbers
  fourDigit: /^[12]\d{3}$/,
  
  // Decimal variants
  decimal: /^[12]\d{3}\.\d+$/,
  
  // Sign type codes
  types: [
    /^BC-\d+\.\d+$/i,   // BC-1.0, BC-5.1, etc.
    /^PAC-\d+\.\d+$/i,  // PAC-1.1
    /^BID-\d+\.\d+$/i,  // BID-1.2
    /^ID-\d+\.\d*$/i,   // ID-5.2, ID-5
    /^BI-\d+\.\d+$/i,   // BI-8.2, BI-4.1
    /^HAC-\d+$/i,       // HAC-1, HAC-2
  ],
  
  // Special patterns that might be signs
  special: [
    /^20\d{2}$/,        // 2000-2099
    /^21\d{2}$/,        // 2100-2199
    /^BC-\d+$/i,        // BC-1 (without decimal)
    /^ID-\d+$/i,        // ID-5 (without decimal)
  ]
};

function isLikelySign(text) {
  // Check if it matches any sign pattern
  if (SIGN_PATTERNS.fourDigit.test(text)) return true;
  if (SIGN_PATTERNS.decimal.test(text)) return true;
  if (SIGN_PATTERNS.types.some(pattern => pattern.test(text))) return true;
  if (SIGN_PATTERNS.special.some(pattern => pattern.test(text))) return true;
  
  // Check for specific ranges we know exist
  const num = parseInt(text);
  if (!isNaN(num)) {
    // COLO 2 signs are in 2000-2114 range
    if (num >= 2000 && num <= 2114) return true;
    // Some signs might be in 1000-1999 range
    if (num >= 1000 && num <= 1999) return true;
  }
  
  return false;
}

async function extractAllSigns(pdfPath, outputDir) {
  try {
    console.log(`\nProcessing: ${path.basename(pdfPath)}`);
    console.log('=' .repeat(60));
    
    // Try multiple scales to get different text recognition
    const scales = [2.0, 3.0, 1.5]; // Different scales might reveal different text
    const allExtractedSigns = new Map(); // Use Map to avoid duplicates
    
    for (const scale of scales) {
      console.log(`\nTrying scale ${scale}x...`);
      
      // Convert PDF to PNG
      const pngPages = await pdfToPng(pdfPath, {
        viewportScale: scale,
      });
      
      if (!pngPages || pngPages.length === 0) {
        console.log(`  Failed to convert at scale ${scale}`);
        continue;
      }
      
      const page = pngPages[0];
      const imageBuffer = page.content;
      
      // Perform OCR
      console.log('  Running OCR...');
      const [result] = await client.textDetection({
        image: { content: imageBuffer.toString('base64') }
      });
      
      const textAnnotations = result.textAnnotations || [];
      console.log(`  Found ${textAnnotations.length} text annotations`);
      
      // Process each annotation
      for (const annotation of textAnnotations.slice(1)) { // Skip full text
        const text = annotation.description?.trim();
        if (!text) continue;
        
        // Clean up the text - remove common OCR errors
        const cleanedText = text
          .replace(/[Oo]/g, '0') // O -> 0 for numbers
          .replace(/[Il]/g, '1') // I,l -> 1 for numbers
          .replace(/[Ss]/g, '5') // S -> 5 for numbers
          .replace(/[Zz]/g, '2') // Z -> 2 for numbers
          .replace(/\s+/g, '');  // Remove spaces
        
        // Check both original and cleaned text
        const textsToCheck = [text, cleanedText];
        
        for (const checkText of textsToCheck) {
          if (isLikelySign(checkText)) {
            const vertices = annotation.boundingPoly?.vertices || [];
            if (vertices.length === 4) {
              const minX = Math.min(...vertices.map(v => v.x || 0));
              const maxX = Math.max(...vertices.map(v => v.x || 0));
              const minY = Math.min(...vertices.map(v => v.y || 0));
              const maxY = Math.max(...vertices.map(v => v.y || 0));
              
              // Adjust coordinates based on scale
              const baseWidth = 6048;
              const baseHeight = 4320;
              const scaledWidth = baseWidth * (scale / 2.0);
              const scaledHeight = baseHeight * (scale / 2.0);
              
              const x_percentage = (minX / scaledWidth) * 100;
              const y_percentage = (minY / scaledHeight) * 100;
              const width_percentage = ((maxX - minX) / scaledWidth) * 100;
              const height_percentage = ((maxY - minY) / scaledHeight) * 100;
              
              // Use text as key to avoid duplicates
              if (!allExtractedSigns.has(checkText) || 
                  allExtractedSigns.get(checkText).confidence < (annotation.confidence || 0.95)) {
                allExtractedSigns.set(checkText, {
                  text: checkText,
                  originalText: text,
                  signType: SIGN_PATTERNS.types.some(p => p.test(checkText)) ? checkText : null,
                  boundingBox: {
                    x_percentage,
                    y_percentage,
                    width_percentage,
                    height_percentage
                  },
                  confidence: annotation.confidence || 0.95,
                  scale,
                  isFieldLocate: parseInt(checkText) >= 2027 && parseInt(checkText) <= 2114
                });
              }
            }
          }
        }
      }
    }
    
    // Convert Map to array and sort
    const extractedSigns = Array.from(allExtractedSigns.values())
      .sort((a, b) => {
        // Sort numerically if both are numbers
        const aNum = parseInt(a.text);
        const bNum = parseInt(b.text);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        // Otherwise sort alphabetically
        return a.text.localeCompare(b.text);
      });
    
    // Analyze what we found
    console.log('\n📊 Extraction Summary:');
    console.log('=' .repeat(60));
    console.log(`Total unique signs found: ${extractedSigns.length}`);
    
    // Group by type
    const fieldLocateSigns = extractedSigns.filter(s => s.isFieldLocate);
    const mainAreaSigns = extractedSigns.filter(s => !s.isFieldLocate && /^\d/.test(s.text));
    const typeSigns = extractedSigns.filter(s => s.signType);
    
    console.log(`\nBreakdown:`);
    console.log(`  - Field Locate (2027-2114): ${fieldLocateSigns.length} signs`);
    console.log(`  - Main Area (2000-2026): ${mainAreaSigns.filter(s => {
      const num = parseInt(s.text);
      return num >= 2000 && num <= 2026;
    }).length} signs`);
    console.log(`  - Sign Types (BC-, ID-, etc.): ${typeSigns.length} signs`);
    console.log(`  - Other: ${extractedSigns.length - fieldLocateSigns.length - mainAreaSigns.length} signs`);
    
    // Check for missing signs in sequences
    console.log('\n🔍 Missing Sign Analysis:');
    const numbers = extractedSigns
      .map(s => parseInt(s.text))
      .filter(n => !isNaN(n) && n >= 2000 && n <= 2114)
      .sort((a, b) => a - b);
    
    const missing = [];
    for (let i = 2001; i <= 2114; i++) {
      if (!numbers.includes(i)) {
        missing.push(i);
      }
    }
    
    if (missing.length > 0) {
      console.log(`Missing signs in 2001-2114 range: ${missing.length}`);
      console.log(`Missing: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '...' : ''}`);
    } else {
      console.log('No gaps found in 2001-2114 range!');
    }
    
    // Save results
    const resultFile = path.join(outputDir, 'improved_extraction_results.json');
    const results = {
      pdfFile: path.basename(pdfPath),
      timestamp: new Date().toISOString(),
      totalSignsFound: extractedSigns.length,
      expectedCount: 150,
      missingCount: 150 - extractedSigns.length,
      stats: {
        totalSigns: extractedSigns.length,
        fieldLocateSigns: fieldLocateSigns.length,
        mainAreaSigns: mainAreaSigns.length,
        typeSigns: typeSigns.length
      },
      extractedSigns,
      missingSignNumbers: missing
    };
    
    await fs.writeFile(resultFile, JSON.stringify(results, null, 2));
    console.log(`\n✅ Results saved to: ${resultFile}`);
    
    return results;
    
  } catch (error) {
    console.error('Error extracting signs:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const pdfPath = path.join(__dirname, '../pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf');
  const outputDir = path.join(__dirname, '../extraction_results');
  
  console.log('🔍 Improved Sign Extraction - Finding All 150+ Signs');
  console.log('=' .repeat(60));
  console.log('Target: ~150 signs total');
  console.log('Current: 112 signs found');
  console.log('Missing: ~38 signs');
  
  try {
    const results = await extractAllSigns(pdfPath, outputDir);
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 Final Result: ${results.totalSignsFound} / ${results.expectedCount} signs found`);
    
    if (results.totalSignsFound >= 150) {
      console.log('✅ SUCCESS! Found all expected signs!');
    } else {
      console.log(`⚠️  Still missing ${results.missingCount} signs`);
      console.log('These might be embedded as graphics rather than text.');
    }
    
  } catch (error) {
    console.error('\n❌ Extraction failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}