#!/usr/bin/env python3
"""
Interactive color tuning utility for finding optimal HSV ranges
"""

import cv2
import numpy as np
from pathlib import Path
from pdf2image import convert_from_path
import sys

def tune_hsv_ranges():
    """Interactive HSV range tuning for sign detection"""
    
    # Convert first page of PDF to image for testing
    pdf_path = Path(__file__).parent.parent / "000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf"
    
    if not pdf_path.exists():
        print(f"PDF not found at: {pdf_path}")
        return
        
    print("Converting PDF page 1 to image for color tuning...")
    images = convert_from_path(str(pdf_path), dpi=200, first_page=1, last_page=1)
    
    if not images:
        print("Failed to convert PDF")
        return
        
    # Convert PIL image to OpenCV format
    pil_image = images[0]
    img_array = np.array(pil_image)
    image = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # Resize for display if too large
    max_width = 1200
    if image.shape[1] > max_width:
        scale = max_width / image.shape[1]
        new_height = int(image.shape[0] * scale)
        image = cv2.resize(image, (max_width, new_height))
    
    # Convert to HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Create window
    window_name = 'HSV Color Range Tuning - Press Q to quit, S to save values'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    
    # Default values for orange/brown colors
    default_values = {
        'H Min': 8, 'S Min': 80, 'V Min': 80,
        'H Max': 25, 'S Max': 255, 'V Max': 220
    }
    
    # Create trackbars
    cv2.createTrackbar('H Min', window_name, default_values['H Min'], 180, lambda x: None)
    cv2.createTrackbar('S Min', window_name, default_values['S Min'], 255, lambda x: None)
    cv2.createTrackbar('V Min', window_name, default_values['V Min'], 255, lambda x: None)
    cv2.createTrackbar('H Max', window_name, default_values['H Max'], 180, lambda x: None)
    cv2.createTrackbar('S Max', window_name, default_values['S Max'], 255, lambda x: None)
    cv2.createTrackbar('V Max', window_name, default_values['V Max'], 255, lambda x: None)
    
    print("\nInstructions:")
    print("- Adjust trackbars to highlight orange/brown sign boxes")
    print("- Press 'S' to save current values")
    print("- Press 'R' to reset to defaults")
    print("- Press 'Q' to quit")
    print("\nCurrent values will be displayed in the console")
    
    while True:
        # Get trackbar values
        h_min = cv2.getTrackbarPos('H Min', window_name)
        s_min = cv2.getTrackbarPos('S Min', window_name)
        v_min = cv2.getTrackbarPos('V Min', window_name)
        h_max = cv2.getTrackbarPos('H Max', window_name)
        s_max = cv2.getTrackbarPos('S Max', window_name)
        v_max = cv2.getTrackbarPos('V Max', window_name)
        
        # Create mask
        lower = np.array([h_min, s_min, v_min])
        upper = np.array([h_max, s_max, v_max])
        mask = cv2.inRange(hsv, lower, upper)
        
        # Apply morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        mask_clean = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Find contours to show detected regions
        contours, _ = cv2.findContours(mask_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Create result image
        result = cv2.bitwise_and(image, image, mask=mask)
        
        # Draw contours on a copy
        contour_img = image.copy()
        valid_contours = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            # Filter by size (adjust these based on your needs)
            if 10 < w < 200 and 10 < h < 100:
                cv2.rectangle(contour_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                valid_contours.append(contour)
        
        # Create display grid
        mask_colored = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
        top_row = np.hstack([image, mask_colored])
        bottom_row = np.hstack([result, contour_img])
        display = np.vstack([top_row, bottom_row])
        
        # Add labels
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(display, "Original", (10, 30), font, 1, (255, 255, 255), 2)
        cv2.putText(display, "Mask", (image.shape[1] + 10, 30), font, 1, (255, 255, 255), 2)
        cv2.putText(display, "Filtered", (10, image.shape[0] + 30), font, 1, (255, 255, 255), 2)
        cv2.putText(display, f"Detected: {len(valid_contours)} boxes", 
                   (image.shape[1] + 10, image.shape[0] + 30), font, 1, (0, 255, 0), 2)
        
        # Show display
        cv2.imshow(window_name, display)
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            print(f"\n{'='*50}")
            print("SAVED HSV RANGES:")
            print(f"HSV_LOWER_BOUND = np.array([{h_min}, {s_min}, {v_min}])")
            print(f"HSV_UPPER_BOUND = np.array([{h_max}, {s_max}, {v_max}])")
            print(f"Detected {len(valid_contours)} potential sign boxes")
            print(f"{'='*50}\n")
        elif key == ord('r'):
            # Reset to defaults
            for param, value in default_values.items():
                cv2.setTrackbarPos(param, window_name, value)
            print("Reset to default values")
            
    cv2.destroyAllWindows()
    
    # Print final values
    print(f"\nFinal HSV ranges:")
    print(f"HSV_LOWER_BOUND = np.array([{h_min}, {s_min}, {v_min}])")
    print(f"HSV_UPPER_BOUND = np.array([{h_max}, {s_max}, {v_max}])")

if __name__ == "__main__":
    tune_hsv_ranges()