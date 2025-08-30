// Convert PDF using ImageMagick for optimal OCR results
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function convertWithImageMagick() {
  const pdfPath = 'test_data/pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf';
  const outputDir = 'test_data/extraction_results/imagemagick_conversion';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🔄 Converting PDF with ImageMagick for optimal OCR...');

  // Different ImageMagick settings optimized for OCR
  const conversions = [
    {
      name: 'ocr_optimized',
      description: 'OCR-optimized: high DPI, enhanced contrast',
      command: `convert -density 300 -colorspace gray -normalize -enhance -sharpen 0x1 "${pdfPath}" "${outputDir}/ocr_optimized_%d.png"`
    },
    {
      name: 'high_contrast',
      description: 'High contrast: black/white text enhancement',
      command: `convert -density 400 -colorspace gray -normalize -black-threshold 40% -white-threshold 60% "${pdfPath}" "${outputDir}/high_contrast_%d.png"`
    },
    {
      name: 'ultra_sharp',
      description: 'Ultra sharp: maximum text clarity',
      command: `convert -density 600 -colorspace gray -normalize -unsharp 0x1 -enhance "${pdfPath}" "${outputDir}/ultra_sharp_%d.png"`
    }
  ];

  const results = [];

  for (const conversion of conversions) {
    console.log(`\n📈 ${conversion.description}...`);
    
    try {
      const startTime = Date.now();
      await execAsync(conversion.command);
      const endTime = Date.now();
      
      // Check if file was created
      const expectedFile = `${outputDir}/${conversion.name}_0.png`;
      if (fs.existsSync(expectedFile)) {
        const stats = fs.statSync(expectedFile);
        const fileSize = (stats.size / 1024 / 1024).toFixed(2);
        
        console.log(`✅ ${conversion.name}: Success`);
        console.log(`   File size: ${fileSize} MB`);
        console.log(`   Processing time: ${((endTime - startTime) / 1000).toFixed(1)}s`);
        
        results.push({
          name: conversion.name,
          file: expectedFile,
          size_mb: fileSize,
          success: true
        });
      } else {
        console.log(`❌ ${conversion.name}: File not created`);
      }
      
    } catch (error) {
      console.log(`❌ ${conversion.name}: Failed - ${error.message}`);
      results.push({
        name: conversion.name,
        success: false,
        error: error.message
      });
    }
  }

  console.log('\n🎯 ImageMagick Conversion Summary:');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}: Ready for OCR testing (${result.size_mb} MB)`);
    } else {
      console.log(`❌ ${result.name}: Failed`);
    }
  });

  if (results.some(r => r.success)) {
    console.log('\n🚀 Next Steps:');
    console.log('1. Test Google Vision API on ImageMagick conversions');
    console.log('2. Compare results with original pdf-to-png conversion');
    console.log('3. Pick the best format for production use');
  }

  return results;
}

convertWithImageMagick().catch(console.error);