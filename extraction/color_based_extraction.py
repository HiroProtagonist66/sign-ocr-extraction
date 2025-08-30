#!/usr/bin/env python3
"""
Color-based Sign Detection and Extraction Pipeline
Detects orange/brown sign boxes in floor plans and extracts sign numbers
"""

import cv2
import numpy as np
import pytesseract
from pdf2image import convert_from_path
import json
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============= CONFIGURATION =============
# HSV color ranges for different colored sign boxes
# Orange/brown outlines
HSV_ORANGE_LOWER = np.array([8, 80, 80])
HSV_ORANGE_UPPER = np.array([25, 255, 220])

# Alternative darker browns
HSV_BROWN_LOWER = np.array([5, 50, 50])
HSV_BROWN_UPPER = np.array([30, 200, 200])

# Blue outlines (expanded range)
HSV_BLUE_LOWER = np.array([90, 30, 30])
HSV_BLUE_UPPER = np.array([140, 255, 255])

# Teal/cyan outlines (expanded range)
HSV_TEAL_LOWER = np.array([150, 30, 30])
HSV_TEAL_UPPER = np.array([200, 255, 255])

# Green outlines (expanded range)
HSV_GREEN_LOWER = np.array([35, 30, 30])
HSV_GREEN_UPPER = np.array([85, 255, 255])

# Purple/magenta outlines
HSV_PURPLE_LOWER = np.array([140, 30, 30])
HSV_PURPLE_UPPER = np.array([170, 255, 255])

# Standard sign box height for stacked detection (in pixels at 400 DPI)
STANDARD_SIGN_HEIGHT_PIXELS = 40

# Box size constraints (as percentage of image dimensions)
MIN_BOX_WIDTH_PERCENT = 0.3   # Minimum width: 0.3% of image width
MAX_BOX_WIDTH_PERCENT = 5.0   # Maximum width: 5% of image width
MIN_BOX_HEIGHT_PERCENT = 0.2  # Minimum height: 0.2% of image height
MAX_BOX_HEIGHT_PERCENT = 3.0  # Maximum height: 3% of image height

# Aspect ratio constraints for sign boxes
MIN_ASPECT_RATIO = 0.5  # Minimum width/height ratio
MAX_ASPECT_RATIO = 3.0  # Maximum width/height ratio

# OCR configuration
OCR_CONFIDENCE_THRESHOLD = 30  # Lowered confidence threshold for testing
OCR_WHITELIST = '0123456789.-'  # Characters to recognize

# PDF conversion settings
PDF_DPI = 400  # High resolution for better detection

# Morphological operation kernels
MORPH_KERNEL_SIZE = (3, 3)
DILATE_ITERATIONS = 2
ERODE_ITERATIONS = 1

# ============= DATA STRUCTURES =============
@dataclass
class SignDetection:
    """Represents a detected sign with its location and OCR result"""
    sign_number: str
    x_percentage: float
    y_percentage: float
    width_percentage: float
    height_percentage: float
    confidence: float
    
    def to_dict(self):
        return {
            "sign_number": self.sign_number,
            "bbox": {
                "x_percentage": round(self.x_percentage, 2),
                "y_percentage": round(self.y_percentage, 2),
                "width_percentage": round(self.width_percentage, 2),
                "height_percentage": round(self.height_percentage, 2)
            },
            "confidence": round(self.confidence, 2)
        }

