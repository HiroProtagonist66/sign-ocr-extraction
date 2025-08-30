// Modified version that saves ALL text detected by Google Vision for analysis
const axios = require('axios');
const fs = require('fs');

async function extractAllText() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not found');
  }

  // Read the PNG image
  const imagePath = 'test_data/extraction_results/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png';
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  console.log('Calling Google Vision API to extract ALL text...');

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
                maxResults: 200 // Get more results
              }
            ]
          }
        ]
      }
    );

    const textAnnotations = response.data.responses[0].textAnnotations;
    
    if (!textAnnotations) {
      console.log('No text found');
      return;
    }

    console.log(`Found ${textAnnotations.length} text annotations`);
    
    const imageWidth = 6048; // From our previous results
    const imageHeight = 4320;
    
    const allText = [];
    const potentialSigns = [];

    // Skip the first annotation (full text block)
    for (let i = 1; i < textAnnotations.length; i++) {
      const annotation = textAnnotations[i];
      const text = annotation.description.trim();
      const vertices = annotation.boundingPoly.vertices;

      if (!vertices || vertices.length < 4) continue;

      const minX = Math.min(...vertices.map(v => v.x || 0));
      const maxX = Math.max(...vertices.map(v => v.x || 0));
      const minY = Math.min(...vertices.map(v => v.y || 0));
      const maxY = Math.max(...vertices.map(v => v.y || 0));

      const width = maxX - minX;
      const height = maxY - minY;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const textInfo = {
        text: text,
        x_percentage: (centerX / imageWidth) * 100,
        y_percentage: (centerY / imageHeight) * 100,
        width_percentage: (width / imageWidth) * 100,
        height_percentage: (height / imageHeight) * 100,
        aspect_ratio: width / height,
        size_pixels: width * height,
        raw_bounds: { minX, maxX, minY, maxY, width, height }
      };

      allText.push(textInfo);

      // Check if it could be a sign number based on your example characteristics
      if (couldBeSignNumber(textInfo)) {
        potentialSigns.push(textInfo);
      }
    }

    // Save all results for analysis
    const results = {
      timestamp: new Date().toISOString(),
      total_annotations: textAnnotations.length,
      potential_signs: potentialSigns,
      all_text: allText,
      analysis: analyzeResults(allText, potentialSigns)
    };

    fs.writeFileSync('test_data/extraction_results/all_text_analysis.json', JSON.stringify(results, null, 2));
    
    console.log('\\n=== Analysis Complete ===');
    console.log(`Total text annotations: ${allText.length}`);
    console.log(`Potential sign numbers: ${potentialSigns.length}`);
    
    if (potentialSigns.length > 0) {
      console.log('\\n=== Potential Signs Found ===');
      potentialSigns.forEach((sign, i) => {
        console.log(`${i+1}. "${sign.text}" at (${sign.x_percentage.toFixed(1)}%, ${sign.y_percentage.toFixed(1)}%)`);
        console.log(`   Size: ${sign.width_percentage.toFixed(2)}% x ${sign.height_percentage.toFixed(2)}%`);
        console.log(`   Area: ${sign.x_percentage < 75 ? 'MAIN PLAN' : 'LEGEND'}`);
      });
    }

    console.log('\\nFull analysis saved to all_text_analysis.json');

  } catch (error) {
    console.error('Error calling Vision API:', error.response?.data || error.message);
  }
}

function couldBeSignNumber(textInfo) {
  const { text, x_percentage, aspect_ratio, width_percentage, height_percentage } = textInfo;

  // Pattern matching for expected sign number formats
  const patterns = [
    /^\\d{4}$/, // 2001, 2002, 2003
    /^\\d{4}\\.\\d+$/, // 2001.1, 2002.1
    /^[A-Z]{2,4}-\\d+\\.\\d+[A-Z]?$/, // BC-1.0, ID-5.3, BC-1.9A
  ];

  if (!patterns.some(p => p.test(text))) return false;

  // Focus on main plan area (not legend)
  if (x_percentage > 75) return false;

  // Size constraints based on expected sign dimensions
  if (width_percentage < 0.8 || width_percentage > 8) return false;
  if (height_percentage < 0.5 || height_percentage > 6) return false;

  // Aspect ratio should be reasonable (not too vertical or horizontal)
  if (aspect_ratio < 0.5 || aspect_ratio > 8) return false;

  return true;
}

function analyzeResults(allText, potentialSigns) {
  const mainPlanText = allText.filter(t => t.x_percentage < 75);
  const legendText = allText.filter(t => t.x_percentage >= 75);
  
  return {
    total_text: allText.length,
    main_plan_text: mainPlanText.length,
    legend_text: legendText.length,
    potential_signs: potentialSigns.length,
    text_by_area: {
      main_plan_examples: mainPlanText.slice(0, 10).map(t => ({ text: t.text, x: t.x_percentage.toFixed(1) })),
      legend_examples: legendText.slice(0, 10).map(t => ({ text: t.text, x: t.x_percentage.toFixed(1) }))
    }
  };
}

// Load environment and run
require('dotenv').config({ path: '.env.local' });
extractAllText().catch(console.error);