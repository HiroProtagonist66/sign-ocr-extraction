#!/usr/bin/env python3
"""
Extract sign numbers from multiple PDFs and create a combined result
"""

import fitz  # PyMuPDF
import json
from pathlib import Path
from pdf_text_extraction import PDFTextExtractor
import logging
from pdf2image import convert_from_path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_all_pdfs():
    """Extract from all configured PDFs"""
    
    # Define PDFs to process
    pdfs = [
        {
            "id": "pdf13",
            "path": "../test_data/pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf",
            "image_path": "../public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png",
            "name": "COLO 2 - PDF 13",
            "description": "Floor Plan Page 13"
        },
        {
            "id": "pdf14",
            "path": "../test_data/pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf",
            "image_path": "../public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14_page_1.png",
            "name": "COLO 2 - PDF 14",
            "description": "Floor Plan Page 14"
        }
    ]
    
    # Combined results
    combined_results = {
        "extraction_method": "embedded_text",
        "pdfs": [],
        "total_signs_all_pdfs": 0,
        "comparison": {}
    }
    
    all_signs = {}
    
    for pdf_config in pdfs:
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {pdf_config['name']}")
        logger.info(f"Path: {pdf_config['path']}")
        logger.info(f"{'='*60}")
        
        if not Path(pdf_config['path']).exists():
            logger.error(f"PDF not found: {pdf_config['path']}")
            continue
        
        # Extract signs using existing extractor
        extractor = PDFTextExtractor(debug=True)
        results = extractor.extract_signs_from_pdf(pdf_config['path'])
        
        # Add metadata
        results['pdf_id'] = pdf_config['id']
        results['pdf_name'] = pdf_config['name']
        results['pdf_description'] = pdf_config['description']
        
        # Save individual results
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        
        individual_output = output_dir / f"{pdf_config['id']}_extraction_results.json"
        with open(individual_output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Saved individual results to {individual_output}")
        
        # Convert PDF to image if it doesn't exist
        image_path = Path(pdf_config['image_path'])
        if not image_path.exists():
            logger.info(f"Converting PDF to image...")
            try:
                images = convert_from_path(pdf_config['path'], dpi=400)
                if images:
                    # Save first page as PNG
                    image_path.parent.mkdir(parents=True, exist_ok=True)
                    images[0].save(str(image_path), 'PNG')
                    logger.info(f"Saved image to {image_path}")
            except Exception as e:
                logger.error(f"Failed to convert PDF to image: {e}")
        
        # Create visualization HTML
        if image_path.exists():
            html_output = output_dir / f"{pdf_config['id']}_visualization.html"
            extractor.create_visualization_html(results, str(image_path), str(html_output))
        
        # Add to combined results
        combined_results['pdfs'].append({
            'pdf_id': pdf_config['id'],
            'pdf_name': pdf_config['name'],
            'total_signs': results['total_signs_detected'],
            'results': results
        })
        
        combined_results['total_signs_all_pdfs'] += results['total_signs_detected']
        
        # Collect all signs for comparison
        all_signs[pdf_config['id']] = set()
        for page in results.get('pages', []):
            for sign in page.get('signs', []):
                all_signs[pdf_config['id']].add(sign['sign_number'])
    
    # Comparison analysis
    if len(all_signs) >= 2:
        pdf_ids = list(all_signs.keys())
        
        # Find common signs
        common_signs = all_signs[pdf_ids[0]]
        for pdf_id in pdf_ids[1:]:
            common_signs = common_signs.intersection(all_signs[pdf_id])
        
        # Find unique signs per PDF
        unique_signs = {}
        for pdf_id in pdf_ids:
            unique_to_this = all_signs[pdf_id].copy()
            for other_id in pdf_ids:
                if other_id != pdf_id:
                    unique_to_this = unique_to_this - all_signs[other_id]
            unique_signs[pdf_id] = sorted(list(unique_to_this))
        
        combined_results['comparison'] = {
            'common_signs': sorted(list(common_signs)),
            'common_count': len(common_signs),
            'unique_signs': unique_signs,
            'summary': {
                pdf_id: {
                    'total': len(all_signs[pdf_id]),
                    'unique': len(unique_signs[pdf_id])
                }
                for pdf_id in pdf_ids
            }
        }
    
    # Save combined results
    combined_output = output_dir / "combined_extraction_results.json"
    with open(combined_output, 'w') as f:
        json.dump(combined_results, f, indent=2)
    
    # Copy to public folder for web app
    public_output = Path("../public/extraction/combined_results.json")
    public_output.parent.mkdir(parents=True, exist_ok=True)
    with open(public_output, 'w') as f:
        json.dump(combined_results, f, indent=2)
    
    # Print summary
    print("\n" + "="*60)
    print("EXTRACTION COMPLETE - MULTIPLE PDFS")
    print("="*60)
    
    for pdf_data in combined_results['pdfs']:
        print(f"\n{pdf_data['pdf_name']}:")
        print(f"  Total signs: {pdf_data['total_signs']}")
    
    print(f"\nTotal across all PDFs: {combined_results['total_signs_all_pdfs']} signs")
    
    if combined_results.get('comparison'):
        comp = combined_results['comparison']
        print(f"\nComparison:")
        print(f"  Common signs: {comp['common_count']}")
        for pdf_id, summary in comp['summary'].items():
            print(f"  {pdf_id}: {summary['total']} total, {summary['unique']} unique")
    
    return combined_results

if __name__ == "__main__":
    extract_all_pdfs()