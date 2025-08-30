// Focus on extracting ONLY numeric patterns from PDF 13
// Ignoring all architectural text and symbols

const axios = require('axios');
const fs = require('fs');

async function extractNumbersOnly() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not found');
  }

  // Read the PNG image for PDF 13
  const imagePath = 'test_data/extraction_results/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png';
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  console.log('🔢 Extracting NUMBERS ONLY from PDF 13...');
  console.log('Target: ~148 sign numbers as you mentioned');

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 300 // Increase to catch more text
              }
            ]
          }
        ]
      }
    );

    const textAnnotations = response.data.responses[0].textAnnotations;
    
    if (!textAnnotations) {
      console.log('❌ No text found');
      return;
    }

    console.log(`📝 Found ${textAnnotations.length} total text annotations`);
    
    const imageWidth = 6048;
    const imageHeight = 4320;
    
    const numbersFound = [];

    // Skip the first annotation (full text block)
    for (let i = 1; i < textAnnotations.length; i++) {
      const annotation = textAnnotations[i];
      const text = annotation.description.trim();
      const vertices = annotation.boundingPoly.vertices;

      if (!vertices || vertices.length < 4) continue;

      // ONLY process text that looks like numbers
      if (isNumber(text)) {
        const bounds = calculateBounds(vertices);
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        const numberInfo = {
          text: text,
          x_percentage: (centerX / imageWidth) * 100,
          y_percentage: (centerY / imageHeight) * 100,
          width_percentage: (bounds.width / imageWidth) * 100,
          height_percentage: (bounds.height / imageHeight) * 100,
          aspect_ratio: bounds.width / bounds.height,
          size_pixels: bounds.width * bounds.height,
          raw_bounds: bounds
        };

        numbersFound.push(numberInfo);
      }
    }

    console.log(`\n🎯 Found ${numbersFound.length} numeric patterns`);

    if (numbersFound.length > 0) {
      // Sort by position for easier analysis
      numbersFound.sort((a, b) => a.y_percentage - b.y_percentage);

      console.log('\n📊 First 20 numbers found:');
      numbersFound.slice(0, 20).forEach((num, i) => {
        console.log(`${(i+1).toString().padStart(2)}. "${num.text}" at (${num.x_percentage.toFixed(1)}%, ${num.y_percentage.toFixed(1)}%)`);
      });

      // Analyze number patterns
      const patterns = analyzeNumberPatterns(numbersFound);
      console.log('\n📈 Pattern Analysis:');
      Object.entries(patterns).forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count} occurrences`);
      });

      // Save results
      const results = {
        timestamp: new Date().toISOString(),
        total_annotations: textAnnotations.length,
        numbers_found: numbersFound.length,
        target_count: 148,
        extraction_efficiency: ((numbersFound.length / 148) * 100).toFixed(1),
        numbers: numbersFound,
        patterns: patterns
      };

      fs.writeFileSync('test_data/extraction_results/numbers_only_pdf13.json', JSON.stringify(results, null, 2));
      
      console.log(`\n✅ Results saved to numbers_only_pdf13.json`);
      console.log(`📊 Extraction efficiency: ${results.extraction_efficiency}% of expected 148 numbers`);

      if (numbersFound.length < 100) {
        console.log('\n💡 If we found fewer numbers than expected, this could mean:');
        console.log('   1. Some numbers are too small/unclear for OCR');
        console.log('   2. Numbers are part of graphics rather than text');
        console.log('   3. Expected count includes non-text elements');
      }

    } else {
      console.log('❌ No numeric patterns found');
    }

  } catch (error) {
    console.error('💥 Error calling Vision API:', error.response?.data || error.message);
  }
}

function calculateBounds(vertices) {
  const minX = Math.min(...vertices.map(v => v.x || 0));
  const maxX = Math.max(...vertices.map(v => v.x || 0));
  const minY = Math.min(...vertices.map(v => v.y || 0));
  const maxY = Math.max(...vertices.map(v => v.y || 0));

  return {
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function isNumber(text) {
  // Match various number patterns:
  // - Pure digits: 1234, 2001, 888
  // - Decimal numbers: 2001.1, 123.45
  // - Numbers with letters: 1A, 2B (sometimes used in plans)
  const patterns = [
    /^\\d+$/, // Pure digits
    /^\\d+\\.\\d+$/, // Decimal numbers
    /^\\d+[A-Z]?$/, // Numbers with optional letter suffix
    /^[A-Z]?\\d+$/, // Numbers with optional letter prefix
  ];

  return patterns.some(pattern => pattern.test(text));
}

function analyzeNumberPatterns(numbers) {
  const patterns = {
    'single_digit': 0,
    'two_digit': 0, 
    'three_digit': 0,
    'four_digit': 0,
    'decimal': 0,
    'with_letter': 0
  };

  numbers.forEach(num => {
    const text = num.text;
    
    if (/\\./.test(text)) {
      patterns.decimal++;
    } else if (/[A-Z]/.test(text)) {
      patterns.with_letter++;
    } else if (/^\\d{1}$/.test(text)) {
      patterns.single_digit++;
    } else if (/^\\d{2}$/.test(text)) {
      patterns.two_digit++;
    } else if (/^\\d{3}$/.test(text)) {
      patterns.three_digit++;
    } else if (/^\\d{4}$/.test(text)) {
      patterns.four_digit++;
    }
  });

  return patterns;
}

// Load environment and run
require('dotenv').config({ path: '.env.local' });
extractNumbersOnly().catch(console.error);