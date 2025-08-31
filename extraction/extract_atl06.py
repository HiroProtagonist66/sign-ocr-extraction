#!/usr/bin/env python3
"""
Extract ALL sign numbers from ATL06_slp.pdf using ONLY embedded text extraction.
This uses the SAME successful method that achieved 98% accuracy on FTY02 PDFs.

NO color detection, NO OCR - just direct text extraction from the PDF.
"""

import os
import sys
import json
import re
import fitz  # PyMuPDF
from pathlib import Path
from datetime import datetime

# Sign number pattern - matches ALL 4-digit numbers (0001-9999)
# This covers all series: 0000s, 1000s, 2000s, 3000s, 4000s, etc.
# Note: \d{4} matches 0000-9999, but we exclude exactly "0000" in the extraction logic
SIGN_PATTERN = re.compile(r'^(\d{4})(?:\.\d+)?$')

def extract_text_from_page(page):
    """
    Extract embedded text from a PDF page using PyMuPDF.
    This is the SAME method that gave 98% accuracy on FTY02.
    
    Args:
        page: PyMuPDF page object
        
    Returns:
        List of dictionaries containing sign data
    """
    signs = []
    
    # Get text as dictionary (same as successful PDF13/14 extraction)
    text_dict = page.get_text("dict")
    
    # Get page dimensions
    page_rect = page.rect
    page_width = page_rect.width
    page_height = page_rect.height
    
    # Process each text block
    for block in text_dict.get("blocks", []):
        if block.get("type") == 0:  # Text block
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    
                    # Check if it matches our sign pattern
                    # Exclude exactly "0000" but include 0001-0999
                    if SIGN_PATTERN.match(text) and text != "0000":
                        bbox = span.get("bbox", [0, 0, 0, 0])
                        
                        # Create sign entry with hotspot coordinates
                        sign_data = {
                            "sign_number": text,
                            "text_bbox": {
                                "x": bbox[0],
                                "y": bbox[1],
                                "width": bbox[2] - bbox[0],
                                "height": bbox[3] - bbox[1]
                            },
                            "hotspot_bbox": {
                                "x_percentage": round((bbox[0] / page_width) * 100, 2),
                                "y_percentage": round((bbox[1] / page_height) * 100, 2),
                                "width_percentage": round(((bbox[2] - bbox[0]) / page_width) * 100, 2),
                                "height_percentage": round(((bbox[3] - bbox[1]) / page_height) * 100, 2)
                            },
                            "confidence": "embedded",
                            "page": page.number + 1  # 1-indexed page number
                        }
                        signs.append(sign_data)
    
    return signs

def save_page_as_png(page, output_path, dpi=200):
    """
    Save a PDF page as PNG image.
    
    Args:
        page: PyMuPDF page object
        output_path: Path to save the PNG
        dpi: Resolution for the output image
    """
    # Create matrix for desired DPI
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    
    # Render page to pixmap
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    
    # Save as PNG
    pixmap.save(output_path)

