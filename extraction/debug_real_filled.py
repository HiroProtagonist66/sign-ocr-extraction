#!/usr/bin/env python3
"""Debug OCR on actual filled boxes with text"""

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
debug_dir = Path("debug_real")
debug_dir.mkdir(exist_ok=True)

print(f"Found {len(boxes)} filled boxes")
print("Analyzing first 5 boxes...")

# Test first 5 boxes
for i, box in enumerate(boxes[:5]):
    x, y, w, h = box
    
    print(f"\nBox {i} at ({x}, {y}) size: {w}x{h}")
    
    # Extract the full box (no padding reduction)
    roi = image[y:y+h, x:x+w]
    
    # Save original
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_original.png"), roi)
    
    # Scale up 3x for better OCR
    scaled = cv2.resize(roi, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_scaled.png"), scaled)
    
    # Convert to grayscale
    gray = cv2.cvtColor(scaled, cv2.COLOR_BGR2GRAY)
    
    # Try different thresholds
    # For white text on colored background
    _, white_text = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_white.png"), white_text)
    
    # Inverted
    inv = cv2.bitwise_not(white_text)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_inv.png"), inv)
    
    # OTSU
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cv2.imwrite(str(debug_dir / f"box_{i:03d}_otsu.png"), otsu)
    
    # Try OCR on different versions
    configs = [
        ("PSM 7", "--psm 7"),
        ("PSM 8", "--psm 8"),
        ("PSM 8 digits", "--psm 8 -c tessedit_char_whitelist=0123456789.-"),
        ("PSM 11", "--psm 11"),
    ]
    
    for name, config in configs:
        # Try white text extraction
        text = pytesseract.image_to_string(white_text, config=config).strip()
        if text:
            print(f"  {name} (white): '{text}'")
            
        # Try inverted
        text = pytesseract.image_to_string(inv, config=config).strip()
        if text:
            print(f"  {name} (inv): '{text}'")
            
        # Try OTSU
        text = pytesseract.image_to_string(otsu, config=config).strip()
        if text:
            print(f"  {name} (otsu): '{text}'")

print(f"\nImages saved to {debug_dir}/")