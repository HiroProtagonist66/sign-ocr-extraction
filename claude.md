# Claude.md - Project Assistant Instructions

## Project Overview
Sign OCR Extraction System for detecting and extracting sign numbers from architectural floor plans. The system needs to handle 13,000+ signs across 7 different projects with high accuracy.

## Current State (August 30, 2025 - Updated 6:25 PM)
- **Detected:** 132 sign boxes (improved from 116)
  - ✅ Multi-color detection expanded (orange, blue, teal, green, purple)
  - ✅ Stacked box detection working (12 stacks split into individual boxes)
  - ✅ Expanded HSV color ranges for better coverage
- **Extracted:** 0 signs via OCR (identified issue: text is outside boxes)
- **Total Signs:** 157 expected on COLO 2 plan
- **Coverage:** 84% detection rate (132/157)
- **Deployment:** Live at https://sign-ocr-extraction.vercel.app

### Key Discovery
- Sign numbers are NOT inside the colored boxes
- Boxes are empty containers, text appears to be separate
- Need different approach: detect boxes for location, then search nearby for text

## Color Detection Testing Plan

### Phase 1: Expand Color Detection Coverage
**Objective:** Detect ALL sign boxes regardless of outline color

#### Current Detection
- HSV Range: [8,80,80] to [25,255,220] (orange/brown)
- Detecting: 99 boxes
- Missing: Blue, teal, and green outlined boxes

#### Testing Steps
1. **Identify all outline colors:**
   ```python
   # Run tune_colors.py on different box types
   python3 extraction/tune_colors.py
   ```
   - Document HSV ranges for each color
   - Green outlines: H(45-75)
   - Blue outlines: H(100-130)  
   - Teal outlines: H(160-190)

2. **Implement multi-color detection:**
   ```python
   # Create multiple masks
   mask_orange = cv2.inRange(hsv, orange_lower, orange_upper)
   mask_blue = cv2.inRange(hsv, blue_lower, blue_upper)
   mask_teal = cv2.inRange(hsv, teal_lower, teal_upper)
   
   # Combine masks
   final_mask = mask_orange | mask_blue | mask_teal
   ```

3. **Test each color independently:**
   - Run extraction with single color
   - Count detected boxes
   - Verify no false positives

### Phase 2: Stacked Box Detection
**Objective:** Correctly count stacked signs as multiple units

#### Algorithm
```python
def detect_stacked_boxes(box, standard_height=40):
    """
    Detect if a box contains multiple stacked signs
    Standard sign height is approximately 40 pixels at 400 DPI
    """
    x, y, w, h = box
    
    # Check if height suggests stacking
    if h > standard_height * 1.5:
        stack_count = round(h / standard_height)
        boxes = []
        
        # Split into individual boxes
        for i in range(stack_count):
            new_y = y + (i * standard_height)
            boxes.append((x, new_y, w, standard_height))
        
        return boxes
    
    return [box]
```

#### Testing Steps
1. Identify all stacked boxes in visualization
2. Measure typical single box height
3. Test splitting algorithm on known stacks
4. Verify OCR on individual segments

### Phase 3: OCR Optimization
**Objective:** Extract sign numbers from detected boxes

#### Current Issues
- 0% extraction rate
- Possible causes: resolution, preprocessing, PSM mode

#### Testing Matrix
| PSM Mode | Preprocessing | Whitelist | Expected Use Case |
|----------|--------------|-----------|-------------------|
| 6 | Threshold | 0-9.- | Uniform blocks |
| 7 | Adaptive | 0-9 | Single lines |
| 8 | Denoise | Numeric | Single words |
| 11 | Contrast | 0-9.- | Sparse text |
| 13 | All combined | Alphanumeric | Raw lines |

#### Testing Steps
1. **Extract sample boxes:**
   ```python
   # Save individual box images for testing
   for i, box in enumerate(boxes[:10]):
       x, y, w, h = box
       roi = image[y:y+h, x:x+w]
       cv2.imwrite(f'test_box_{i}.jpg', roi)
   ```

2. **Test OCR configurations:**
   ```python
   configs = [
       '--psm 6 -c tessedit_char_whitelist=0123456789.-',
       '--psm 7 -c tessedit_char_whitelist=0123456789',
       '--psm 8 -c tessedit_char_whitelist=0123456789.-',
       '--psm 11 --oem 3',
   ]
   
   for config in configs:
       text = pytesseract.image_to_string(roi, config=config)
       print(f"Config: {config} -> Result: {text}")
   ```

3. **Preprocessing experiments:**
   - Resize image 2x, 3x, 4x
   - Binary threshold variations
   - Morphological operations
   - Edge detection + flood fill

### Phase 4: Validation & Metrics

#### Success Criteria
- [ ] Detect 150+ boxes (95% coverage)
- [ ] Extract 140+ sign numbers (90% OCR success)
- [ ] Process page in <15 seconds
- [ ] Zero false positives

#### Validation Dataset
Create ground truth for 10 sample areas:
```json
{
  "area_1": {
    "bounds": [100, 100, 500, 500],
    "expected_signs": ["2001", "2001.1", "2001.2"],
    "box_count": 3
  }
}
```

#### Metrics Tracking
```python
metrics = {
    "detection_rate": detected_boxes / expected_boxes,
    "ocr_success_rate": extracted_signs / detected_boxes,
    "false_positive_rate": false_positives / detected_boxes,
    "processing_time": end_time - start_time
}
```

## Implementation Priority

### Immediate (Today)
1. ✅ Create session summary
2. ✅ Expand color ranges for all outline colors
3. ✅ Implement stacked box detection
4. ✅ Test OCR with multiple PSM modes (6, 7, 8, 11)
5. ⏳ Investigate OCR preprocessing improvements

### Short-term (This Week)
1. Complete multi-color detection
2. Achieve 90%+ detection rate
3. Achieve 50%+ OCR extraction
4. Process all COLO 2 pages

### Medium-term (Next Week)
1. Process all 7 projects
2. Build correction interface
3. Export to standardized format
4. Create batch processing script

## Known Issues & Solutions

### Issue 1: Blue/Teal Outlines Not Detected
**Solution:** Add additional HSV ranges and combine masks

### Issue 2: Stacked Boxes Counted as One
**Solution:** Implement height-based splitting algorithm

### Issue 3: OCR Failing on Detected Boxes
**Solution:** Test different PSM modes and preprocessing

### Issue 4: Some Signs Have No Boxes
**Solution:** May need text-based detection as fallback

## Testing Commands

```bash
# Run color tuning interface
python3 extraction/tune_colors.py

# Process single image
python3 extraction/run_from_image.py

# Run full extraction
python3 extraction/run_extraction.py

# Start development server
npm run dev

# Deploy to Vercel
git push origin main
```

## File Structure
```
/extraction
  ├── color_based_extraction.py  # Main pipeline
  ├── tune_colors.py             # HSV tuning tool
  ├── run_from_image.py          # PNG processor
  └── output/                    # Results directory

/app/plans
  ├── calibrated/page.tsx        # Fixed coordinates view
  └── color-extraction/page.tsx  # Color detection view

/test_data/extraction_results
  ├── calibrated_extraction_results.json
  └── fixed_coordinates.json
```

## Notes for Next Session
1. Start with expanding color detection ranges
2. Test stacked box detection on known examples
3. Focus on OCR parameter tuning
4. Consider hybrid approach (color + text detection)
5. Build confidence scoring system

---
*Last Updated: August 30, 2025*
*Next Review: When detection rate reaches 95%*