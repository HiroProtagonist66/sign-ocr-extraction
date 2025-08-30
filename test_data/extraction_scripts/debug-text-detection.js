// Debug script to see exactly what text Google Vision is detecting
const axios = require('axios');
const fs = require('fs');

async function debugTextDetection() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  const imagePath = 'test_data/extraction_results/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png';
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  console.log('🔍 Debugging text detection on PDF 13...\n');

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 100 }]
          }
        ]
      }
    );

    const textAnnotations = response.data.responses[0].textAnnotations;
    console.log(`Found ${textAnnotations.length} text annotations\n`);
    
    console.log('📝 ALL detected text (first 30):');
    for (let i = 1; i < Math.min(31, textAnnotations.length); i++) {
      const text = textAnnotations[i].description;
      const vertices = textAnnotations[i].boundingPoly.vertices;
      
      if (vertices && vertices.length >= 4) {
        const centerX = vertices.reduce((sum, v) => sum + (v.x || 0), 0) / vertices.length;
        const centerY = vertices.reduce((sum, v) => sum + (v.y || 0), 0) / vertices.length;
        const xPct = ((centerX / 6048) * 100).toFixed(1);
        const yPct = ((centerY / 4320) * 100).toFixed(1);
        
        console.log(`${i.toString().padStart(2)}. "${text}" at (${xPct}%, ${yPct}%)`);
        
        // Check if this looks like a number
        if (/\d/.test(text)) {
          console.log(`    ↳ Contains digits: ${text}`);
        }
      }
    }

    // Test different number patterns
    console.log('\n🔢 Looking for potential sign numbers...');
    let numberCount = 0;
    
    for (let i = 1; i < textAnnotations.length; i++) {
      const text = textAnnotations[i].description.trim();
      
      // More flexible number matching
      if (/^\d+$/.test(text) || /^\d+\.\d+$/.test(text)) {
        numberCount++;
        const vertices = textAnnotations[i].boundingPoly.vertices;
        if (vertices && vertices.length >= 4) {
          const centerX = vertices.reduce((sum, v) => sum + (v.x || 0), 0) / vertices.length;
          const centerY = vertices.reduce((sum, v) => sum + (v.y || 0), 0) / vertices.length;
          const xPct = ((centerX / 6048) * 100).toFixed(1);
          const yPct = ((centerY / 4320) * 100).toFixed(1);
          
          console.log(`  ✓ Number "${text}" at (${xPct}%, ${yPct}%)`);
        }
      }
    }
    
    console.log(`\n📊 Total pure numbers found: ${numberCount}`);
    console.log(`📊 Expected: ~148 sign numbers`);
    
    if (numberCount < 50) {
      console.log('\n💡 Possible reasons for low count:');
      console.log('   • Numbers may be part of graphics/drawings rather than text');
      console.log('   • OCR might not detect small or stylized numbers');
      console.log('   • Numbers could be embedded in complex layouts');
      console.log('   • The 148 count might include non-text elements');
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

require('dotenv').config({ path: '.env.local' });
debugTextDetection();