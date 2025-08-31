#!/usr/bin/env python3
"""
Extract sign numbers and their precise locations from PDF embedded text using PyMuPDF
No OCR needed - direct text extraction with bounding boxes
"""

import fitz  # PyMuPDF
import json
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging
from dataclasses import dataclass, asdict
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sign number pattern: 4 digits optionally followed by .1, .2, etc.
SIGN_PATTERN = re.compile(r'^(\d{4}(?:\.\d+)?)$')

# Hotspot expansion factor (expand bounding box by this percentage)
HOTSPOT_EXPANSION = 0.3  # 30% expansion on all sides

@dataclass
class SignHotspot:
    """Represents a sign with its text location and expanded hotspot area"""
    sign_number: str
    page: int
    # Original text bounding box (pixels)
    text_x: float
    text_y: float
    text_width: float
    text_height: float
    # Expanded hotspot area (percentages)
    hotspot_x_percentage: float
    hotspot_y_percentage: float
    hotspot_width_percentage: float
    hotspot_height_percentage: float
    confidence: str = "embedded"  # Always "embedded" for PDF text
    
    def to_dict(self):
        return {
            "sign_number": self.sign_number,
            "text_bbox": {
                "x": round(self.text_x, 1),
                "y": round(self.text_y, 1),
                "width": round(self.text_width, 1),
                "height": round(self.text_height, 1)
            },
            "hotspot_bbox": {
                "x_percentage": round(self.hotspot_x_percentage, 2),
                "y_percentage": round(self.hotspot_y_percentage, 2),
                "width_percentage": round(self.hotspot_width_percentage, 2),
                "height_percentage": round(self.hotspot_height_percentage, 2)
            },
            "confidence": self.confidence
        }

