# CLAUDE.md - Technical Implementation Guide

**Note: This file contains the same content as `claude.md` for backwards compatibility. See `claude.md` for the main documentation.**

## Documentation Structure
- **claude.md**: Main project documentation (this content)
- **extraction/claude.md**: Python extraction pipeline details
- **app/claude.md**: Next.js web application documentation  
- **test_data/claude.md**: Test data and processing scripts
- **components/claude.md**: Shared React components library

---

# Sign OCR Extraction System

## Project Vision
A high-accuracy system for extracting sign locations and numbers from Microsoft datacenter construction floor plans. This system serves as the data ingestion pipeline for the field worker sign management PWA, processing 13,000+ signs across 7 projects with 98% accuracy using a hybrid approach of PDF embedded text extraction and computer vision fallbacks.

## System Architecture

### Core Technologies
- **Extraction Engine**: Python (OpenCV, PyMuPDF, Tesseract OCR)
- **Web Interface**: Next.js 14, React 18, TypeScript
- **Deployment**: Vercel (web), Local Python scripts (extraction)
- **Data Format**: JSON with standardized sign hotspot schema

### Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                     PDF Floor Plans                      │
│              (7 projects, 13,000+ signs)                 │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               Extraction Pipeline                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. PDF Embedded Text Extraction (Primary)       │   │
│  │     - PyMuPDF direct text extraction             │   │
│  │     - 98% accuracy for embedded text            │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  2. Color-Based Box Detection (Fallback)         │   │
│  │     - OpenCV HSV color detection                 │   │
│  │     - Multi-color support (orange/blue/green)    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  3. OCR Text Recognition (Last Resort)           │   │
│  │     - Tesseract with optimized PSM modes         │   │
│  │     - Multiple preprocessing strategies          │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              JSON Sign Database                          │
│         Standardized hotspot coordinates                 │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Interactive Web Viewer                         │
│     Pan/Zoom interface for verification                  │
└──────────────────────────────────────────────────────────┘
```

## Production Tools

### Validation Interface (/validation)
Professional three-panel interface for reviewing and correcting extracted sign data:
- **Left Panel**: Interactive PDF viewer with transparent hotspots
- **Center Panel**: Filterable sign list with search and bulk operations  
- **Right Panel**: Detail editor for single or batch editing
- **Features**: Auto-save, undo/redo, keyboard shortcuts, export to JSON/SQL/CSV
- **Multi-site Support**: FTY02 (2 PDFs), ATL06 (57 pages with 4,314 signs)
- **Live URL**: https://sign-ocr-extraction.vercel.app/validation

### Field Interface (/field and /fieldv2) - *Updated September 1, 2025*
Mobile-first interface for installers to mark sign installation status in the field:
- **Touch Optimized**: Complete custom touch handling with pinch zoom centering
- **Status Tracking**: Mark signs as installed/missing/damaged
- **Offline Support**: Works without internet, syncs when reconnected
- **Progress Tracking**: Real-time completion percentage per page
- **Multi-page Navigation**: Support for ATL06's 57 pages
- **Zoom Controls**: MIN_ZOOM=1 (no zooming out past 100%), MAX_ZOOM=5
- **Touch Gestures**: Single finger pan, two finger pinch zoom from center
- **Live URLs**: 
  - https://sign-ocr-extraction.vercel.app/field
  - https://sign-ocr-extraction.vercel.app/fieldv2 (cache-bypass version)

### Field Interface Pro (/field-pro) - *Added September 1, 2025*
Procreate-inspired premium tablet interface with advanced gestures:
- **Touch Gestures**: Two-finger undo, pinch zoom, edge swipe navigation
- **Spring Animations**: Floating action button with physics-based animations
- **Page Scrubber**: Thumbnail navigation strip like Procreate gallery
- **Dark Theme**: Professional dark UI with glass morphism
- **History Tracking**: Full undo/redo stack with gesture controls
- **Live URL**: https://sign-ocr-extraction.vercel.app/field-pro

## Key Design Patterns

### 1. Hybrid Extraction Strategy
```python
# Primary: Try embedded text extraction
signs = extract_embedded_text(pdf_path)

