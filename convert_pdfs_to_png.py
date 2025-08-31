#!/usr/bin/env python3
"""
Convert PDF floor plans to PNG images with ALL text, annotations, and graphics visible.
This script creates high-quality PNG images suitable for the validation interface.
"""

import os
import sys
import fitz  # PyMuPDF
from pathlib import Path

def convert_pdf_to_png(pdf_path, output_dir, dpi=200):
    """
    Convert a PDF file to PNG images with all content visible.
    
    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save PNG images
        dpi: Resolution for the output images (default 200 for high quality)
    """
    # Open the PDF
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Error opening {pdf_path}: {e}")
        return False
    
    # Get the base filename without extension
    base_name = Path(pdf_path).stem
    
    print(f"Converting {Path(pdf_path).name} ({doc.page_count} pages)...")
    
    # Convert each page
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)
        
        # Create a matrix for the desired DPI
        # Default PDF resolution is 72 DPI, so we scale accordingly
        zoom = dpi / 72.0
        matrix = fitz.Matrix(zoom, zoom)
        
        # Render the page to a pixmap with all content
        # alpha=False ensures we get a white background
        # annots=True includes all annotations
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        
        # Generate output filename
        # Page numbers in PDF are 0-indexed, but we'll use 1-indexed for clarity
        output_filename = f"{base_name}_page_{page_num + 1}_full.png"
        output_path = os.path.join(output_dir, output_filename)
        
        # Save the image
        try:
            pixmap.save(output_path)
            print(f"  ✓ Page {page_num + 1} saved as {output_filename}")
        except Exception as e:
            print(f"  ✗ Error saving page {page_num + 1}: {e}")
    
    doc.close()
    return True

def main():
    """Main function to convert all PDFs in test_data/pdf_plans/"""
    
    # Define paths
    project_root = Path(__file__).parent
    pdf_dir = project_root / "test_data" / "pdf_plans"
    output_dir = project_root / "public" / "plans"
    
    # Ensure directories exist
    if not pdf_dir.exists():
        print(f"Error: PDF directory not found: {pdf_dir}")
        sys.exit(1)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # List of PDFs to process
    pdf_files = [
        "000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf",
        "000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf",
        "000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9.pdf"
    ]
    
    # Also look for additional PDFs mentioned in the request
    additional_pdfs = [
        "000_FTY02_SLPs_ILOT_Signage_Typical_IERIBR.pdf",
        "FTY02-A-S-01-7.pdf",
        "FTY02-A-S-01-6.pdf",
        "FTY02-A-S-01-2.pdf"
    ]
    
    # Combine all PDFs to process
    all_pdfs = pdf_files + additional_pdfs
    
    print("=" * 60)
    print("PDF to PNG Converter - Full Content Preservation")
    print("=" * 60)
    print(f"PDF Directory: {pdf_dir}")
    print(f"Output Directory: {output_dir}")
    print(f"Resolution: 200 DPI")
    print("=" * 60)
    
    # Process each PDF
    converted_count = 0
    for pdf_filename in all_pdfs:
        pdf_path = pdf_dir / pdf_filename
        
        if not pdf_path.exists():
            print(f"⚠ Skipping {pdf_filename} (not found)")
            continue
        
        if convert_pdf_to_png(pdf_path, output_dir, dpi=200):
            converted_count += 1
        print()
    
    # Also process any other PDFs in the directory not in our list
    print("Checking for additional PDFs...")
    for pdf_path in pdf_dir.glob("*.pdf"):
        if pdf_path.name not in all_pdfs:
            print(f"Found additional PDF: {pdf_path.name}")
            if convert_pdf_to_png(pdf_path, output_dir, dpi=200):
                converted_count += 1
            print()
    
    print("=" * 60)
    print(f"✅ Conversion complete! {converted_count} PDFs processed.")
    print(f"PNG images saved to: {output_dir}")
    print("=" * 60)
    
    # Special note about the PDF13 and PDF14 images
    print("\nNote: For the validation interface:")
    print("  - PDF13 should use: 000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1_full.png")
    print("  - PDF14 should use: 000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14_page_1_full.png")

if __name__ == "__main__":
    main()