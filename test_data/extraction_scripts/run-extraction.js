const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.keys(envConfig).forEach(key => {
    process.env[key] = envConfig[key];
  });
  console.log('Loaded environment variables from .env.local');
} else {
  console.error('.env.local file not found at:', envPath);
  process.exit(1);
}

// Check for required Google Vision API key
if (!process.env.GOOGLE_VISION_API_KEY) {
  console.error('GOOGLE_VISION_API_KEY not found in environment variables');
  console.error('Please add GOOGLE_VISION_API_KEY to your .env.local file');
  process.exit(1);
}

async function runExtraction() {
  console.log('=== Sign Extraction Runner ===');
  console.log('Starting extraction process...\n');

  // Compile TypeScript extraction script
  console.log('Compiling TypeScript extraction script...');
  try {
    execSync('npx tsc --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --skipLibCheck test_data/extraction_scripts/extract-signs.ts', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('TypeScript compilation failed:', error.message);
    process.exit(1);
  }

  // Import the compiled extraction script
  const SignExtractor = require('./extract-signs.js').default;

  // Set up paths
  const pdfDir = path.join(__dirname, '../pdf_plans');
  const outputDir = path.join(__dirname, '../extraction_results');
  
  console.log(`PDF directory: ${pdfDir}`);
  console.log(`Output directory: ${outputDir}`);

  // Check if PDF directory exists
  if (!fs.existsSync(pdfDir)) {
    console.error(`PDF directory not found: ${pdfDir}`);
    process.exit(1);
  }

  // Count PDF files
  const pdfFiles = fs.readdirSync(pdfDir).filter(file => file.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${pdfFiles.length} PDF files:`);
  pdfFiles.forEach(file => console.log(`  - ${file}`));
  
  if (pdfFiles.length === 0) {
    console.error('No PDF files found in the directory');
    process.exit(1);
  }

  console.log('\n');

  try {
    // Initialize extractor
    const extractor = new SignExtractor(
      process.env.GOOGLE_VISION_API_KEY,
      outputDir
    );

    // Process all PDFs
    console.log('Starting extraction process...');
    const startTime = Date.now();
    
    const results = await extractor.processAllPdfs(pdfDir);
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    // Generate summary
    extractor.generateSummary(results);

    console.log(`\n=== Processing Complete ===`);
    console.log(`Total processing time: ${totalTime.toFixed(2)} seconds`);
    console.log(`Results saved to: ${outputDir}`);
    
    // List output files
    console.log('\nGenerated files:');
    const outputFiles = fs.readdirSync(outputDir);
    outputFiles.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`  - ${file} (${sizeKB} KB)`);
    });

  } catch (error) {
    console.error('Extraction failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the extraction
runExtraction().then(() => {
  console.log('\n✅ Extraction completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Extraction failed:', error);
  process.exit(1);
});