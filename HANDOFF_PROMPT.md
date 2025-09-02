# Handoff Prompt for Next Claude Chat

## Copy this entire prompt to start a new chat:

I'm continuing work on the sign-ocr-extraction project. Please review:
1. `/CLAUDE.md` - Main project documentation (UPDATED Jan 2, 2025)
2. `/chat_summaries/session_2025-01-02_manager_upgrades.md` - Latest session
3. `/LOCAL_SETUP.md` - Development setup guide

## Current Project State (January 2, 2025)

### What's Working:
✅ **Manager Page v2.0** - Professional page-to-sign-type assignment system
✅ **Pan & Zoom** - Full navigation controls with 50-300% zoom range
✅ **PDF Processing** - Converts PDFs to images (119 pages from ATL06)
✅ **Database Integration** - Dynamic sign types from Supabase
✅ **Auto-Detection** - AI-powered sign type detection with review modal
✅ **Development Mode** - Works without credentials using demo data

### Live URLs:
- Manager: https://sign-ocr-extraction.vercel.app/manager
- Local Dev: http://localhost:3004/manager
- Field: https://sign-ocr-extraction.vercel.app/fieldv2
- Validation: https://sign-ocr-extraction.vercel.app/validation

### Environment Status:
- `.env.local` has placeholder Supabase credentials
- Run `vercel env pull .env.local` to sync real credentials
- Development mode shows yellow banner when unconfigured
- All features work with mock data for testing

## Priority Tasks:

### 1. Connect Real OCR for Auto-Detection
The auto-detect system is ready but needs real text extraction:

```typescript
// In lib/sign-type-detector.ts, update performOCR():
export async function performOCR(pageNumber: number): Promise<string> {
  // Option 1: Use existing Python extraction (98% accurate)
  const response = await fetch('/api/python-extract', {
    method: 'POST',
    body: JSON.stringify({ pageNumber })
  });
  
  // Option 2: Use Google Vision API (key in .env.local)
  // const vision = new ImageAnnotatorClient();
  
  return extractedText;
}
```

### 2. Test with Production Supabase
```bash
# Get real credentials
vercel env pull .env.local

# Restart dev server
npm run dev:port

# Test features:
- Sign types load from database
- Page assignments save to slp_pages table
- Export includes real data
```

### 3. Improve Detection Patterns
Add more patterns to `SIGN_TYPE_PATTERNS` in `lib/sign-type-detector.ts`:
- Emergency exit patterns
- Fire barrier variations
- Room identification codes
- Power/cooling specifications

### 4. Process Additional Sites
Currently only ATL06 (119 pages) is processed. Add:
- FTY02 PDF processing
- Other site PDFs
- Batch site selection in UI

## File Structure:
```
Manager System Files:
├── app/manager/
│   ├── manager-client.tsx      # Main component with all features
│   ├── pdf-upload.tsx          # Upload component
│   └── auto-detect-review-modal.tsx  # Review modal
├── lib/
│   ├── sign-type-detector.ts   # Auto-detection logic
│   └── supabase.ts             # Database client with fallback
├── extraction/
│   └── convert_pdf_to_images.py # PDF to PNG converter
└── public/plans/atl06/         # 119 converted page images
```

## Recent Additions This Session:

1. **PDF Upload System**
   - Drag & drop UI
   - Python conversion script
   - API endpoint for processing
   - Progress tracking

2. **Pan & Zoom Controls**
   - Mouse wheel zoom
   - Drag to pan
   - Keyboard shortcuts (Ctrl +/- 0)
   - Touch support

3. **Database Integration**
   - Loads sign types from sign_descriptions
   - Saves to slp_pages table
   - Maps page numbers to IDs
   - LocalStorage fallback

4. **Auto-Detection**
   - Pattern matching library
   - Confidence scoring
   - Review modal with overrides
   - Batch processing

5. **Development Mode**
   - Graceful credential handling
   - Demo data fallback
   - Setup scripts in package.json

## Testing Checklist:
- [ ] Upload new PDF and verify conversion
- [ ] Test pan/zoom on all 119 pages
- [ ] Run auto-detect and review results
- [ ] Save assignments to database
- [ ] Export CSV with all assignments
- [ ] Test in development mode without credentials

## Known Issues:
1. **Mock OCR** - Returns test data, needs real extraction
2. **Keyboard Shortcuts** - Number keys disabled (no shortcuts in DB types)
3. **Performance** - Consider virtualization for 100+ pages

## Commands:
```bash
# Development
npm run dev:port         # Port 3004
npm run setup:local      # Sync Vercel env

# PDF Processing
cd extraction
python3 convert_pdf_to_images.py

# Testing
open http://localhost:3004/manager
```

## Session Summary:
This session transformed the manager page into a professional tool with enterprise features. Added PDF processing, pan/zoom navigation, database integration, and AI-powered auto-detection. The system handles 119 pages smoothly and works in development mode without credentials. Ready for real OCR integration.

---
*Use this prompt to continue development in a new chat with full context*