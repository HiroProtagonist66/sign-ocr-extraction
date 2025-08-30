// Test Google Vision OCR on high-quality images
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testHighQualityOCR() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not found');
  }

  // Test different quality levels
  const qualityTests = [
    {
      name: '4x Scale (Ultra High)',
      imagePath: 'test_data/extraction_results/quality_test_ultra_high/pdf13_ultra_high_page_1.png',
      expectedImprovements: 'Better text clarity, more accurate sign detection'
    },
    {
      name: '6x Scale (Extreme)',
      imagePath: 'test_data/extraction_results/quality_test_extreme/pdf13_extreme_page_1.png',
      expectedImprovements: 'Maximum clarity for small text'
    }
  ];

  for (const test of qualityTests) {
    console.log(`\n🔍 Testing ${test.name}...`);
    console.log(`📁 Image: ${test.imagePath}`);
    
    if (!fs.existsSync(test.imagePath)) {
      console.log(`❌ Image file not found, skipping`);
      continue;
    }

    try {
      const imageBuffer = fs.readFileSync(test.imagePath);
      const base64Image = imageBuffer.toString('base64');
      const fileSize = (imageBuffer.length / 1024 / 1024).toFixed(2);
      
      console.log(`📊 File size: ${fileSize} MB`);
      console.log(`🔄 Calling Google Vision API...`);

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { 
                  type: 'TEXT_DETECTION', 
                  maxResults: 500 // Increase to catch more text
                }
              ]
            }
          ]
        }
      );

      const textAnnotations = response.data.responses[0].textAnnotations;
      console.log(`📝 Found ${textAnnotations ? textAnnotations.length : 0} text annotations`);
      
      if (!textAnnotations || textAnnotations.length === 0) {
        console.log('❌ No text detected');
        continue;
      }

      // Analyze the results
      const allNumbers = [];
      const signPatterns = [];
      
      for (let i = 1; i < textAnnotations.length; i++) {
        const text = textAnnotations[i].description.trim();
        
        // Look for various number patterns
        if (/^\d{3,4}$/.test(text)) {
          // 3-4 digit numbers (potential sign numbers)
          allNumbers.push(text);
        } else if (/^\d{3,4}\.\d+$/.test(text)) {
          // Decimal numbers like 2001.1
          allNumbers.push(text);
        } else if (/^[A-Z]{2,4}-\d+\.\d+[A-Z]*$/.test(text)) {
          // Sign type codes like BC-1.0, ID-5.3
          signPatterns.push(text);
        }
      }

      console.log(`🔢 Pure numbers found: ${allNumbers.length}`);
      console.log(`📋 Sign patterns found: ${signPatterns.length}`);
      
      if (allNumbers.length > 0) {
        console.log(`\n📊 Sample numbers detected:`);
        allNumbers.slice(0, 15).forEach((num, i) => {
          console.log(`   ${(i+1).toString().padStart(2)}. ${num}`);
        });
      }
      
      if (signPatterns.length > 0) {
        console.log(`\n📋 Sign patterns detected:`);
        signPatterns.slice(0, 10).forEach((pattern, i) => {
          console.log(`   ${(i+1).toString().padStart(2)}. ${pattern}`);
        });
      }

      // Save detailed results
      const resultsFile = `test_data/extraction_results/high_quality_results_${test.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      const detailedResults = {
        test_name: test.name,
        total_annotations: textAnnotations.length,
        pure_numbers: allNumbers,
        sign_patterns: signPatterns,
        file_size_mb: fileSize,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
      console.log(`💾 Results saved to: ${path.basename(resultsFile)}`);

    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error.response?.data || error.message);
    }
  }

  console.log(`\n🎯 Next Steps:`);
  console.log(`1. Compare results with original 2x scale extraction`);
  console.log(`2. If still inaccurate, try image preprocessing`);
  console.log(`3. Consider manual hotspot mapping as fallback`);
}

require('dotenv').config({ path: '.env.local' });
testHighQualityOCR().catch(console.error);