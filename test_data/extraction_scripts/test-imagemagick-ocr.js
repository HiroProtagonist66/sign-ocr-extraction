// Test Google Vision API on ImageMagick optimized images
const axios = require('axios');
const fs = require('fs');

async function testImageMagickOCR() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not found');
  }

  // Test the ImageMagick converted images
  const imageTests = [
    {
      name: 'Clean OCR (300 DPI)',
      path: 'test_data/extraction_results/magick_conversion/clean_ocr.png',
      description: 'Balanced quality and file size'
    },
    {
      name: 'High Contrast (400 DPI)', 
      path: 'test_data/extraction_results/magick_conversion/high_contrast.png',
      description: 'Enhanced text visibility'
    },
    {
      name: 'Ultra Clean (600 DPI)',
      path: 'test_data/extraction_results/magick_conversion/ultra_clean.png', 
      description: 'Maximum clarity for small text'
    }
  ];

  console.log('🔍 Testing Google Vision API on ImageMagick optimized images...\n');

  const allResults = {};

  for (const test of imageTests) {
    console.log(`📊 Testing: ${test.name}`);
    console.log(`📁 ${test.description}`);
    
    if (!fs.existsSync(test.path)) {
      console.log(`❌ Image not found: ${test.path}\n`);
      continue;
    }

    try {
      const imageBuffer = fs.readFileSync(test.path);
      const base64Image = imageBuffer.toString('base64');
      const fileSize = (imageBuffer.length / 1024 / 1024).toFixed(2);
      
      console.log(`📏 File size: ${fileSize} MB`);
      console.log(`🔄 Calling Google Vision API...`);

      const startTime = Date.now();
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { 
                  type: 'TEXT_DETECTION', 
                  maxResults: 1000 // Increase limit to catch more text
                }
              ]
            }
          ]
        }
      );
      const apiTime = Date.now() - startTime;

      const textAnnotations = response.data.responses[0].textAnnotations;
      console.log(`⏱️  API response time: ${(apiTime / 1000).toFixed(1)}s`);
      console.log(`📝 Text annotations found: ${textAnnotations ? textAnnotations.length : 0}`);
      
      if (!textAnnotations || textAnnotations.length === 0) {
        console.log('❌ No text detected\n');
        continue;
      }

      // Analyze the results for sign numbers
      const signNumbers = [];
      const signCodes = [];
      const otherNumbers = [];
      
      for (let i = 1; i < textAnnotations.length; i++) {
        const text = textAnnotations[i].description.trim();
        
        // Categorize different types of text
        if (/^\d{3,4}$/.test(text)) {
          // 3-4 digit numbers (likely sign numbers)
          signNumbers.push(text);
        } else if (/^\d{3,4}\.\d+$/.test(text)) {
          // Decimal numbers like 2001.1
          signNumbers.push(text);
        } else if (/^[A-Z]{2,4}-\d+\.\d+[A-Z]*$/.test(text)) {
          // Sign type codes like BC-1.0, ID-5.3
          signCodes.push(text);
        } else if (/^\d+$/.test(text)) {
          // Other numbers
          otherNumbers.push(text);
        }
      }

      console.log(`🎯 Sign numbers detected: ${signNumbers.length}`);
      console.log(`📋 Sign codes detected: ${signCodes.length}`);
      console.log(`🔢 Other numbers: ${otherNumbers.length}`);
      
      // Show samples
      if (signNumbers.length > 0) {
        console.log(`   📊 Sample sign numbers: ${signNumbers.slice(0, 10).join(', ')}`);
      }
      if (signCodes.length > 0) {
        console.log(`   📋 Sample sign codes: ${signCodes.slice(0, 5).join(', ')}`);
      }

      // Store results
      allResults[test.name] = {
        total_annotations: textAnnotations.length,
        sign_numbers: signNumbers,
        sign_codes: signCodes,
        other_numbers: otherNumbers,
        file_size_mb: parseFloat(fileSize),
        api_time_ms: apiTime
      };

      console.log(`✅ Processing complete\n`);

    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error.response?.data || error.message);
      console.log('');
    }
  }

  // Compare results
  console.log('🏆 COMPARISON RESULTS:');
  console.log('=' .repeat(60));
  
  const testNames = Object.keys(allResults);
  if (testNames.length > 0) {
    testNames.forEach(name => {
      const result = allResults[name];
      const totalSigns = result.sign_numbers.length + result.sign_codes.length;
      console.log(`${name}:`);
      console.log(`   📊 Total sign-related text: ${totalSigns}`);
      console.log(`   📝 Total annotations: ${result.total_annotations}`);
      console.log(`   💾 File size: ${result.file_size_mb} MB`);
      console.log(`   ⏱️  API time: ${(result.api_time_ms / 1000).toFixed(1)}s`);
      console.log('');
    });

    // Find best result
    const bestResult = testNames.reduce((best, current) => {
      const currentSigns = allResults[current].sign_numbers.length + allResults[current].sign_codes.length;
      const bestSigns = allResults[best].sign_numbers.length + allResults[best].sign_codes.length;
      return currentSigns > bestSigns ? current : best;
    });

    console.log(`🥇 BEST RESULT: ${bestResult}`);
    console.log(`   Found ${allResults[bestResult].sign_numbers.length + allResults[bestResult].sign_codes.length} sign-related items`);
    
    // Save the best results for visualization update
    const bestData = allResults[bestResult];
    fs.writeFileSync('test_data/extraction_results/best_imagemagick_results.json', JSON.stringify({
      method: bestResult,
      timestamp: new Date().toISOString(),
      ...bestData
    }, null, 2));
    
    console.log(`💾 Best results saved for visualization update`);
  } else {
    console.log('❌ No successful extractions');
  }
}

require('dotenv').config({ path: '.env.local' });
testImageMagickOCR().catch(console.error);