def extract_signs_from_atl06():
    """
    Main extraction function for ATL06_slp.pdf.
    Uses ONLY embedded text extraction - no color detection, no OCR.
    """
    
    # Set up paths
    project_root = Path(__file__).parent.parent
    pdf_path = project_root / "test_data" / "pdf_plans" / "ATL06_slp.pdf"
    
    # Create output directories
    extraction_output = project_root / "extraction" / "output" / "ATL06"
    png_output = project_root / "public" / "plans" / "ATL06"
    extraction_output.mkdir(parents=True, exist_ok=True)
    png_output.mkdir(parents=True, exist_ok=True)
    
    # Check if PDF exists
    if not pdf_path.exists():
        print(f"❌ Error: PDF not found at {pdf_path}")
        sys.exit(1)
    
    print("=" * 70)
    print("ATL06 Sign Extraction - Embedded Text Only")
    print("=" * 70)
    print(f"PDF: {pdf_path.name}")
    print(f"Method: PyMuPDF embedded text extraction (98% accuracy method)")
    print(f"Pattern: 4-digit numbers (0001-9999, excluding 0000)")
    print("=" * 70)
    
    # Open the PDF
    try:
        doc = fitz.open(str(pdf_path))
        total_pages = doc.page_count
        print(f"Total pages: {total_pages}")
        print("=" * 70)
    except Exception as e:
        print(f"❌ Error opening PDF: {e}")
        sys.exit(1)
    
    # Initialize results
    all_signs = []
    pages_with_signs = []
    page_results = []
    total_signs = 0
    
    # Process each page
    for page_num in range(total_pages):
        print(f"\nProcessing page {page_num + 1} of {total_pages}...", end=" ")
        
        try:
            page = doc.load_page(page_num)
            
            # Extract signs using embedded text
            page_signs = extract_text_from_page(page)
            
            if page_signs:
                # Found signs on this page
                pages_with_signs.append(page_num + 1)
                all_signs.extend(page_signs)
                total_signs += len(page_signs)
                
                print(f"✓ Found {len(page_signs)} signs")
                
                # Save page as PNG
                png_filename = f"page_{page_num + 1:02d}_full.png"
                png_path = png_output / png_filename
                save_page_as_png(page, str(png_path))
                print(f"  → Saved as {png_filename}")
                
                # Add to page results
                page_results.append({
                    "page_number": page_num + 1,
                    "signs_detected": len(page_signs),
                    "signs": page_signs,
                    "image_path": f"/plans/ATL06/{png_filename}"
                })
            else:
                print("✗ No signs found")
                
        except Exception as e:
            print(f"❌ Error on page {page_num + 1}: {e}")
    
    doc.close()
    
    # Prepare final results
    extraction_results = {
        "site": "ATL06",
        "pdf_name": "ATL06_slp.pdf",
        "extraction_method": "embedded_text",
        "extraction_date": datetime.now().isoformat(),
        "total_pages": total_pages,
        "pages_with_signs": pages_with_signs,
        "total_signs_detected": total_signs,
        "pages": page_results
    }
    
    # Save JSON results
    json_path = extraction_output / "extraction_results.json"
    with open(json_path, 'w') as f:
        json.dump(extraction_results, f, indent=2)
    print(f"\n✓ Saved extraction results to {json_path}")
    
    # Create summary report
    summary = f"""ATL06 Sign Extraction Summary
{'=' * 40}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
PDF: ATL06_slp.pdf
Method: Embedded Text Extraction (PyMuPDF)

Results:
--------
Total pages: {total_pages}
Pages with signs: {len(pages_with_signs)}
Total signs extracted: {total_signs}

Pages with signs: {', '.join(map(str, pages_with_signs[:20]))}{'...' if len(pages_with_signs) > 20 else ''}

Sign distribution:
"""
    
    # Analyze sign number ranges
    sign_ranges = {}
    for sign in all_signs:
        sign_num = sign['sign_number']
        if sign_num.isdigit():
            num = int(sign_num)
            if num < 1000:
                range_key = "0000s"  # 0001-0999
            else:
                thousand = (num // 1000) * 1000
                range_key = f"{thousand}s"
            sign_ranges[range_key] = sign_ranges.get(range_key, 0) + 1
    
    for range_key in sorted(sign_ranges.keys()):
        summary += f"  {range_key}: {sign_ranges[range_key]} signs\n"
    
    # Find pages that might need review (very few or very many signs)
    pages_for_review = []
    for page_result in page_results:
        count = page_result['signs_detected']
        if count < 5 or count > 50:
            pages_for_review.append(f"Page {page_result['page_number']} ({count} signs)")
    
    if pages_for_review:
        summary += f"\nPages that might need review:\n"
        for page_info in pages_for_review[:10]:
            summary += f"  - {page_info}\n"
    
    summary += f"\nExtraction completed successfully!\n"
    summary += f"Results saved to: {json_path}\n"
    summary += f"PNG images saved to: {png_output}\n"
    
    # Save summary
    summary_path = extraction_output / "extraction_summary.txt"
    with open(summary_path, 'w') as f:
        f.write(summary)
    
    print("\n" + "=" * 70)
    print(summary)
    print("=" * 70)
    
    return extraction_results

if __name__ == "__main__":
    extract_signs_from_atl06()