# Fallback: Color-based detection if embedded text fails
if not signs or len(signs) < expected_count * 0.5:
    signs = detect_colored_boxes(image_path)
    
# Last resort: OCR on detected regions
if signs_need_text:
    signs = apply_ocr_to_regions(regions)
```

### 2. Hotspot Coordinate System
All sign locations use percentage-based coordinates for responsive display:
```typescript
interface SignHotspot {
  sign_number: string;
  text_bbox: {
    x: number;        // Pixels for debugging
    y: number;
    width: number;
    height: number;
  };
  hotspot_bbox: {
    x_percentage: number;      // 0-100% of image width
    y_percentage: number;      // 0-100% of image height
    width_percentage: number;  // Percentage of image width
    height_percentage: number; // Percentage of image height
  };
  confidence: "embedded" | "high" | "medium" | "low";
}
```

### 3. Multi-PDF Batch Processing
```python
# Process multiple PDFs in parallel
results = {
    "extraction_method": "embedded_text",
    "pdfs": [
        {
            "pdf_id": "pdf13",
            "pdf_name": "COLO 2 - Admin Level 1",
            "total_signs_detected": 157,
            "pages": [...]
        }
    ]
}
```

## File Structure & Key Components

### Python Extraction (`/extraction/`)
```
extraction/
├── pdf_text_extraction.py      # Primary: Embedded text extraction
├── color_based_extraction.py   # Fallback: Color detection pipeline
├── extract_multiple_pdfs.py    # Batch processing coordinator
├── tune_colors.py              # Interactive HSV range calibration
├── debug_*.py                  # Various debugging utilities
└── output/                     # Generated JSON and visualizations
```

### Next.js Web App (`/app/`)
```
app/
├── components/
│   └── PanZoomViewer.tsx      # Core pan/zoom component
├── plans/
│   ├── multi-pdf/             # Multi-PDF comparison view
│   ├── embedded-text/         # Embedded text results
│   ├── calibrated/           # Fixed coordinate testing
│   └── test/                 # Test data visualization
└── layout.tsx                 # Root layout with Tailwind
```

### Test Data (`/test_data/`)
```
test_data/
├── pdf_plans/                 # Source PDFs
├── extraction_results/        # JSON outputs
└── extraction_scripts/        # Node.js processing scripts
```

## Critical Implementation Details

### Sign Number Format
```python
SIGN_PATTERN = re.compile(r'^(\d{4}(?:\.\d+)?)$')
# Matches: 2001, 2001.1, 2001.2, etc.
# Projects: BC (Exit), PAC (Project-specific), COLO (Colocation)
```

### Color Detection Ranges (HSV)
```python
# Multi-color detection for different sign box outlines
color_ranges = {
    "orange": ([8, 80, 80], [25, 255, 220]),
    "blue": ([100, 50, 50], [130, 255, 255]),
    "green": ([45, 50, 50], [75, 255, 255]),
    "teal": ([160, 50, 50], [190, 255, 255])
}
```

### Stacked Box Detection
```python
def detect_stacked_boxes(box, standard_height=40):
    """Split tall boxes into individual sign units"""
    x, y, w, h = box
    if h > standard_height * 1.5:
        stack_count = round(h / standard_height)
        return [(x, y + i*standard_height, w, standard_height) 
                for i in range(stack_count)]
    return [box]
```

### OCR Configuration Matrix
```python
# Tesseract PSM modes for different text layouts
psm_configs = {
    6: "Uniform block of text",
    7: "Single text line",
    8: "Single word",
    11: "Sparse text without order",
    13: "Raw line without formatting"
}
```

## Performance Metrics

### Current Performance (September 1, 2025)
- **Detection Rate**: 98% (embedded text), 84% (color boxes)
- **Extraction Accuracy**: 98% (embedded), 0% (OCR - needs work)
- **Processing Speed**: ~2 seconds per PDF page
- **False Positive Rate**: <1%
- **Supported Formats**: PDF (native), PNG (converted at 200-400 DPI)
- **Sites Processed**: FTY02 (234 signs across 2 PDFs), ATL06 (4,314 signs across 57 pages)
- **Field Interface**: Mobile-ready with complete custom touch handling
- **Touch Controls**: Pinch zoom centers on fingers, MIN_ZOOM=1 enforced

### Target Metrics
- Detection Rate: >95% across all methods
- Extraction Accuracy: >90% including OCR fallback
- Processing Speed: <10 seconds per page
- Batch Processing: 7 PDFs in <2 minutes

## Mobile Touch Implementation

### PanZoomViewer Component (v2.3)
Complete custom touch handling for tablets and mobile devices:
```typescript
// Touch state management
const [touchStartDistance, setTouchStartDistance] = useState(0);
const [initialTouchZoom, setInitialTouchZoom] = useState(1);
const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });

// CSS to disable browser gestures
style={{ touchAction: 'none' }}

// Event handlers with preventDefault
onTouchStart={(e) => { e.preventDefault(); handleTouchStart(e); }}
onTouchMove={(e) => { e.preventDefault(); handleTouchMove(e); }}
onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd(); }}
```

### Touch Gesture Support
- **Single Finger**: Pans the floor plan
- **Two Fingers**: Pinch zoom centered on pinch point
- **MIN_ZOOM=1**: Cannot zoom out smaller than viewport
- **MAX_ZOOM=5**: Maximum 500% zoom
- **Debug Mode**: Red dot shows pinch center (for testing)

## Known Issues & Solutions

### Issue: OCR Failing on Colored Boxes
**Problem**: Sign text is outside/above boxes, not inside
**Solution**: Detect boxes for location, search nearby regions for text
**Status**: Implementing region-based text search

### Issue: Stacked Boxes Counted as Single Unit
**Problem**: Vertically stacked signs detected as one large box
**Solution**: Height-based splitting algorithm implemented
**Status**: ✅ Resolved - detecting 12 stacks correctly

### Issue: Multi-Color Box Detection
**Problem**: Only detecting orange boxes, missing blue/green/teal
**Solution**: Multiple HSV masks combined with OR operation
**Status**: ✅ Resolved - detecting all colors

### Issue: Text Quality for OCR
**Problem**: Low resolution, poor contrast affecting OCR
**Solution**: 
- Convert PDFs at 400+ DPI
- Apply adaptive thresholding
- Use region-based preprocessing
**Status**: 🔄 In Progress

## Integration Points

### With Sign Inventory PWA
```javascript
// Data flows from extraction to field app
const signDatabase = await fetch('/api/extracted-signs');
const signs = signDatabase.filter(s => s.project === 'COLO2');

// Field workers verify/update sign status
const fieldUpdate = {
  sign_number: "2001",
  status: "installed",
  installer: "user123",
  timestamp: new Date()
};
```

### With Supabase Backend
```sql
-- Extracted signs populate initial database
INSERT INTO signs (number, location_x, location_y, project_id, floor)
SELECT 
  sign_number,
  hotspot_x_percentage,
  hotspot_y_percentage,
  'COLO2',
  1
FROM extraction_results;
```

## Development Workflow

### Local Development
```bash
# Python extraction development
cd extraction/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run extraction
python3 extract_multiple_pdfs.py

# Web interface development
npm install
npm run dev
# Visit http://localhost:3000/plans/multi-pdf
```

### Testing Extraction
```bash
# Test color detection tuning
python3 extraction/tune_colors.py

# Test on single image
python3 extraction/run_from_image.py

# Debug OCR issues
python3 extraction/debug_ocr.py
```

### Deployment
```bash
# Deploy web viewer to Vercel
git add .
git commit -m "Update extraction results"
git push origin main
# Auto-deploys to https://sign-ocr-extraction.vercel.app

# Run extraction locally (Python not deployed)
python3 extraction/extract_multiple_pdfs.py
cp extraction/output/*.json public/extraction/
```

## Environment Variables
```env
# Not currently using env vars
# Future: Add API keys for cloud OCR services
```

## API Endpoints (Planned)
```typescript
// Future API structure
GET  /api/projects          // List all projects
GET  /api/signs/:project    // Get signs for project  
POST /api/signs/verify      // Verify extraction results
PUT  /api/signs/:id         // Update sign status
```

## Security Considerations
- No authentication currently (development phase)
- PDF processing happens locally (no cloud upload)
- Sign data is non-sensitive (numbers and locations only)
- Future: Add auth for field worker updates

## Testing Strategy

### Unit Tests (Planned)
```python
# Test sign pattern matching
assert SIGN_PATTERN.match("2001")
assert SIGN_PATTERN.match("2001.1")
assert not SIGN_PATTERN.match("ABC123")

# Test color detection ranges
assert detect_color_in_range(orange_pixel, orange_range)
assert not detect_color_in_range(blue_pixel, orange_range)
```

### Integration Tests
- Process known PDF with expected sign count
- Verify coordinate accuracy within 5% tolerance
- Check extraction time under 10 seconds

### Manual Verification
- Visual inspection using web viewer
- Click each hotspot to verify sign number
- Compare against physical floor plans

## Future Enhancements

### Short Term (1-2 weeks)
- [ ] Improve OCR accuracy to >50%
- [ ] Add confidence scoring for each extraction
- [ ] Implement text-region search near boxes
- [ ] Add extraction progress indicators

### Medium Term (1 month)
- [ ] Cloud OCR service integration (Google Vision API)
- [ ] Machine learning for sign pattern recognition
- [ ] Automatic quality verification
- [ ] Batch correction interface

### Long Term (3+ months)
- [ ] Real-time extraction API
- [ ] Mobile app for field verification
- [ ] AR overlay for on-site navigation
- [ ] Integration with BIM models

## Cross-References

### Related Projects
- **sign-inventory/**: Field worker PWA for tracking installations
  - Uses extracted sign data as initial database
  - Provides installation status updates
  - See: `../sign-inventory/claude.md`

### Key Dependencies
- PyMuPDF (fitz): PDF text extraction
- OpenCV: Computer vision for color detection
- Tesseract: OCR fallback
- Next.js: Web interface
- React: Interactive components
- Tailwind CSS: Styling

## Debugging Commands

### Check Extraction Results
```bash
# View extraction summary
cat extraction/output/combined_extraction_results.json | jq '.pdfs[0].total_signs_detected'

# Count signs per page
cat extraction/output/pdf13_extraction_results.json | jq '.pages[0].signs_detected'

# Find specific sign
grep -r "2001" extraction/output/
```

### Verify Coordinates
```javascript
// In browser console on viewer page
const sign = signs.find(s => s.sign_number === "2001");
console.log(`Sign 2001 at ${sign.hotspot_bbox.x_percentage}%, ${sign.hotspot_bbox.y_percentage}%`);
```

## Session Management
Track important changes in `/chat_summaries/`:
- SESSION_SUMMARY.md: Overall project progress
- Individual session files: Daily achievements
- Update CLAUDE.md when milestones reached

## Contact & Support
- **Project Owner**: Benjamin Begner
- **Repository**: sign-ocr-extraction/
- **Deployment**: https://sign-ocr-extraction.vercel.app
- **Status**: Active Development (98% accuracy achieved)

## Manager Page - Advanced Page-to-Sign-Type Assignment System

### Overview (January 2, 2025)
Professional page-to-sign-type mapping interface for ATL06's 119 pages with advanced features:
- **Pan & Zoom Viewer**: Full control over floor plan navigation with mouse/touch support
- **PDF Processing**: Convert and display PDFs as high-quality images
- **Database Integration**: Live sync with Supabase for sign types and assignments
- **Auto-Detection**: AI-powered sign type detection from page images
- **Development Mode**: Works without credentials using demo data

### Current Implementation (v2.0)
- **Page Viewer**: 
  - Pan & zoom controls (50% to 300% zoom)
  - Mouse wheel zoom, drag to pan
  - Touch support for tablets
  - Keyboard shortcuts (Ctrl +/- for zoom)
  - Fit-to-screen button
- **PDF Support**:
  - Upload PDFs directly in UI
  - Automatic conversion to PNG images (150 DPI)
  - Batch processing all pages
  - Metadata tracking
- **Database Features**:
  - Dynamic sign type loading from Supabase
  - Real-time save to database
  - Fallback to localStorage
  - Development mode with demo data
- **Auto-Detection System**:
  - Pattern matching for sign types (BC-1.0, PAC-1.1, etc.)
  - Confidence scoring (high/medium/low)
  - Review modal before applying
  - Batch processing with progress tracking

### Key Features
- **Keyboard Shortcuts**:
  - Arrow keys (← → ↑ ↓): Navigate pages
  - Ctrl/Cmd + (+/-/0): Zoom controls
  - Ctrl+S: Save to database
- **Visual Feedback**:
  - ✓ Green check for assigned pages
  - ⚠ Yellow warning for unassigned
  - Progress bar showing completion
  - Confidence indicators for auto-detect
- **Auto-Detection**:
  - Scans all pages for sign type patterns
  - Title block detection for high confidence
  - Manual override capability
  - Apply all or high-confidence only

### Technical Implementation
```typescript
// Database integration
const [signTypes, setSignTypes] = useState<Array<{
  sign_type_code: string;
  description: string;
}>>([]);

// Pan & Zoom state
const [zoom, setZoom] = useState(1);
const [position, setPosition] = useState({ x: 0, y: 0 });

// Auto-detection
const [detectedAssignments, setDetectedAssignments] = useState({});
const [showReviewModal, setShowReviewModal] = useState(false);

// Sign type patterns
const SIGN_TYPE_PATTERNS = [
  /BC-\d+\.\d+[A-Z]?/g,     // BC-1.0, BC-1.14A
  /PAC-\d+\.\d+[A-Z]?/g,     // PAC-1.1
  /ID-\d+\.\d+[A-Z]?/g,      // ID-5.2
];
```

### Development Setup
```bash
# Install dependencies
npm install

# Sync Supabase credentials from Vercel
npm run setup:local

# Start development server
npm run dev

# Or run on port 3004
npm run dev:port
```

### Environment Configuration
- **With Supabase**: Full database functionality
- **Without Supabase**: Demo mode with localStorage
- **Setup**: Run `vercel env pull .env.local` to sync credentials
- **Fallback**: Works perfectly without credentials for UI development

### PDF Processing Pipeline
1. Upload PDF through UI
2. Python script converts to PNG images (150 DPI)
3. Images saved to `/public/plans/[site]/`
4. Metadata stored with dimensions
5. Manager displays converted images

### Performance
- Handles 119 pages smoothly
- Real-time zoom without lag
- Preloads adjacent pages
- Auto-detection processes ~1 page/100ms
- Database saves are instant

### Live URLs
- Manager: https://sign-ocr-extraction.vercel.app/manager
- Local Dev: http://localhost:3004/manager

---
*Last Updated: January 2, 2025*
*Manager Page: Full-featured with pan/zoom, database, PDF upload, and auto-detection*
*Key Achievement: Professional tool with AI assistance for rapid assignment*
*Next Milestone: Connect real OCR API for accurate text extraction*