class PDFTextExtractor:
    """Extract sign numbers from PDF embedded text with precise locations"""
    
    def __init__(self, debug=True):
        self.debug = debug
        self.signs = []
        
    def extract_signs_from_pdf(self, pdf_path: str) -> Dict:
        """Extract all sign numbers with their locations from PDF"""
        logger.info(f"Extracting text from PDF: {pdf_path}")
        
        doc = fitz.open(pdf_path)
        all_results = {
            "source_pdf": Path(pdf_path).name,
            "total_signs_detected": 0,
            "extraction_method": "embedded_text",
            "pages": []
        }
        
        for page_num, page in enumerate(doc, 1):
            logger.info(f"\nProcessing page {page_num}...")
            
            # Get page dimensions
            page_rect = page.rect
            page_width = page_rect.width
            page_height = page_rect.height
            
            # Extract signs from this page
            page_signs = self.extract_signs_from_page(page, page_num)
            
            # Convert to output format
            page_results = {
                "page": page_num,
                "page_width": round(page_width),
                "page_height": round(page_height),
                "signs_detected": len(page_signs),
                "signs": [sign.to_dict() for sign in page_signs]
            }
            
            all_results["pages"].append(page_results)
            all_results["total_signs_detected"] += len(page_signs)
            
            logger.info(f"Page {page_num}: Found {len(page_signs)} signs")
            
        doc.close()
        
        # Group nearby signs if needed
        all_results = self.group_nearby_signs(all_results)
        
        return all_results
    
    def extract_signs_from_page(self, page, page_num: int) -> List[SignHotspot]:
        """Extract sign numbers with bounding boxes from a single page"""
        signs = []
        
        # Get page dimensions for percentage calculation
        page_width = page.rect.width
        page_height = page.rect.height
        
        # Get detailed text dictionary with complete structure
        text_dict = page.get_text("dict")
        
        # Process all text blocks
        for block in text_dict.get("blocks", []):
            if block.get("type") == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        
                        # Check if this is a sign number
                        match = SIGN_PATTERN.match(text)
                        if match:
                            sign_number = match.group(1)
                            bbox = span.get("bbox", [0, 0, 0, 0])
                            
                            # Original text bounding box
                            text_x = bbox[0]
                            text_y = bbox[1]
                            text_width = bbox[2] - bbox[0]
                            text_height = bbox[3] - bbox[1]
                            
                            # Create expanded hotspot area
                            expansion_x = text_width * HOTSPOT_EXPANSION
                            expansion_y = text_height * HOTSPOT_EXPANSION
                            
                            hotspot_x = text_x - expansion_x
                            hotspot_y = text_y - expansion_y
                            hotspot_width = text_width + (2 * expansion_x)
                            hotspot_height = text_height + (2 * expansion_y)
                            
                            # Convert to percentages
                            hotspot_x_pct = (hotspot_x / page_width) * 100
                            hotspot_y_pct = (hotspot_y / page_height) * 100
                            hotspot_width_pct = (hotspot_width / page_width) * 100
                            hotspot_height_pct = (hotspot_height / page_height) * 100
                            
                            sign = SignHotspot(
                                sign_number=sign_number,
                                page=page_num,
                                text_x=text_x,
                                text_y=text_y,
                                text_width=text_width,
                                text_height=text_height,
                                hotspot_x_percentage=hotspot_x_pct,
                                hotspot_y_percentage=hotspot_y_pct,
                                hotspot_width_percentage=hotspot_width_pct,
                                hotspot_height_percentage=hotspot_height_pct
                            )
                            
                            signs.append(sign)
                            
                            if self.debug:
                                logger.debug(f"Found sign {sign_number} at ({text_x:.1f}, {text_y:.1f})")
        
        # Also check for signs using simpler text extraction as backup
        text_blocks = page.get_text("blocks")
        for block in text_blocks:
            x0, y0, x1, y1, text, block_no, block_type = block
            
            # Split text into lines and check each
            lines = text.strip().split('\n')
            for line in lines:
                line = line.strip()
                match = SIGN_PATTERN.match(line)
                if match:
                    sign_number = match.group(1)
                    
                    # Check if we already found this sign
                    if not any(s.sign_number == sign_number for s in signs):
                        # Calculate dimensions
                        text_width = x1 - x0
                        text_height = (y1 - y0) / len(lines)  # Approximate height per line
                        
                        # Create expanded hotspot
                        expansion_x = text_width * HOTSPOT_EXPANSION
                        expansion_y = text_height * HOTSPOT_EXPANSION
                        
                        hotspot_x = x0 - expansion_x
                        hotspot_y = y0 - expansion_y
                        hotspot_width = text_width + (2 * expansion_x)
                        hotspot_height = text_height + (2 * expansion_y)
                        
                        # Convert to percentages
                        hotspot_x_pct = (hotspot_x / page_width) * 100
                        hotspot_y_pct = (hotspot_y / page_height) * 100
                        hotspot_width_pct = (hotspot_width / page_width) * 100
                        hotspot_height_pct = (hotspot_height / page_height) * 100
                        
                        sign = SignHotspot(
                            sign_number=sign_number,
                            page=page_num,
                            text_x=x0,
                            text_y=y0,
                            text_width=text_width,
                            text_height=text_height,
                            hotspot_x_percentage=hotspot_x_pct,
                            hotspot_y_percentage=hotspot_y_pct,
                            hotspot_width_percentage=hotspot_width_pct,
                            hotspot_height_percentage=hotspot_height_pct
                        )
                        
                        signs.append(sign)
        
        return signs
    
    def group_nearby_signs(self, results: Dict, distance_threshold: float = 2.0) -> Dict:
        """Group signs that are very close together (e.g., 2001.1, 2001.2)"""
        
        for page_data in results["pages"]:
            signs = page_data["signs"]
            
            if len(signs) < 2:
                continue
                
            # Group signs by proximity
            groups = []
            used = set()
            
            for i, sign1 in enumerate(signs):
                if i in used:
                    continue
                    
                group = [sign1]
                used.add(i)
                
                # Check if sign is part of a series (e.g., 2001.1)
                base_number = sign1["sign_number"].split('.')[0]
                is_series = '.' in sign1["sign_number"]
                
                if is_series:
                    # Find other signs in the same series
                    for j, sign2 in enumerate(signs):
                        if j != i and j not in used:
                            if sign2["sign_number"].startswith(base_number + "."):
                                # Check if they're close together
                                dx = abs(sign1["hotspot_bbox"]["x_percentage"] - 
                                        sign2["hotspot_bbox"]["x_percentage"])
                                dy = abs(sign1["hotspot_bbox"]["y_percentage"] - 
                                        sign2["hotspot_bbox"]["y_percentage"])
                                
                                # If vertically or horizontally aligned and close
                                if (dx < distance_threshold and dy < distance_threshold * 3) or \
                                   (dy < distance_threshold and dx < distance_threshold * 3):
                                    group.append(sign2)
                                    used.add(j)
                
                # Add group info to signs
                if len(group) > 1:
                    group_label = f"{base_number} series ({len(group)} signs)"
                    for sign in group:
                        sign["group"] = group_label
                        sign["group_size"] = len(group)
        
        return results
    
    def save_results(self, results: Dict, output_path: str):
        """Save extraction results to JSON file"""
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Results saved to {output_path}")
        
    def create_visualization_html(self, results: Dict, image_path: str, output_path: str):
        """Create an HTML visualization of the hotspots"""
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Sign Hotspot Visualization</title>
    <style>
        body {{ margin: 0; padding: 20px; font-family: Arial; }}
        .container {{ position: relative; display: inline-block; }}
        img {{ max-width: 100%; height: auto; display: block; }}
        .hotspot {{
            position: absolute;
            border: 2px solid red;
            background: rgba(255, 0, 0, 0.2);
            cursor: pointer;
            transition: all 0.3s;
        }}
        .hotspot:hover {{
            background: rgba(255, 0, 0, 0.5);
            border-color: darkred;
        }}
        .hotspot-label {{
            position: absolute;
            top: -20px;
            left: 0;
            background: red;
            color: white;
            padding: 2px 5px;
            font-size: 12px;
            white-space: nowrap;
        }}
        .stats {{
            margin: 20px 0;
            padding: 10px;
            background: #f0f0f0;
        }}
    </style>
