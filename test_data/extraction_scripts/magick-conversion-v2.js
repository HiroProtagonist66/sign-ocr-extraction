// Convert PDF using modern ImageMagick 'magick' command with Ghostscript
const { exec } = require('child_process');
const fs = require('fs');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function convertWithMagick() {
  const pdfPath = 'test_data/pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf';
  const outputDir = 'test_data/extraction_results/magick_conversion';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🔄 Converting PDF with ImageMagick v7 + Ghostscript...');

  // Optimized settings for sign number extraction
  const conversions = [
    {
      name: 'clean_ocr',
      description: 'Clean OCR: 300 DPI, grayscale, normalized',
      command: `magick -density 300 "${pdfPath}" -colorspace gray -normalize "${outputDir}/clean_ocr.png"`
    },
    {
      name: 'high_contrast',
      description: 'High contrast: enhanced text visibility',
      command: `magick -density 400 "${pdfPath}" -colorspace gray -normalize -contrast-stretch 1%x1% "${outputDir}/high_contrast.png"`
    },
    {
      name: 'ultra_clean',
      description: 'Ultra clean: maximum clarity for small text',
      command: `magick -density 600 "${pdfPath}" -colorspace gray -normalize -enhance -sharpen 0x0.5 "${outputDir}/ultra_clean.png"`
    }
  ];

  const results = [];

  for (const conversion of conversions) {
    console.log(`\n📈 ${conversion.description}...`);
    
    try {
      const startTime = Date.now();
      const result = await execAsync(conversion.command);
      const endTime = Date.now();
      
      // Check if file was created
      const expectedFile = `${outputDir}/${conversion.name}.png`;
      if (fs.existsSync(expectedFile)) {
        const stats = fs.statSync(expectedFile);
        const fileSize = (stats.size / 1024 / 1024).toFixed(2);
        
        console.log(`✅ ${conversion.name}: Success`);
        console.log(`   File: ${expectedFile}`);
        console.log(`   Size: ${fileSize} MB`);
        console.log(`   Time: ${((endTime - startTime) / 1000).toFixed(1)}s`);
        
        results.push({
          name: conversion.name,
          file: expectedFile,
          size_mb: parseFloat(fileSize),
          success: true,
          processing_time: (endTime - startTime) / 1000
        });
      } else {
        console.log(`❌ ${conversion.name}: File not created`);
      }
      
    } catch (error) {
      console.log(`❌ ${conversion.name}: Failed - ${error.message}`);
      results.push({
        name: conversion.name,
        success: false,
        error: error.message.substring(0, 100)
      });
    }
  }

  console.log('\n🎯 Conversion Results Summary:');
  const successful = results.filter(r => r.success);
  
  if (successful.length > 0) {
    console.log('✅ Successfully created:');
    successful.forEach(result => {
      console.log(`   ${result.name}: ${result.size_mb} MB (${result.processing_time.toFixed(1)}s)`);
    });
    
    console.log('\n🚀 Ready for OCR Testing!');
    console.log('These images should provide much better text extraction than the original.');
  } else {
    console.log('❌ All conversions failed. Check ImageMagick and Ghostscript installation.');
  }

  return successful;
}

convertWithMagick().catch(console.error);