#!/usr/bin/env python3
"""
Simple runner script for the color-based extraction pipeline
"""

import sys
import os
from pathlib import Path
from color_based_extraction import ColorBasedSignExtractor, test_color_range
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_extraction():
    """Run the extraction on the COLO 2 PDF"""
    
    # Get the PDF path (assuming it's in the parent directory)
    pdf_path = Path(__file__).parent.parent / "000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf"
    
    if not pdf_path.exists():
        logger.error(f"PDF not found at: {pdf_path}")
        logger.info("Please ensure the PDF is in the project root directory")
        return
        
    logger.info(f"Processing PDF: {pdf_path}")
    
    # Create output directory
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    
    # Custom HSV ranges optimized for orange/brown sign boxes
    # These can be tuned using the tune_colors.py script
    hsv_lower = np.array([8, 80, 80])
    hsv_upper = np.array([25, 255, 220])
    
    # Create extractor with custom settings
    extractor = ColorBasedSignExtractor(
        hsv_lower=hsv_lower,
        hsv_upper=hsv_upper,
        debug=True
    )
    
    try:
        # Process the PDF
        results = extractor.process_pdf(str(pdf_path), str(output_dir))
        
        # Print summary
        print("\n" + "="*60)
        print("EXTRACTION COMPLETE")
        print("="*60)
        print(f"Total signs detected: {results['total_signs_detected']}")
        print(f"Output saved to: {output_dir}")
        print("\nDetailed results by page:")
        
        for page in results['pages']:
            print(f"\n  Page {page['page']}: {page['signs_detected']} signs")
            if page['signs_detected'] > 0:
                print("  Sample detections:")
                for sign in page['signs'][:5]:  # Show first 5 signs
                    print(f"    - {sign['sign_number']}: ({sign['bbox']['x_percentage']:.1f}%, {sign['bbox']['y_percentage']:.1f}%)")
                if page['signs_detected'] > 5:
                    print(f"    ... and {page['signs_detected'] - 5} more")
                    
        print(f"\nVisualization images saved to: {output_dir}")
        print(f"JSON results saved to: {output_dir / 'extraction_results.json'}")
        
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_extraction()