class ColorBasedSignExtractor:
    """Main class for color-based sign detection and extraction"""
    
    def __init__(self, debug=True):
        self.debug = debug
        self.detections = []
        
    def convert_pdf_to_images(self, pdf_path: str, dpi: int = PDF_DPI) -> List[np.ndarray]:
        """Convert PDF pages to high-resolution images"""
        logger.info(f"Converting PDF to images at {dpi} DPI...")
        
        try:
            # Convert PDF to PIL images
            pil_images = convert_from_path(pdf_path, dpi=dpi)
            
            # Convert PIL images to OpenCV format
            cv_images = []
            for i, pil_img in enumerate(pil_images):
                # Convert PIL to numpy array
                img_array = np.array(pil_img)
                # Convert RGB to BGR for OpenCV
                bgr_image = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                cv_images.append(bgr_image)
                logger.info(f"Converted page {i+1}: {bgr_image.shape}")
                
            return cv_images
            
        except Exception as e:
            logger.error(f"Error converting PDF: {e}")
            raise
            
    def detect_color_boxes(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect colored boxes in the image (orange, brown, blue, teal, green)"""
        height, width = image.shape[:2]
        
        # Convert BGR to HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Create masks for all color ranges
        mask_orange = cv2.inRange(hsv, HSV_ORANGE_LOWER, HSV_ORANGE_UPPER)
        mask_brown = cv2.inRange(hsv, HSV_BROWN_LOWER, HSV_BROWN_UPPER)
        mask_blue = cv2.inRange(hsv, HSV_BLUE_LOWER, HSV_BLUE_UPPER)
        mask_teal = cv2.inRange(hsv, HSV_TEAL_LOWER, HSV_TEAL_UPPER)
        mask_green = cv2.inRange(hsv, HSV_GREEN_LOWER, HSV_GREEN_UPPER)
        mask_purple = cv2.inRange(hsv, HSV_PURPLE_LOWER, HSV_PURPLE_UPPER)
        
        # Combine all masks
        mask = mask_orange | mask_brown | mask_blue | mask_teal | mask_green | mask_purple
        
        if self.debug:
            logger.info(f"Color mask stats - Orange: {np.sum(mask_orange > 0)}, Blue: {np.sum(mask_blue > 0)}, "
                       f"Teal: {np.sum(mask_teal > 0)}, Green: {np.sum(mask_green > 0)}, Purple: {np.sum(mask_purple > 0)}")
        
        # Apply morphological operations to clean up the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, MORPH_KERNEL_SIZE)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.dilate(mask, kernel, iterations=DILATE_ITERATIONS)
        mask = cv2.erode(mask, kernel, iterations=ERODE_ITERATIONS)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours based on size and shape
        valid_boxes = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Calculate size as percentage of image
            width_percent = (w / width) * 100
            height_percent = (h / height) * 100
            
            # Check size constraints
            if (MIN_BOX_WIDTH_PERCENT <= width_percent <= MAX_BOX_WIDTH_PERCENT and
                MIN_BOX_HEIGHT_PERCENT <= height_percent <= MAX_BOX_HEIGHT_PERCENT):
                
                # Check aspect ratio
                aspect_ratio = w / h if h > 0 else 0
                if MIN_ASPECT_RATIO <= aspect_ratio <= MAX_ASPECT_RATIO:
                    valid_boxes.append((x, y, w, h))
        
        # Process stacked boxes
        final_boxes = []
        for box in valid_boxes:
            split_boxes = self.detect_stacked_boxes(box)
            final_boxes.extend(split_boxes)
                    
        logger.info(f"Detected {len(final_boxes)} total boxes (including split stacks)")
        return final_boxes
    
    def detect_stacked_boxes(self, box: Tuple[int, int, int, int], 
                            standard_height: int = STANDARD_SIGN_HEIGHT_PIXELS) -> List[Tuple[int, int, int, int]]:
        """Detect if a box contains multiple stacked signs and split them"""
        x, y, w, h = box
        
        # Check if height suggests stacking (more than 1.5x standard height)
        if h > standard_height * 1.5:
            stack_count = round(h / standard_height)
            if stack_count > 1:
                boxes = []
                # Split into individual boxes
                individual_height = h / stack_count
                for i in range(stack_count):
                    new_y = int(y + (i * individual_height))
                    new_h = int(individual_height)
                    boxes.append((x, new_y, w, new_h))
                
                if self.debug:
                    logger.info(f"Split stacked box at ({x}, {y}) into {stack_count} boxes")
                return boxes
        
        # Not a stack, return original box
        return [box]
        
    def extract_sign_number(self, image: np.ndarray, bbox: Tuple[int, int, int, int]) -> Optional[Dict]:
        """Extract sign number from around a detected box using OCR"""
        x, y, w, h = bbox
        
        # Look for text ABOVE the box (sign numbers are typically above the boxes)
        # Expand region significantly upward to capture text
        vertical_padding = 50  # Look 50 pixels above the box
        horizontal_padding = 20  # Some horizontal padding
        
        x_start = max(0, x - horizontal_padding)
        y_start = max(0, y - vertical_padding)  # Extend upward
        x_end = min(image.shape[1], x + w + horizontal_padding)
        y_end = min(image.shape[0], y + h + 10)  # Include box top edge
        
        # Crop the region ABOVE the box
        roi = image[y_start:y_end, x_start:x_end]
        
        # Scale up the image for better OCR (2x size)
        scale_factor = 2
        scaled_roi = cv2.resize(roi, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
        
        # Convert to grayscale
        gray = cv2.cvtColor(scaled_roi, cv2.COLOR_BGR2GRAY)
        
        # Try multiple preprocessing approaches but more efficiently
        results = []
        
        # Approach 1: OTSU threshold (usually works well)
        _, thresh1 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Approach 2: Enhanced contrast + threshold
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        _, thresh2 = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Only test the most promising combinations
        preprocessed_images = [
            (thresh1, "otsu"),
            (cv2.bitwise_not(thresh1), "otsu_inv"),
            (thresh2, "clahe"),
            (cv2.bitwise_not(thresh2), "clahe_inv")
        ]
        
        psm_modes = [8, 11]  # Focus on single word and sparse text modes
        
        for img, preprocess_name in preprocessed_images:
            for psm in psm_modes:
                try:
                    # Try with whitelist
                    custom_config = f'--psm {psm} -c tessedit_char_whitelist={OCR_WHITELIST} --oem 3'
                    text = pytesseract.image_to_string(img, config=custom_config).strip()
                    
                    if text:
                        # Clean and validate
                        text = self._clean_sign_number(text)
                        if text and len(text) >= 3:  # Minimum sign number length
                            # Get confidence
                            data = pytesseract.image_to_data(img, config=custom_config, output_type=pytesseract.Output.DICT)
                            confidences = [float(c) for c in data['conf'] if c != '-1']
                            avg_conf = sum(confidences) / len(confidences) if confidences else 0
                            
                            if avg_conf > 30:  # Lower threshold for now
                                results.append({
                                    'text': text,
                                    'confidence': avg_conf,
                                    'psm': psm,
                                    'preprocess': preprocess_name
                                })
                    
                                
                except Exception as e:
                    logger.debug(f"OCR error with PSM {psm}, {preprocess_name}: {e}")
        
        # Return the best result
        if results:
            # Sort by confidence and text length (prefer longer, more complete extractions)
            best_result = max(results, key=lambda x: (x['confidence'], len(x['text'])))
            if self.debug:
                logger.info(f"OCR candidates for box at ({x},{y}): {len(results)} results")
                logger.info(f"Best result: {best_result}")
            return best_result
        
        return None
        
    def _clean_sign_number(self, text: str) -> str:
        """Clean and validate sign number text"""
        # Remove leading/trailing dots
        text = text.strip('.')
        
        # Check if it looks like a sign number (contains digits)
        if any(c.isdigit() for c in text):
            # Handle decimal points (e.g., "2001.1")
            parts = text.split('.')
            if len(parts) <= 2:  # Allow one decimal point
                return text
                
        return ""
        
    def process_image(self, image: np.ndarray, page_num: int = 1) -> Tuple[List[SignDetection], List[Tuple[int, int, int, int]]]:
        """Process a single image to detect and extract signs"""
        height, width = image.shape[:2]
        logger.info(f"Processing image: {width}x{height}")
        
        # Detect colored boxes
        boxes = self.detect_color_boxes(image)
        
        # Extract sign numbers from each box
        detections = []
        for box in boxes:
            x, y, w, h = box
            
            # Try to extract sign number
            ocr_result = self.extract_sign_number(image, box)
            
            if ocr_result:
                # Calculate percentages
                x_center = x + w/2
                y_center = y + h/2
                
                detection = SignDetection(
                    sign_number=ocr_result['text'],
                    x_percentage=(x_center / width) * 100,
                    y_percentage=(y_center / height) * 100,
                    width_percentage=(w / width) * 100,
                    height_percentage=(h / height) * 100,
                    confidence=ocr_result['confidence']
                )
                detections.append(detection)
                logger.info(f"Detected sign: {detection.sign_number} at ({detection.x_percentage:.1f}%, {detection.y_percentage:.1f}%)")
                
        return detections, boxes
        
    def visualize_detections(self, image: np.ndarray, detections: List[SignDetection], 
                            output_path: str = None, boxes: List[Tuple[int, int, int, int]] = None) -> np.ndarray:
        """Create visualization with detected boxes and labels"""
        vis_image = image.copy()
        height, width = image.shape[:2]
        
        # First draw ALL detected boxes in light green
        if boxes:
            for box in boxes:
                x, y, w, h = box
                cv2.rectangle(vis_image, (x, y), (x + w, y + h), (0, 200, 0), 3)
        
        # Then draw successful OCR detections in bright green
        for detection in detections:
            # Convert percentages back to pixels
            x_center = int((detection.x_percentage / 100) * width)
            y_center = int((detection.y_percentage / 100) * height)
            w = int((detection.width_percentage / 100) * width)
            h = int((detection.height_percentage / 100) * height)
            
            x = int(x_center - w/2)
            y = int(y_center - h/2)
            
            # Draw rectangle with thicker line for visibility
            cv2.rectangle(vis_image, (x, y), (x + w, y + h), (0, 255, 0), 4)
            
            # Add label
            label = f"{detection.sign_number} ({detection.confidence:.0f}%)"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
            
            # Draw label background
            cv2.rectangle(vis_image, 
                         (x, y - label_size[1] - 4),
                         (x + label_size[0], y),
                         (0, 255, 0), -1)
            
            # Draw label text
            cv2.putText(vis_image, label,
                       (x, y - 2),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                       (0, 0, 0), 1)
                       
        if output_path:
            cv2.imwrite(output_path, vis_image)
            logger.info(f"Saved visualization to {output_path}")
            
        return vis_image
        
    def process_pdf(self, pdf_path: str, output_dir: str = None) -> Dict:
        """Process entire PDF and save results"""
        if output_dir is None:
            output_dir = Path(pdf_path).parent / "extraction_output"
        
        output_dir = Path(output_dir)
        output_dir.mkdir(exist_ok=True)
        
        # Convert PDF to images
        images = self.convert_pdf_to_images(pdf_path)
        
        all_results = {
            "source_pdf": os.path.basename(pdf_path),
            "total_signs_detected": 0,
            "pages": []
        }
        
        # Process each page
        for page_num, image in enumerate(images, 1):
            logger.info(f"\nProcessing page {page_num}...")
            
            # Detect signs
            detections, boxes = self.process_image(image, page_num)
            
            # Save visualization if in debug mode
            if self.debug:
                vis_path = output_dir / f"page_{page_num}_annotated.jpg"
                self.visualize_detections(image, detections, str(vis_path), boxes=boxes)
                
                # Also save original for comparison
                orig_path = output_dir / f"page_{page_num}_original.jpg"
                cv2.imwrite(str(orig_path), image)
            
            # Add to results
            page_results = {
                "page": page_num,
                "signs_detected": len(detections),
                "signs": [d.to_dict() for d in detections]
            }
            all_results["pages"].append(page_results)
            all_results["total_signs_detected"] += len(detections)
            
        # Save JSON results
        json_path = output_dir / "extraction_results.json"
        with open(json_path, 'w') as f:
            json.dump(all_results, f, indent=2)
        logger.info(f"\nSaved results to {json_path}")
        
        return all_results

def test_color_range(image_path: str, test_region: Tuple[int, int, int, int] = None):
    """Test function for tuning HSV color ranges on a small region"""
    import matplotlib.pyplot as plt
    
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
        
    # Crop to test region if specified
    if test_region:
        x, y, w, h = test_region
        image = image[y:y+h, x:x+w]
        
    # Convert to HSV
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # Create trackbars for HSV range adjustment
    def nothing(x):
        pass
    
    cv2.namedWindow('Color Range Tuning', cv2.WINDOW_NORMAL)
    cv2.createTrackbar('H Min', 'Color Range Tuning', HSV_ORANGE_LOWER[0], 180, nothing)
    cv2.createTrackbar('S Min', 'Color Range Tuning', HSV_ORANGE_LOWER[1], 255, nothing)
    cv2.createTrackbar('V Min', 'Color Range Tuning', HSV_ORANGE_LOWER[2], 255, nothing)
    cv2.createTrackbar('H Max', 'Color Range Tuning', HSV_ORANGE_UPPER[0], 180, nothing)
    cv2.createTrackbar('S Max', 'Color Range Tuning', HSV_ORANGE_UPPER[1], 255, nothing)
    cv2.createTrackbar('V Max', 'Color Range Tuning', HSV_ORANGE_UPPER[2], 255, nothing)
    
    print("Adjust trackbars to tune color detection. Press 'q' to quit.")
    print("Press 's' to save current values.")
    
    while True:
        # Get trackbar values
        h_min = cv2.getTrackbarPos('H Min', 'Color Range Tuning')
        s_min = cv2.getTrackbarPos('S Min', 'Color Range Tuning')
        v_min = cv2.getTrackbarPos('V Min', 'Color Range Tuning')
        h_max = cv2.getTrackbarPos('H Max', 'Color Range Tuning')
        s_max = cv2.getTrackbarPos('S Max', 'Color Range Tuning')
        v_max = cv2.getTrackbarPos('V Max', 'Color Range Tuning')
        
        # Create mask
        lower = np.array([h_min, s_min, v_min])
        upper = np.array([h_max, s_max, v_max])
        mask = cv2.inRange(hsv, lower, upper)
        
        # Apply mask
        result = cv2.bitwise_and(image, image, mask=mask)
        
        # Stack images for display
        display = np.hstack([image, result])
        
        # Resize for display
        scale = 800 / display.shape[1]
        display = cv2.resize(display, None, fx=scale, fy=scale)
        
        cv2.imshow('Color Range Tuning', display)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            print(f"\nSaved HSV ranges:")
            print(f"HSV_LOWER_BOUND = np.array([{h_min}, {s_min}, {v_min}])")
            print(f"HSV_UPPER_BOUND = np.array([{h_max}, {s_max}, {v_max}])")
            
    cv2.destroyAllWindows()

def main():
    """Main function to run the extraction pipeline"""
    # Input PDF path
    pdf_path = "000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf"
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        logger.error(f"PDF file not found: {pdf_path}")
        return
        
    # Create extractor
    extractor = ColorBasedSignExtractor(debug=True)
    
    # Process PDF
    results = extractor.process_pdf(pdf_path)
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*50}")
    print(f"Total signs detected: {results['total_signs_detected']}")
    for page in results['pages']:
        print(f"  Page {page['page']}: {page['signs_detected']} signs")
        
if __name__ == "__main__":
    main()