# Claude.md - Extraction Pipeline

## Folder Purpose
Python-based extraction pipeline for detecting and extracting sign numbers from architectural floor plans using a hybrid approach: PDF embedded text extraction (primary), color-based box detection (fallback), and OCR (last resort).

## Key Files

### Core Extraction Scripts
- **pdf_text_extraction.py**: Primary extraction method using PyMuPDF to extract embedded text directly from PDFs. Achieves 98% accuracy when text is embedded.
- **color_based_extraction.py**: Fallback method using OpenCV HSV color detection to find sign boxes when embedded text fails.
- **extract_multiple_pdfs.py**: Batch processing coordinator that runs extraction on multiple PDFs and combines results.
- **extract_atl06.py**: ATL06-specific extractor for 57-page site (4,314 signs), uses embedded text only.

### Utilities & Debugging
- **tune_colors.py**: Interactive HSV color range tuner with trackbars for calibrating detection ranges.
- **debug_ocr.py**: OCR debugging tool for testing different Tesseract configurations.
- **debug_filled_boxes.py**: Tests detection of filled vs. outlined boxes.
- **find_filled_boxes.py**: Specialized detector for solid-filled sign boxes.
- **test_above_box.py**: Searches for text above detected boxes (sign numbers often appear above boxes).

### Output
- **output/**: Directory containing JSON extraction results and HTML visualizations
  - `combined_extraction_results.json`: Master file with all PDFs
  - `pdf*_extraction_results.json`: Individual PDF results
  - `*_visualization.html`: Interactive hotspot visualizations

## Extraction Patterns

### 1. Embedded Text Extraction (98% Accuracy)
```python
# Primary method - direct text extraction from PDF
# Pattern matches ALL 4-digit numbers (0001-9999)
SIGN_PATTERN = re.compile(r'^(\d{4})(?:\.\d+)?$')

doc = fitz.open(pdf_path)
for page in doc:
    text_instances = page.get_text("dict")
    for block in text_instances["blocks"]:
        if SIGN_PATTERN.match(text) and text != "0000":
            signs.append(create_hotspot(text, bbox))
```

### 2. Color Box Detection (84% Coverage)
```python
# Fallback - detect colored boxes as sign locations
hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
masks = []
for color_name, (lower, upper) in color_ranges.items():
    mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
    masks.append(mask)
combined_mask = cv2.bitwise_or(*masks)
contours = cv2.findContours(combined_mask, ...)
```

### 3. Stacked Box Splitting
```python
# Split tall boxes into individual sign units
if box_height > standard_height * 1.5:
    stack_count = round(box_height / standard_height)
    split_boxes = [(x, y + i*h, w, h) for i in range(stack_count)]
```

## Color Detection Ranges (HSV)

Current calibrated ranges for different sign box colors:
```python
COLOR_RANGES = {
    "orange": ([8, 80, 80], [25, 255, 220]),
    "dark_orange": ([5, 100, 100], [15, 255, 255]),
    "light_orange": ([10, 50, 150], [25, 150, 255]),
    "yellow": ([20, 100, 100], [35, 255, 255]),
    "green": ([45, 50, 50], [75, 255, 255]),
    "blue": ([100, 50, 50], [130, 255, 255]),
    "teal": ([160, 50, 50], [190, 255, 255]),
    "purple": ([140, 50, 50], [170, 255, 255])
}
```

## OCR Configuration

Tesseract PSM modes tested:
- **PSM 6**: Uniform block of text
- **PSM 7**: Single text line (best for sign numbers)
- **PSM 8**: Single word
- **PSM 11**: Sparse text without order
- **PSM 13**: Raw line

Current best configuration:
```python
custom_config = '--psm 7 -c tessedit_char_whitelist=0123456789.-'
```

## Known Issues

### OCR Not Working on Boxes
- **Issue**: 0% extraction rate from detected boxes
- **Cause**: Sign numbers are above/outside boxes, not inside
- **Solution**: Implement region search above each detected box
- **Files**: `test_above_box.py`, `debug_above/`

### Some Signs Not Detected
- **Issue**: ~16% of signs missing (25 out of 157)
- **Cause**: No colored box, just text on background
- **Solution**: Need pure text detection as third method

### Processing Speed
- **Current**: ~5 seconds per PDF page
- **Target**: <10 seconds per page
- **Bottleneck**: Image preprocessing and OCR attempts

## Debug Folders

- **debug_samples/**: Box region extracts with preprocessing variations
- **debug_filled/**: Tests for filled vs outlined boxes
- **debug_real/**: Real extraction samples with different thresholds
- **debug_above/**: Region above box for text detection
- **debug_color_ranges/**: Color mask visualizations

## Running Extraction

### Single PDF
```bash
python3 pdf_text_extraction.py ../test_data/pdf_plans/pdf13.pdf
```

### Multiple PDFs
```bash
python3 extract_multiple_pdfs.py
```

### Color Tuning
```bash
python3 tune_colors.py
# Use trackbars to adjust HSV ranges
# Press 's' to save ranges
```

### Debug OCR
```bash
python3 debug_ocr.py
# Tests different PSM modes and preprocessing
```

## Output Format

Standard JSON structure for extraction results:
```json
{
  "source_pdf": "path/to/pdf",
  "pdf_id": "pdf13",
  "pdf_name": "COLO 2 - Admin Level 1",
  "total_signs_detected": 157,
  "extraction_method": "embedded_text",
  "pages": [{
    "page": 1,
    "page_width": 3300,
    "page_height": 2550,
    "signs_detected": 157,
    "signs": [{
      "sign_number": "2001",
      "text_bbox": {"x": 100, "y": 200, "width": 50, "height": 30},
      "hotspot_bbox": {
        "x_percentage": 3.03,
        "y_percentage": 7.84,
        "width_percentage": 1.51,
        "height_percentage": 1.18
      },
      "confidence": "embedded"
    }]
  }]
}
```

## Future Improvements

1. **Text Region Search**: Search for text near detected boxes
2. **ML-Based Detection**: Train model on sign patterns
3. **Cloud OCR**: Integrate Google Vision or AWS Textract
4. **Parallel Processing**: Process multiple pages simultaneously
5. **Confidence Scoring**: Add reliability metrics to each detection

## Dependencies

```txt
opencv-python==4.8.1
pytesseract==0.3.10
PyMuPDF==1.23.8
numpy==1.24.3
Pillow==10.1.0
```

---
*Parent: `/sign-ocr-extraction/claude.md`*
*Last Updated: August 31, 2025*