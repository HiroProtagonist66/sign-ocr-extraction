// Convert PDF to high-quality images optimized for OCR
const { pdfToPng } = require('pdf-to-png-converter');
const fs = require('fs');
const path = require('path');

async function convertHighQuality() {
  const pdfPath = 'test_data/pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf';
  
  console.log('🔄 Converting PDF to high-quality images for better OCR...');
  
  try {
    // Try multiple quality settings
    const qualitySettings = [
      { scale: 4.0, name: 'ultra_high', description: '4x scale for ultra-high quality' },
      { scale: 6.0, name: 'extreme', description: '6x scale for extreme quality' },
      { scale: 8.0, name: 'maximum', description: '8x scale for maximum quality' }
    ];

    for (const setting of qualitySettings) {
      console.log(`\n📈 Testing ${setting.description}...`);
      
      const outputDir = `test_data/extraction_results/quality_test_${setting.name}`;
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      try {
        const pngPages = await pdfToPng(pdfPath, {
          disableFontFace: false,
          useSystemFonts: true, // Enable system fonts
          viewportScale: setting.scale,
          outputFolder: outputDir,
          outputFileMaskFunc: (pageNum) => `pdf13_${setting.name}_page_${pageNum}`,
          verbosityLevel: 0,
        });

        console.log(`✅ ${setting.name}: Generated ${pngPages.length} pages`);
        if (pngPages.length > 0) {
          const imagePath = pngPages[0].path;
          const stats = fs.statSync(imagePath);
          console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          
          // Get image dimensions (approximate)
          const dimensions = getApproxImageSize(setting.scale);
          console.log(`   Estimated dimensions: ${dimensions.width}x${dimensions.height}`);
        }
      } catch (error) {
        console.log(`❌ ${setting.name}: Failed - ${error.message}`);
      }
    }

    console.log('\n🎯 Recommendation:');
    console.log('1. Try 4x scale first (good balance of quality vs file size)');
    console.log('2. If still inaccurate, try 6x or 8x scale');
    console.log('3. Consider using ImageMagick for TIFF conversion');
    console.log('4. May need image preprocessing (contrast, sharpening)');

  } catch (error) {
    console.error('💥 Conversion failed:', error.message);
  }
}

function getApproxImageSize(scale) {
  // Base dimensions from our current 2x conversion: 6048x4320
  const baseWidth = 6048 / 2; // Original at 1x would be ~3024
  const baseHeight = 4320 / 2; // Original at 1x would be ~2160
  return {
    width: Math.round(baseWidth * scale),
    height: Math.round(baseHeight * scale)
  };
}

convertHighQuality();