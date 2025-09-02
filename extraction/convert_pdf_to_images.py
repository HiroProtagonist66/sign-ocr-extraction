#!/usr/bin/env python3
"""
Convert PDF pages to PNG images for web viewing
Optimized for sign extraction floor plans
"""

import fitz  # PyMuPDF
import os
from pathlib import Path
import json
from datetime import datetime

def convert_pdf_to_images(pdf_path, output_dir, dpi=150, prefix="page"):
    """
    Convert PDF pages to PNG images
    
    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save images
        dpi: Resolution for images (150 is good for web viewing)
        prefix: Prefix for image files (default: "page")
    
    Returns:
        dict: Conversion metadata including page count and dimensions
    """
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Check if PDF exists
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    
    print(f"Converting PDF: {pdf_path}")
    print(f"Output directory: {output_dir}")
    print(f"DPI: {dpi}")
    
    # Open PDF
    pdf = fitz.open(pdf_path)
    metadata = {
        "source_pdf": os.path.basename(pdf_path),
        "total_pages": len(pdf),
        "conversion_dpi": dpi,
        "conversion_date": datetime.now().isoformat(),
        "pages": []
    }
    
    # Convert each page
    for page_num in range(len(pdf)):
        page = pdf[page_num]
        
        # Set resolution
        mat = fitz.Matrix(dpi/72.0, dpi/72.0)
        pix = page.get_pixmap(matrix=mat)
        
        # Save as PNG
        output_filename = f"{prefix}_{page_num + 1:02d}.png"
        output_path = os.path.join(output_dir, output_filename)
        pix.save(output_path)
        
        # Store page metadata
        page_info = {
            "page_number": page_num + 1,
            "filename": output_filename,
            "width": pix.width,
            "height": pix.height,
            "original_width": page.rect.width,
            "original_height": page.rect.height
        }
        metadata["pages"].append(page_info)
        
        print(f"✓ Page {page_num + 1}/{len(pdf)} -> {output_filename} ({pix.width}x{pix.height}px)")
    
    pdf.close()
    
    # Save metadata
    metadata_path = os.path.join(output_dir, "conversion_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✅ Converted {len(metadata['pages'])} pages successfully")
    print(f"📄 Metadata saved to: {metadata_path}")
    
    return metadata

def batch_convert_pdfs(pdf_configs):
    """
    Convert multiple PDFs based on configuration
    
    Args:
        pdf_configs: List of dicts with pdf_path, output_dir, site_name
    """
    results = []
    
    for config in pdf_configs:
        try:
            print(f"\n{'='*50}")
            print(f"Processing {config.get('site_name', 'PDF')}")
            print(f"{'='*50}")
            
            metadata = convert_pdf_to_images(
                pdf_path=config['pdf_path'],
                output_dir=config['output_dir'],
                dpi=config.get('dpi', 150),
                prefix=config.get('prefix', 'page')
            )
            
            results.append({
                "site_name": config.get('site_name'),
                "status": "success",
                "metadata": metadata
            })
            
        except Exception as e:
            print(f"❌ Error processing {config.get('site_name')}: {e}")
            results.append({
                "site_name": config.get('site_name'),
                "status": "error",
                "error": str(e)
            })
    
    return results

if __name__ == "__main__":
    # Configuration for different sites
    pdf_configs = [
        {
            "site_name": "ATL06",
            "pdf_path": "../public/data/atl06/release.pdf",
            "output_dir": "../public/plans/atl06",
            "dpi": 150,
            "prefix": "page"
        },
        # Add more PDFs here as needed
        # {
        #     "site_name": "FTY02",
        #     "pdf_path": "../public/data/fty02/release.pdf",
        #     "output_dir": "../public/plans/fty02",
        #     "dpi": 150,
        #     "prefix": "page"
        # }
    ]
    
    # Check if we have the ATL06 PDF
    atl06_path = "../public/data/atl06/release.pdf"
    if not os.path.exists(atl06_path):
        print("⚠️  ATL06 PDF not found at expected location")
        print(f"   Looking for: {os.path.abspath(atl06_path)}")
        print("\nChecking for any PDFs in public/data/...")
        
        # Search for PDFs
        for root, dirs, files in os.walk("../public/data"):
            for file in files:
                if file.endswith('.pdf'):
                    full_path = os.path.join(root, file)
                    print(f"   Found: {full_path}")
                    
                    # Update config with found PDF
                    pdf_configs[0]["pdf_path"] = full_path
                    break
    
    # Run batch conversion
    print("\n🚀 Starting batch PDF conversion...")
    results = batch_convert_pdfs(pdf_configs)
    
    # Summary
    print(f"\n{'='*50}")
    print("CONVERSION SUMMARY")
    print(f"{'='*50}")
    for result in results:
        if result['status'] == 'success':
            pages = result['metadata']['total_pages']
            print(f"✅ {result['site_name']}: {pages} pages converted")
        else:
            print(f"❌ {result['site_name']}: {result['error']}")