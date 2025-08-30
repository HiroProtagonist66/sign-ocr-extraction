#!/usr/bin/env python3
"""
Run color-based extraction directly on PNG images
(Alternative when PDF is not available)
"""

import cv2
import numpy as np
from pathlib import Path
from color_based_extraction import ColorBasedSignExtractor
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_png_image():
    """Process the PNG image directly instead of PDF"""
    
    # Path to the PNG image
    image_path = Path(__file__).parent.parent / "public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
    
    if not image_path.exists():
        logger.error(f"Image not found at: {image_path}")
        return
        
    logger.info(f"Processing image: {image_path}")
    
    # Load the image
    image = cv2.imread(str(image_path))
    if image is None:
        logger.error("Failed to load image")
        return
        
    logger.info(f"Image loaded: {image.shape}")
    
    # Create output directory
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    
    # Custom HSV ranges for orange/brown sign boxes
    # These values target the orange/brown boxes on the floor plan
    hsv_lower = np.array([8, 80, 80])
    hsv_upper = np.array([25, 255, 220])
    
    # Create extractor
    extractor = ColorBasedSignExtractor(
        hsv_lower=hsv_lower,
        hsv_upper=hsv_upper,
        debug=True
    )
    
    # Process the image
    detections, boxes = extractor.process_image(image, page_num=1)
    
    # Create visualization
    vis_path = output_dir / "detected_signs.jpg"
    extractor.visualize_detections(image, detections, str(vis_path), boxes=boxes)
    
    logger.info(f"Created visualization with {len(boxes)} boxes and {len(detections)} OCR results")
    
    # Save results as JSON
    results = {
        "source_image": image_path.name,
        "image_dimensions": {
            "width": image.shape[1],
            "height": image.shape[0]
        },
        "total_signs_detected": len(detections),
        "signs": [d.to_dict() for d in detections]
    }
    
    json_path = output_dir / "image_extraction_results.json"
    with open(json_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print("\n" + "="*60)
    print("EXTRACTION COMPLETE")
    print("="*60)
    print(f"Image: {image_path.name}")
    print(f"Dimensions: {image.shape[1]}x{image.shape[0]}")
    print(f"Total signs detected: {len(detections)}")
    
    if detections:
        print("\nSample detections:")
        for sign in detections[:10]:
            print(f"  - {sign.sign_number}: ({sign.x_percentage:.1f}%, {sign.y_percentage:.1f}%)")
        if len(detections) > 10:
            print(f"  ... and {len(detections) - 10} more")
    
    print(f"\nVisualization saved to: {vis_path}")
    print(f"JSON results saved to: {json_path}")

if __name__ == "__main__":
    process_png_image()