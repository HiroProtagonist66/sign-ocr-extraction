#!/usr/bin/env python3
"""Debug OCR by saving sample boxes and trying different techniques"""

import cv2
import numpy as np
import pytesseract
from pathlib import Path
import json

# Load the image
image_path = "../public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
image = cv2.imread(image_path)

# Load the detection results to get box coordinates
with open("output/image_extraction_results.json", "r") as f:
    results = json.load(f)

# Get the boxes from the color detection
from color_based_extraction import ColorBasedSignExtractor

extractor = ColorBasedSignExtractor(debug=True)
boxes = extractor.detect_color_boxes(image)

# Create debug directory
debug_dir = Path("debug_samples")
debug_dir.mkdir(exist_ok=True)

print(f"Found {len(boxes)} boxes")
print("Saving first 10 boxes for debugging...")

# Save first 10 boxes as images
for i, box in enumerate(boxes[:10]):
    x, y, w, h = box
    
    # Add padding
    padding = 10
    x_start = max(0, x - padding)
    y_start = max(0, y - padding)
    x_end = min(image.shape[1], x + w + padding)
    y_end = min(image.shape[0], y + h + padding)
    
    # Crop the region
    roi = image[y_start:y_end, x_start:x_end]
    
    # Save original
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_original.png"), roi)
    
    # Scale up 2x
    scaled = cv2.resize(roi, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_scaled2x.png"), scaled)
    
    # Convert to grayscale
    gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_gray.png"), gray)
    
    # Apply OTSU threshold
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_thresh.png"), thresh)
    
    # Inverted
    inv = cv2.bitwise_not(thresh)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_thresh_inv.png"), inv)
    
    # Try OCR on different versions
    print(f"\nBox {i} at ({x}, {y}, {w}, {h}):")
    
    # Try different configs
    configs = [
        ("PSM 8 whitelist", "--psm 8 -c tessedit_char_whitelist=0123456789.-"),
        ("PSM 11 whitelist", "--psm 11 -c tessedit_char_whitelist=0123456789.-"),
        ("PSM 7", "--psm 7"),
        ("PSM 8", "--psm 8"),
    ]
    
    for name, config in configs:
        try:
            text = pytesseract.image_to_string(thresh, config=config).strip()
            if text:
                print(f"  {name} (thresh): '{text}'")
            
            text = pytesseract.image_to_string(inv, config=config).strip()
            if text:
                print(f"  {name} (inv): '{text}'")
        except:
            pass

print(f"\nSample images saved to {debug_dir}/")
print("Check the images to see what the OCR is trying to read")