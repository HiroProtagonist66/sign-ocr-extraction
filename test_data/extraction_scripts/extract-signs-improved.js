const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

class ImprovedSignExtractor {
  constructor(apiKey) {
    this.client = new vision.ImageAnnotatorClient({
      credentials: {
        private_key: apiKey.replace(/\\n/g, '\n'),
        client_email: 'dummy@email.com',
      },
    });
  }

  async extractFromImage(imagePath, pdfName) {
    console.log(`Processing: ${pdfName}`);
    
    const [result] = await this.client.textDetection(imagePath);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return { signs: [], allText: [] };
    }

    // Get image dimensions from the file
    const imageData = fs.readFileSync(imagePath);
    // For now, we'll use the dimensions from our existing results
    const imageWidth = 6048;
    const imageHeight = 4320;

    console.log(`  Found ${detections.length} total text annotations`);

    const allText = [];
    const potentialSigns = [];

    // Skip the first detection (it's the full text block)
    for (let i = 1; i < detections.length; i++) {
      const detection = detections[i];
      const text = detection.description;
      const vertices = detection.boundingPoly.vertices;
      
      if (!vertices || vertices.length < 4) continue;

      const bounds = this.calculateBounds(vertices);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      const textInfo = {
        text: text,
        vertices: vertices,
        bounds: bounds,
        x_percentage: (centerX / imageWidth) * 100,
        y_percentage: (centerY / imageHeight) * 100,
        width_percentage: (bounds.width / imageWidth) * 100,
        height_percentage: (bounds.height / imageHeight) * 100,
        aspectRatio: bounds.width / bounds.height,
        size: bounds.width * bounds.height
      };

      allText.push(textInfo);

      // Apply improved filtering for sign numbers
      if (this.isLikelySignNumber(textInfo)) {
        potentialSigns.push(textInfo);
      }
    }

    return { signs: potentialSigns, allText: allText };
  }

  calculateBounds(vertices) {
    const xs = vertices.map(v => v.x || 0);
    const ys = vertices.map(v => v.y || 0);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }

  isLikelySignNumber(textInfo) {
    const { text, x_percentage, aspectRatio, width_percentage, height_percentage } = textInfo;
    
    // Pattern matching - look for sign number patterns
    const signPatterns = [
      /^\d{4}$/, // 4-digit numbers like 2001, 2002
      /^\d{4}\.\d+$/, // 4-digit with decimal like 2001.1, 2002.1
      /^[A-Z]{2,3}-\d+\.\d+$/, // Sign codes like BC-1.0, ID-5.3
    ];

    const matchesPattern = signPatterns.some(pattern => pattern.test(text.trim()));
    if (!matchesPattern) return false;

    // Location filtering - exclude legend/metadata area (usually right side)
    if (x_percentage > 75) {
      console.log(`    Excluding "${text}" - in legend area (${x_percentage.toFixed(1)}%)`);
      return false;
    }

    // Size filtering based on typical sign number characteristics
    // From your example, sign numbers should be reasonably sized
    if (width_percentage < 0.5 || width_percentage > 10) {
      console.log(`    Excluding "${text}" - width too small/large (${width_percentage.toFixed(2)}%)`);
      return false;
    }

    if (height_percentage < 0.3 || height_percentage > 8) {
      console.log(`    Excluding "${text}" - height too small/large (${height_percentage.toFixed(2)}%)`);
      return false;
    }

    // Aspect ratio filtering - sign numbers should be horizontally oriented text
    if (aspectRatio < 0.5) { // Very tall text (like the "888" we found)
      console.log(`    Excluding "${text}" - aspect ratio too vertical (${aspectRatio.toFixed(1)})`);
      return false;
    }

    console.log(`    ✓ Found potential sign: "${text}" at (${x_percentage.toFixed(1)}%, ${textInfo.y_percentage.toFixed(1)}%)`);
    return true;
  }
}

// Main execution
async function main() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_VISION_API_KEY not found in environment');
    process.exit(1);
  }

  const extractor = new ImprovedSignExtractor(apiKey);
  const imagePath = 'test_data/extraction_results/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png';
  
  try {
    const result = await extractor.extractFromImage(imagePath, 'PDF 13');
    
    console.log(`\n=== Results ===`);
    console.log(`Total text annotations: ${result.allText.length}`);
    console.log(`Potential sign numbers: ${result.signs.length}`);
    
    if (result.signs.length > 0) {
      console.log('\n=== Detected Signs ===');
      result.signs.forEach((sign, i) => {
        console.log(`${i+1}. "${sign.text}"`);
        console.log(`   Position: (${sign.x_percentage.toFixed(1)}%, ${sign.y_percentage.toFixed(1)}%)`);
        console.log(`   Size: ${sign.width_percentage.toFixed(2)}% x ${sign.height_percentage.toFixed(2)}%`);
        console.log(`   Aspect ratio: ${sign.aspectRatio.toFixed(1)}`);
      });
    }

    // Save detailed results
    fs.writeFileSync('test_data/extraction_results/improved_extraction.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      totalAnnotations: result.allText.length,
      signCount: result.signs.length,
      signs: result.signs,
      allText: result.allText.slice(0, 20) // Save first 20 for debugging
    }, null, 2));
    
    console.log('\\nDetailed results saved to improved_extraction.json');
    
  } catch (error) {
    console.error('Error during extraction:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ImprovedSignExtractor };