</head>
<body>
    <h1>Sign Hotspot Visualization (Embedded Text)</h1>
    <div class="stats">
        <strong>Extraction Method:</strong> PDF Embedded Text<br>
        <strong>Total Signs Found:</strong> {results['total_signs_detected']}<br>
        <strong>Confidence:</strong> 100% (text extracted directly from PDF)
    </div>
    <div class="container">
        <img src="{image_path}" id="floorplan">
"""
        
        # Add hotspots for first page
        if results['pages']:
            for sign in results['pages'][0]['signs']:
                hotspot = sign['hotspot_bbox']
                html += f"""
        <div class="hotspot" style="
            left: {hotspot['x_percentage']}%;
            top: {hotspot['y_percentage']}%;
            width: {hotspot['width_percentage']}%;
            height: {hotspot['height_percentage']}%;"
            onclick="alert('Sign: {sign['sign_number']}')">
            <div class="hotspot-label">{sign['sign_number']}</div>
        </div>
"""
        
        html += """
    </div>
</body>
</html>
"""
        
        with open(output_path, 'w') as f:
            f.write(html)
        logger.info(f"Visualization saved to {output_path}")

def main():
    """Main function to run PDF text extraction"""
    
    # Input PDF
    pdf_path = "../test_data/pdf_plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf"
    
    if not Path(pdf_path).exists():
        logger.error(f"PDF not found: {pdf_path}")
        return
    
    # Create extractor
    extractor = PDFTextExtractor(debug=True)
    
    # Extract signs from PDF
    results = extractor.extract_signs_from_pdf(pdf_path)
    
    # Save results
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    json_output = output_dir / "pdf_text_extraction_results.json"
    extractor.save_results(results, str(json_output))
    
    # Create visualization if we have an image
    image_path = "../public/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
    if Path(image_path).exists():
        html_output = output_dir / "hotspot_visualization.html"
        extractor.create_visualization_html(results, image_path, str(html_output))
    
    # Print summary
    print("\n" + "="*60)
    print("EXTRACTION COMPLETE")
    print("="*60)
    print(f"Method: PDF Embedded Text Extraction")
    print(f"Total signs detected: {results['total_signs_detected']}")
    print(f"Confidence: 100% (no OCR needed)")
    
    for page in results['pages']:
        print(f"  Page {page['page']}: {page['signs_detected']} signs")
        
        # Show first 5 signs as examples
        for sign in page['signs'][:5]:
            print(f"    - {sign['sign_number']} at ({sign['hotspot_bbox']['x_percentage']:.1f}%, "
                  f"{sign['hotspot_bbox']['y_percentage']:.1f}%)")

if __name__ == "__main__":
    main()