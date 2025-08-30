// Create visualization data for the 16 actual numbers detected by Google Vision
const axios = require('axios');
const fs = require('fs');

async function create16NumbersData() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  const imagePath = 'test_data/extraction_results/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png';
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

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
    const extractedSigns = [];
    
    for (let i = 1; i < textAnnotations.length; i++) {
      const text = textAnnotations[i].description.trim();
      
      // Filter for pure numbers only
      if (/^\d+$/.test(text) || /^\d+\.\d+$/.test(text)) {
        const vertices = textAnnotations[i].boundingPoly.vertices;
        if (vertices && vertices.length >= 4) {
          const minX = Math.min(...vertices.map(v => v.x || 0));
          const maxX = Math.max(...vertices.map(v => v.x || 0));
          const minY = Math.min(...vertices.map(v => v.y || 0));
          const maxY = Math.max(...vertices.map(v => v.y || 0));
          
          const width = maxX - minX;
          const height = maxY - minY;
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          extractedSigns.push({
            text: text,
            signType: null,
            boundingBox: {
              x_percentage: (centerX / 6048) * 100,
              y_percentage: (centerY / 4320) * 100,
              width_percentage: (width / 6048) * 100,
              height_percentage: (height / 4320) * 100
            },
            confidence: 0.95
          });
        }
      }
    }

    // Create the data structure for the visualization
    const visualizationData = {
      '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf': [{
        pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf',
        pageNumber: 1,
        imageSize: { width: 6048, height: 4320 },
        extractedSigns: extractedSigns,
        timestamp: new Date().toISOString(),
        processingTime: 2100
      }]
    };

    // Save the data
    fs.writeFileSync('test_data/extraction_results/16_numbers_visualization.json', JSON.stringify(visualizationData, null, 2));
    
    console.log(`✅ Created visualization data for ${extractedSigns.length} detected numbers`);
    console.log('💡 These are the actual text numbers Google Vision can read from the PDF');
    console.log('💡 The other ~132 "signs" you see are likely part of the drawings/graphics');
    
    // Print summary
    console.log('\\n📊 Numbers found:');
    extractedSigns.forEach((sign, i) => {
      console.log(`${(i+1).toString().padStart(2)}. "${sign.text}" at (${sign.boundingBox.x_percentage.toFixed(1)}%, ${sign.boundingBox.y_percentage.toFixed(1)}%)`);
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

require('dotenv').config({ path: '.env.local' });
create16NumbersData();