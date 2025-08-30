const vision = require('@google-cloud/vision');
const fs = require('fs').promises;
const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');
require('dotenv').config({ path: '.env.local' });

// Initialize Vision API client
const client = new vision.ImageAnnotatorClient({
  apiKey: process.env.GOOGLE_VISION_API_KEY
});

async function searchForSigns(pdfPath) {
  try {
    console.log(`\nProcessing: ${path.basename(pdfPath)}`);
    
    // Convert PDF to PNG
    console.log('Converting PDF to PNG...');
    const pngPages = await pdfToPng(pdfPath, {
      viewportScale: 2.0,
    });
    
    if (!pngPages || pngPages.length === 0) {
      throw new Error('PNG conversion failed');
    }
    
    const page = pngPages[0];
    const imageBuffer = page.content;
    
    // Perform OCR
    console.log('Running Google Vision OCR...');
    const [result] = await client.textDetection({
      image: { content: imageBuffer.toString('base64') }
    });
    
    const textAnnotations = result.textAnnotations || [];
    console.log(`Found ${textAnnotations.length} text annotations`);
    
    // Search for anything containing "12" or "126" or "128"
    const matches = [];
    const searched = new Set();
    
    for (const annotation of textAnnotations) {
      const text = annotation.description?.trim();
      if (!text || searched.has(text)) continue;
      searched.add(text);
      
      // Look for any text containing these patterns
      if (text.includes('12') || text.includes('126') || text.includes('128')) {
        const vertices = annotation.boundingPoly?.vertices || [];
        if (vertices.length === 4) {
          const minX = Math.min(...vertices.map(v => v.x || 0));
          const minY = Math.min(...vertices.map(v => v.y || 0));
          
          const x_percentage = (minX / 6048) * 100;
          const y_percentage = (minY / 4320) * 100;
          
          matches.push({
            text,
            x_percentage: x_percentage.toFixed(1),
            y_percentage: y_percentage.toFixed(1),
            area: x_percentage < 50 && y_percentage > 30 && y_percentage < 70 ? 'POSSIBLY COLO 2' : 'Other'
          });
        }
      }
    }
    
    console.log(`\n📊 Results for texts containing "12", "126", or "128":`);
    console.log('=' .repeat(60));
    
    if (matches.length === 0) {
      console.log('No matches found!');
    } else {
      // Sort by position
      matches.sort((a, b) => {
        const yDiff = parseFloat(a.y_percentage) - parseFloat(b.y_percentage);
        if (Math.abs(yDiff) > 5) return yDiff;
        return parseFloat(a.x_percentage) - parseFloat(b.x_percentage);
      });
      
      for (const match of matches) {
        console.log(`  "${match.text}" at (${match.x_percentage}%, ${match.y_percentage}%) - ${match.area}`);
      }
    }
    
    // Also search the full text
    if (textAnnotations.length > 0) {
      const fullText = textAnnotations[0].description || '';
      console.log('\n🔍 Searching full text for 1263, 1264, 1285...');
      
      const targetSigns = ['1263', '1264', '1285'];
      for (const sign of targetSigns) {
        if (fullText.includes(sign)) {
          console.log(`  ✓ Found "${sign}" in full text!`);
        } else {
          console.log(`  ✗ "${sign}" NOT found in full text`);
        }
      }
    }
    
    return matches;
    
  } catch (error) {
    console.error('Error searching signs:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const pdfPath = path.join(__dirname, '../pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf');
  
  console.log('🔍 Searching for 1200-series Signs');
  console.log('===================================');
  console.log('Looking for: 1263, 1264, 1285 and similar');
  
  try {
    await searchForSigns(pdfPath);
    console.log('\n✅ Search complete!');
  } catch (error) {
    console.error('\n❌ Search failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}