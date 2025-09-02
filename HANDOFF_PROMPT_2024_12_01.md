# Handoff Prompt for Next Claude Session

## Copy this entire prompt to start a new chat:

I'm continuing work on the sign-ocr-extraction project. Please review:
1. `/CLAUDE.md` - Main project documentation (UPDATED Dec 1 Evening)
2. `/chat_summaries/SESSION_2024-12-01_EVENING_MANAGER_PAGE_EVOLUTION.md` - Latest session

## Current Project State (December 1, 2024 - Evening)

### What's Working:
✅ **Manager Page** - Simplified page-to-sign-type assignment system
✅ **Stacked Layout** - Page viewer on top (55vh), table below (45vh)  
✅ **Keyboard Navigation** - Arrow keys + number shortcuts (1-9, 0)
✅ **Fit-to-Frame** - Floor plans scale to container width
✅ **Data Persistence** - LocalStorage working, Supabase ready
✅ **Export Functions** - CSV and JSON export operational
✅ **Hydration Fix** - Browser extension warnings suppressed

### Live URLs:
- Manager: https://sign-ocr-extraction.vercel.app/manager
- Field: https://sign-ocr-extraction.vercel.app/fieldv2
- Validation: https://sign-ocr-extraction.vercel.app/validation
- Local Dev: http://localhost:3004/manager

### Current Implementation:
```typescript
// Simple page-to-type mapping (57 pages total)
const [pageAssignments, setPageAssignments] = useState<Record<number, string>>({});
// Example: { 1: "BC-1.0", 2: "BC-1.0", 3: "PAC-1.1" }

// Keyboard shortcuts working:
// ← → ↑ ↓: Navigate pages
// 1-9: Quick assign sign types
// 0: Clear assignment
// Ctrl+S: Save to database
```

## Priority Tasks:

### 1. Connect Production Supabase
```bash
# Add to .env.local
NEXT_PUBLIC_SUPABASE_URL=actual_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=actual_key_here
```
Currently using mock client that falls back to localStorage.

### 2. Add Bulk Pattern Assignment
```typescript
// Examples of patterns to implement:
assignPattern("alternating", ["BC-1.0", "PAC-1.1"]); // Alternates types
assignPattern("every-nth", 3, "BC-2.0"); // Every 3rd page
assignPattern("range-repeat", [1,5], "ID-5.2"); // Repeat pattern every 5 pages
```

### 3. Improve Mobile/Tablet Experience
- Test on iPad in landscape mode
- Add touch gestures for page navigation
- Optimize button sizes for touch
- Consider adding swipe gestures

### 4. Add Import from Previous Assignments
```typescript
// Import JSON from previous session
function importAssignments(file: File) {
  // Parse JSON and apply assignments
  // Handle conflicts/overwrites
}
```

### 5. Add Verification Status
```typescript
// Track which pages have been verified
interface PageAssignment {
  signType: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}
```

## Technical Context:

### File Structure:
```
/app/manager/
  ├── page.tsx (dynamic import wrapper)
  └── manager-client.tsx (main component, ~500 lines)

/public/plans/ATL06/
  ├── page_01_full.png
  ├── page_02_full.png
  └── ... (57 total pages)
```

### Key Functions:
- `navigateToPage(page)` - Changes current page
- `updatePage(page, signType)` - Assigns type to page
- `applyAssignment()` - Apply and auto-advance
- `exportCSV()` - Export assignments as CSV
- `saveAssignments()` - Save to Supabase/localStorage

### Visual Indicators:
- ✓ Green check = Assigned
- ⚠ Yellow warning = Unassigned
- Blue highlight = Current page
- Auto-advance after assignment

## Known Issues:

1. **Supabase Not Connected** - Using mock client, need real credentials
2. **No Import Function** - Can only export, not import assignments
3. **No Undo/Redo** - Consider adding history stack
4. **No Page Thumbnails** - Could add mini previews in table

## Recent Achievements:

- **Simplified from 4,314 signs to 57 pages** - Much more practical
- **Three layout iterations** - Found optimal stacked layout
- **Complete keyboard control** - Rapid assignment possible
- **Fixed hydration errors** - No more browser extension warnings
- **Fit-to-frame viewing** - Full floor plans visible

## Architecture Notes:

The manager page went through 3 major iterations:
1. **Simple table** → Too basic, no visual context
2. **Split view (60/40)** → Better but cramped
3. **Stacked layout** → Winner! Full-width viewing

Current approach is pragmatic: managers assign sign types to pages, field workers know "Page 15 = BC-1.0 Exit Signs" without tracking thousands of individual numbers.

## Testing Checklist:
- [ ] Test all keyboard shortcuts
- [ ] Verify export formats (CSV, JSON)
- [ ] Check image loading for all 57 pages
- [ ] Test on tablet/mobile devices
- [ ] Verify localStorage persistence

## Session Summary:
Transformed the manager page from complex individual sign management (4,314 signs) to simple page-level assignments (57 pages). Implemented stacked layout with fit-to-frame viewing, complete keyboard navigation, and fixed hydration errors. Ready for production Supabase connection.

---
*Use this prompt to continue development in a new chat with full context*
*Dev server may be running on port 3004*
*All 57 floor plan images are available in /public/plans/ATL06/*