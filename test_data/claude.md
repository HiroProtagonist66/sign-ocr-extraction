# Claude.md - Test Data & Scripts

## Folder Purpose
Contains source PDFs, extraction results, and Node.js scripts for processing and analyzing sign data. This folder serves as the data layer between Python extraction and web visualization.

## Folder Structure

### Source Data (`/pdf_plans/`)
Original PDF floor plans from Microsoft datacenter projects:
- **pdf13.pdf**: COLO 2 - Admin Level 1 (157 signs)
- **pdf14.pdf**: COLO 2 - Service Level (145 signs)  
- **pdf9.pdf**: COLO 2 - Equipment areas (112 signs)

### Extraction Results (`/extraction_results/`)
JSON outputs from various extraction attempts:
- **combined_results.json**: Master file combining all PDFs
- **all_extraction_results.json**: Complete extraction with all methods
- **calibrated_extraction_results.json**: Manual coordinate verification
- **fixed_coordinates.json**: Ground truth for testing

PNG conversions at 400 DPI:
- **[pdf_name]_page_1.png**: High-res images for web display
- **[pdf_name]_page_1_results.json**: Extraction results per image

### Processing Scripts (`/extraction_scripts/`)
Node.js utilities for data manipulation and analysis.

## Key Scripts

### Data Analysis
```javascript
// analyze-existing-extraction.js
// Analyzes extraction accuracy and coverage
const results = require('../extraction_results/combined_results.json');
const stats = {
  total_signs: results.pdfs.reduce((sum, pdf) => sum + pdf.total_signs_detected, 0),
  average_confidence: calculateAverageConfidence(results),
  missing_signs: findMissingSigns(results, groundTruth)
};
```

### Coordinate Calibration
```javascript
// calibrate-coordinates.js
// Adjusts coordinates based on manual verification
function calibrateCoordinates(sign, calibrationData) {
  return {
    ...sign,
    hotspot_bbox: {
      x_percentage: sign.hotspot_bbox.x_percentage + calibrationData.x_offset,
      y_percentage: sign.hotspot_bbox.y_percentage + calibrationData.y_offset,
      width_percentage: sign.hotspot_bbox.width_percentage * calibrationData.scale,
      height_percentage: sign.hotspot_bbox.height_percentage * calibrationData.scale
    }
  };
}
```

### Format Conversion
```javascript
// format-for-demo.js
// Converts extraction results for demo interface
function formatForDemo(extractionResults) {
  return {
    project: "COLO 2",
    floors: groupByFloor(extractionResults),
    statistics: generateStatistics(extractionResults),
    timestamp: new Date().toISOString()
  };
}
```

### Text Extraction
```javascript
// extract-all-text.js
// Extracts all text from PDFs for analysis
const { exec } = require('child_process');
exec('pdftotext -layout input.pdf output.txt', (error, stdout) => {
  const signs = extractSignNumbers(stdout);
  console.log(`Found ${signs.length} potential sign numbers`);
});
```

## Data Formats

### Extraction Result Schema
```json
{
  "source_pdf": "string",
  "pdf_id": "string",
  "pdf_name": "string",
  "pdf_description": "string",
  "total_signs_detected": "number",
  "extraction_method": "embedded_text|color_detection|ocr",
  "pages": [{
    "page": "number",
    "page_width": "number",
    "page_height": "number",
    "signs_detected": "number",
    "signs": [{
      "sign_number": "string",
      "text_bbox": {
        "x": "number",
        "y": "number",
        "width": "number",
        "height": "number"
      },
      "hotspot_bbox": {
        "x_percentage": "number",
        "y_percentage": "number",
        "width_percentage": "number",
        "height_percentage": "number"
      },
      "confidence": "embedded|high|medium|low"
    }]
  }]
}
```

### Ground Truth Format
```json
{
  "pdf_id": "pdf13",
  "expected_signs": [
    {"number": "2001", "floor": 1, "zone": "Admin"},
    {"number": "2001.1", "floor": 1, "zone": "Admin"},
    {"number": "2001.2", "floor": 1, "zone": "Admin"}
  ],
  "total_expected": 157
}
```

## Quality Metrics

### Current Performance
- **PDF13 (Admin)**: 157/157 signs (100% with embedded text)
- **PDF14 (Service)**: 145/145 signs (100% with embedded text)
- **PDF9 (Equipment)**: 112/112 signs (100% with embedded text)
- **Overall**: 414/414 signs detected (100% coverage)

### Accuracy Breakdown
- Embedded text extraction: 98% accurate
- Color box detection: 84% coverage
- OCR text recognition: 0% (needs improvement)

## Image Conversion

### PDF to PNG Conversion
```bash
# High quality conversion at 400 DPI
pdftoppm -png -r 400 -f 1 -l 1 input.pdf output

# ImageMagick alternative
convert -density 400 input.pdf[0] -quality 100 output.png
```

### Quality Test Folders
- **quality_test_extreme/**: 600 DPI ultra-high quality
- **quality_test_maximum/**: 500 DPI high quality
- **quality_test_ultra_high/**: 450 DPI balanced quality

## Known Data Issues

### Missing Signs
Some signs have no visual indicator:
- Text-only signs without boxes
- Signs in legend/key areas
- Signs in dense equipment areas

### Coordinate Drift
Small offset between PDF and PNG coordinates:
- X-axis: ~0.5% drift
- Y-axis: ~0.3% drift
- Solution: Calibration offset applied

### Duplicate Detection
Same sign detected multiple times:
- Cause: Multiple extraction methods
- Solution: Deduplication by coordinates

## Seed Data (`/seed_data/`)

### Database Population
```sql
-- populate-hotspots.sql
INSERT INTO hotspots (sign_number, x_percent, y_percent, width_percent, height_percent, pdf_id, confidence)
SELECT 
  sign_number,
  hotspot_bbox->>'x_percentage',
  hotspot_bbox->>'y_percentage',
  hotspot_bbox->>'width_percentage',
  hotspot_bbox->>'height_percentage',
  pdf_id,
  confidence
FROM json_populate_recordset(null::hotspots, 
  (SELECT json_agg(signs) FROM extraction_results)
);
```

## Testing Utilities

### Validation Script
```javascript
// validate-extraction.js
function validateExtraction(results) {
  const errors = [];
  
  // Check sign number format
  results.signs.forEach(sign => {
    if (!SIGN_PATTERN.test(sign.sign_number)) {
      errors.push(`Invalid sign number: ${sign.sign_number}`);
    }
  });
  
  // Check coordinate bounds
  results.signs.forEach(sign => {
    if (sign.hotspot_bbox.x_percentage < 0 || sign.hotspot_bbox.x_percentage > 100) {
      errors.push(`Coordinate out of bounds: ${sign.sign_number}`);
    }
  });
  
  return errors;
}
```

## Future Data Needs

1. **Additional PDFs**: Process remaining 4 projects
2. **Ground Truth**: Manual verification of all signs
3. **Training Data**: ML model for sign detection
4. **Validation Sets**: Test data for accuracy metrics
5. **Performance Benchmarks**: Processing time targets

## Running Scripts

```bash
# Analyze extraction results
node extraction_scripts/analyze-existing-extraction.js

# Calibrate coordinates
node extraction_scripts/calibrate-coordinates.js

# Format for demo
node extraction_scripts/format-for-demo.js

# Extract all text
node extraction_scripts/extract-all-text.js
```

---
*Parent: `/sign-ocr-extraction/claude.md`*
*Last Updated: August 31, 2025*