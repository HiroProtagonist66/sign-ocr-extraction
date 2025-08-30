const vision = require('@google-cloud/vision');
const fs = require('fs').promises;
const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');
require('dotenv').config({ path: '.env.local' });

// Initialize Vision API client
const client = new vision.ImageAnnotatorClient({
  apiKey: process.env.GOOGLE_VISION_API_KEY
});

// Expected COLO 2 signs based on database
const EXPECTED_COLO2_SIGNS = [
  '1263', '1264', '1285', '2001'
];

// Sign type patterns
const SIGN_TYPE_PATTERNS = [
  /^BC-\d+\.\d+$/i,   // BC-1.0, BC-5.1, BC-6.1
  /^PAC-\d+\.\d+$/i,  // PAC-1.1
  /^BID-\d+\.\d+$/i,  // BID-1.2
  /^ID-\d+\.\d+$/i,   // ID-5.2
];

// Sign number patterns - more specific
const SIGN_NUMBER_PATTERNS = [
  /^1\d{3}$/,         // 1000-1999 (matches 1263, 1264, 1285)
  /^2\d{3}$/,         // 2000-2999 (matches 2001)
  /^3\d{3}$/,         // 3000-3999
  /^\d{4}\.\d$/,      // Decimal variants like 2001.1, 1285.2
];

async function extractSignsFromPDF(pdfPath, outputDir) {
  try {
    console.log(`\nProcessing: ${path.basename(pdfPath)}`);
    
    // Convert PDF to PNG
    console.log('Converting PDF to PNG...');
    const pngPages = await pdfToPng(pdfPath, {
      viewportScale: 2.0,  // This scale worked best previously
    });
    
    if (!pngPages || pngPages.length === 0) {
      throw new Error('PNG conversion failed');
    }
    
    // Use the first page
    const page = pngPages[0];
    const imageBuffer = page.content;
    
    // Perform OCR
    console.log('Running Google Vision OCR...');
    const [result] = await client.textDetection({
      image: { content: imageBuffer.toString('base64') }
    });
    
    const textAnnotations = result.textAnnotations || [];
    console.log(`Found ${textAnnotations.length} text annotations`);
    
    // Extract signs with better filtering
    const extractedSigns = [];
    const processedTexts = new Set();
    
    for (const annotation of textAnnotations.slice(1)) { // Skip the first one (full text)
      const text = annotation.description?.trim();
      if (!text || processedTexts.has(text)) continue;
      
      processedTexts.add(text);
      
      // Check if it matches sign patterns
      const isSignType = SIGN_TYPE_PATTERNS.some(pattern => pattern.test(text));
      const isSignNumber = SIGN_NUMBER_PATTERNS.some(pattern => pattern.test(text));
      
      // Also check if it's one of our expected COLO 2 signs
      const isExpectedSign = EXPECTED_COLO2_SIGNS.includes(text);
      
      if (isSignType || isSignNumber || isExpectedSign) {
        const vertices = annotation.boundingPoly?.vertices || [];
        if (vertices.length === 4) {
          const minX = Math.min(...vertices.map(v => v.x || 0));
          const maxX = Math.max(...vertices.map(v => v.x || 0));
          const minY = Math.min(...vertices.map(v => v.y || 0));
          const maxY = Math.max(...vertices.map(v => v.y || 0));
          
          // Calculate percentage position
          const imageWidth = 6048;  // From previous extraction
          const imageHeight = 4320;
          
          const x_percentage = (minX / imageWidth) * 100;
          const y_percentage = (minY / imageHeight) * 100;
          const width_percentage = ((maxX - minX) / imageWidth) * 100;
          const height_percentage = ((maxY - minY) / imageHeight) * 100;
          
          // Filter out items in the legend area (right side > 80%)
          if (x_percentage < 80) {  // Focus on main drawing area
            extractedSigns.push({
              text,
              signType: isSignType ? text : null,
              isExpectedColo2Sign: isExpectedSign,
              boundingBox: {
                x_percentage,
                y_percentage,
                width_percentage,
                height_percentage
              },
              confidence: annotation.confidence || 0.95,
              area: x_percentage < 50 && y_percentage > 30 && y_percentage < 70 ? 'COLO 2' : 'Other'
            });
            
            console.log(`  ✓ Found sign: ${text} at (${x_percentage.toFixed(1)}%, ${y_percentage.toFixed(1)}%)${isExpectedSign ? ' [EXPECTED COLO 2 SIGN]' : ''}`);
          }
        }
      }
    }
    
    // Save results
    const resultFile = path.join(outputDir, 'colo2_extraction_results.json');
    const results = {
      pdfFile: path.basename(pdfPath),
      timestamp: new Date().toISOString(),
      totalTextFound: textAnnotations.length,
      signsExtracted: extractedSigns.length,
      expectedSignsFound: extractedSigns.filter(s => s.isExpectedColo2Sign).length,
      extractedSigns
    };
    
    await fs.writeFile(resultFile, JSON.stringify(results, null, 2));
    
    console.log(`\n📊 Results:`);
    console.log(`  - Total text annotations: ${textAnnotations.length}`);
    console.log(`  - Signs extracted: ${extractedSigns.length}`);
    console.log(`  - Expected COLO 2 signs found: ${results.expectedSignsFound}`);
    console.log(`  - Results saved to: ${resultFile}`);
    
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
  
  console.log('🔍 Starting COLO 2 Sign Extraction');
  console.log('================================');
  console.log(`Expected signs: ${EXPECTED_COLO2_SIGNS.join(', ')}`);
  
  try {
    await extractSignsFromPDF(pdfPath, outputDir);
    console.log('\n✅ Extraction complete!');
  } catch (error) {
    console.error('\n❌ Extraction failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractSignsFromPDF };