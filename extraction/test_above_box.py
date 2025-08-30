#!/usr/bin/env python3
"""Test OCR by looking above the boxes where sign numbers are"""

import cv2
import numpy as np
import pytesseract
from pathlib import Path

# Load the image
image_path = "../public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
image = cv2.imread(image_path)

# Get the boxes from the color detection
from color_based_extraction import ColorBasedSignExtractor

extractor = ColorBasedSignExtractor(debug=True)
boxes = extractor.detect_color_boxes(image)

# Create debug directory
debug_dir = Path("debug_above")
debug_dir.mkdir(exist_ok=True)

print(f"Found {len(boxes)} boxes")
print("Testing OCR above first 5 boxes...")

# Test first 5 boxes
for i, box in enumerate(boxes[:5]):
    x, y, w, h = box
    
    # Look ABOVE the box
    vertical_padding = 50
    horizontal_padding = 20
    
    x_start = max(0, x - horizontal_padding)
    y_start = max(0, y - vertical_padding)
    x_end = min(image.shape[1], x + w + horizontal_padding)
    y_end = min(image.shape[0], y + h + 10)
    
    # Crop the region above the box
    roi_above = image[y_start:y_end, x_start:x_end]
    
    # Save the region
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_above.png"), roi_above)
    
    # Scale up
    scaled = cv2.resize(roi_above, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    # Convert to grayscale
    gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
    
    # Apply OTSU threshold
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_thresh.png"), thresh)
    
    print(f"\nBox {i} at ({x}, {y}):")
    
    # Try OCR
    configs = [
        "--psm 8 -c tessedit_char_whitelist=0123456789.-",
        "--psm 11 -c tessedit_char_whitelist=0123456789.-",
        "--psm 7",
        "--psm 8",
    ]
    
    for config in configs:
        try:
            text = pytesseract.image_to_string(thresh, config=config).strip()
            if text and any(c.isdigit() for c in text):
                print(f"  Config '{config[:10]}...': '{text}'")
        except:
            pass

print(f"\nImages saved to {debug_dir}/")