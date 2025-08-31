#!/usr/bin/env python3
"""Find the actual filled boxes with text by analyzing the image"""

import cv2
import numpy as np
from pathlib import Path

# Load the image
image_path = "../public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
image = cv2.imread(image_path)

# Convert to HSV
hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

# Based on the screenshot, the filled boxes appear to be:
# - Orange/brown filled boxes with WHITE text inside
# - Green/lime filled boxes with text
# Let's try different ranges

# Test different color ranges
test_ranges = [
    # Light orange/peach filled boxes
    ("Light Orange", np.array([5, 30, 150]), np.array([20, 150, 255])),
    # Darker orange
    ("Dark Orange", np.array([5, 150, 100]), np.array([25, 255, 255])),
    # Green/lime boxes
    ("Green", np.array([40, 30, 150]), np.array([80, 255, 255])),
    # Yellow/lime
    ("Yellow", np.array([20, 30, 150]), np.array([40, 255, 255])),
]

debug_dir = Path("debug_color_ranges")
debug_dir.mkdir(exist_ok=True)

for name, lower, upper in test_ranges:
    mask = cv2.inRange(hsv, lower, upper)
    
    # Apply morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter for reasonable box sizes
    valid_boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        # Look for boxes that could contain sign numbers
        if 50 < w < 200 and 20 < h < 100:
            aspect_ratio = w / h
            if 0.5 < aspect_ratio < 5:
                valid_boxes.append((x, y, w, h))
    
    print(f"{name}: Found {len(valid_boxes)} potential boxes")
    
    # Create visualization
    vis = image.copy()
    for x, y, w, h in valid_boxes[:20]:  # Show first 20
        cv2.rectangle(vis, (x, y), (x+w, y+h), (0, 255, 0), 2)
    
    # Save visualization
    output_path = debug_dir / f"{name.lower().replace(' ', '_')}_detection.jpg"
    cv2.imwrite(str(output_path), vis)
    
    # Save mask
    mask_path = debug_dir / f"{name.lower().replace(' ', '_')}_mask.jpg"
    cv2.imwrite(str(mask_path), mask)

print(f"\nVisualizations saved to {debug_dir}/")

# Also try to find text regions using different approach
print("\nLooking for text regions...")

# Convert to grayscale
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# Apply threshold to get text regions
_, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

# Find connected components
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)

text_regions = []
for i in range(1, num_labels):
    x, y, w, h, area = stats[i]
    # Filter for text-sized regions
    if 10 < w < 150 and 10 < h < 50 and area > 50:
        text_regions.append((x, y, w, h))

print(f"Found {len(text_regions)} potential text regions")

# Visualize text regions
vis_text = image.copy()
for x, y, w, h in text_regions[:50]:  # Show first 50
    cv2.rectangle(vis_text, (x, y), (x+w, y+h), (255, 0, 0), 1)

cv2.imwrite(str(debug_dir / "text_regions.jpg"), vis_text)