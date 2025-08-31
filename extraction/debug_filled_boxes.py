#!/usr/bin/env python3
"""Debug OCR on filled orange boxes"""

import cv2
import numpy as np
import pytesseract
from pathlib import Path
from color_based_extraction import ColorBasedSignExtractor

# Load the image
image_path = "../public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
image = cv2.imread(image_path)

# Get the boxes from the color detection
extractor = ColorBasedSignExtractor(debug=True)
boxes = extractor.detect_color_boxes(image)

# Create debug directory
debug_dir = Path("debug_filled")
debug_dir.mkdir(exist_ok=True)

print(f"Found {len(boxes)} filled boxes")
print("Testing first 10 boxes...")

# Test first 10 boxes
for i, box in enumerate(boxes[:10]):
    x, y, w, h = box
    
    # Extract the box content (with small padding)
    padding = 5
    x_start = max(0, x + padding)
    y_start = max(0, y + padding)
    x_end = min(image.shape[1], x + w - padding)
    y_end = min(image.shape[0], y + h - padding)
    
    roi = image[y_start:y_end, x_start:x_end]
    
    # Save original
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_original.png"), roi)
    
    # Scale up
    scaled = cv2.resize(roi, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    # Convert to grayscale
    gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
    
    # Apply threshold
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_thresh.png"), thresh)
    
    # Inverted
    inv = cv2.bitwise_not(thresh)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_inv.png"), inv)
    
    print(f"\nBox {i} at ({x}, {y}, {w}, {h}):")
    
    # Try OCR
    configs = [
        ("PSM 8", "--psm 8 -c tessedit_char_whitelist=0123456789.-"),
        ("PSM 11", "--psm 11 -c tessedit_char_whitelist=0123456789.-"),
        ("PSM 7", "--psm 7"),
    ]
    
    for name, config in configs:
        try:
            # Try on inverted (white text on black)
            text = pytesseract.image_to_string(inv, config=config).strip()
            if text and any(c.isdigit() for c in text):
                print(f"  {name} (inv): '{text}'")
                
            # Try on normal threshold
            text = pytesseract.image_to_string(thresh, config=config).strip()
            if text and any(c.isdigit() for c in text):
                print(f"  {name} (thresh): '{text}'")
        except:
            pass

print(f"\nImages saved to {debug_dir}/")