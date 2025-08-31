#!/usr/bin/env python3
"""Check if the PDF has embedded text using PyMuPDF"""

import fitz  # PyMuPDF
import json
from pathlib import Path

def check_pdf_text(pdf_path):
    """Check if PDF has embedded text and extract it"""
    
    print(f"Checking PDF: {pdf_path}")
    print("=" * 60)
    
    # Open the PDF
    doc = fitz.open(pdf_path)
    
    print(f"PDF has {len(doc)} page(s)")
    
    all_text_found = []
    sign_numbers = []
    
    for page_num, page in enumerate(doc, 1):
        print(f"\n--- Page {page_num} ---")
        
        # Extract text from the page
        text = page.get_text()
        
        if text.strip():
            print(f"✓ Page {page_num} has embedded text ({len(text)} characters)")
            
            # Look for sign numbers (4-digit numbers like 2001, 2002, etc.)
            import re
            pattern = r'\b\d{4}(?:\.\d+)?\b'  # Matches 2001 or 2001.1
            matches = re.findall(pattern, text)
            
            if matches:
                print(f"  Found potential sign numbers: {matches[:10]}...")  # Show first 10
                sign_numbers.extend(matches)
            
            # Show first 500 characters of text
            preview = text[:500].replace('\n', ' ')
            print(f"  Text preview: {preview}...")
            
            all_text_found.append({
                "page": page_num,
                "text_length": len(text),
                "preview": text[:200],
                "sign_numbers_found": matches
            })
        else:
            print(f"✗ Page {page_num} has NO embedded text")
    
    # Get text with positions (useful for sign locations)
    print("\n" + "=" * 60)
    print("Checking for text with position information...")
    
    for page_num, page in enumerate(doc, 1):
        # Get text blocks with position
        blocks = page.get_text("blocks")
        
        sign_blocks = []
        for block in blocks:
            x0, y0, x1, y1, text, block_no, block_type = block
            
            # Look for blocks containing sign numbers
            if re.search(r'\b\d{4}(?:\.\d+)?\b', text):
                sign_blocks.append({
                    "text": text.strip(),
                    "bbox": [x0, y0, x1, y1],
                    "page": page_num
                })
        
        if sign_blocks:
            print(f"\nPage {page_num}: Found {len(sign_blocks)} text blocks with sign numbers")
            for i, block in enumerate(sign_blocks[:5]):  # Show first 5
                print(f"  {i+1}. '{block['text'][:50]}' at position ({block['bbox'][0]:.1f}, {block['bbox'][1]:.1f})")
    
    doc.close()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if all_text_found:
        print(f"✓ PDF HAS EMBEDDED TEXT")
        print(f"  Total unique sign numbers found: {len(set(sign_numbers))}")
        if sign_numbers:
            unique_signs = sorted(set(sign_numbers))
            print(f"  Sample sign numbers: {unique_signs[:20]}")
        
        # Save results
        results = {
            "has_embedded_text": True,
            "pages_with_text": len(all_text_found),
            "total_sign_numbers": len(set(sign_numbers)),
            "sample_signs": sorted(set(sign_numbers))[:50],
            "page_details": all_text_found
        }
        
        with open("pdf_text_analysis.json", "w") as f:
            json.dump(results, f, indent=2)
        print(f"\n  Detailed results saved to pdf_text_analysis.json")
        
    else:
        print(f"✗ PDF has NO embedded text - need to use OCR")
        results = {
            "has_embedded_text": False,
            "pages_with_text": 0,
            "total_sign_numbers": 0
        }
    
    return results

# Main execution
if __name__ == "__main__":
    pdf_path = "../test_data/pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf"
    
    if not Path(pdf_path).exists():
        print(f"Error: PDF not found at {pdf_path}")
    else:
        results = check_pdf_text(pdf_path)