# Claude.md - Next.js Web Application

## Folder Purpose
React/Next.js web interface for visualizing and verifying extracted sign data. Provides interactive pan/zoom capabilities for navigating large floor plans and clicking hotspots to verify sign numbers.

## Key Components

### Core Components
- **components/PanZoomViewer.tsx**: Reusable pan/zoom component with touch support, mouse wheel zoom, and hotspot interaction
- **layout.tsx**: Root layout with Tailwind CSS and Inter font
- **page.tsx**: Home page with navigation to different visualization modes

### Plan Viewers (`/plans/`)
- **multi-pdf/**: Compare signs across multiple PDFs side-by-side
- **embedded-text/**: View results from PDF embedded text extraction
- **calibrated/**: Test fixed coordinate accuracy
- **test/**: Visualize test data with mock signs
- **zoom/**: Advanced zoom testing interface
- **demo/**: Public demonstration interface

## Component Patterns

### PanZoomViewer Component
Core component for interactive floor plan navigation:
```typescript
interface PanZoomViewerProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: Array<{
    id: string;
    x: number;      // Percentage (0-100)
    y: number;      // Percentage (0-100)
    width: number;  // Percentage
    height: number; // Percentage
    label: string;
    color?: string;
  }>;
  onHotspotClick?: (hotspot: Hotspot) => void;
}
```

### Sign Data Interface
Standard structure for sign hotspots:
```typescript
interface SignData {
  sign_number: string;
  text_bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hotspot_bbox: {
    x_percentage: number;
    y_percentage: number;
    width_percentage: number;
    height_percentage: number;
  };
  confidence: "embedded" | "high" | "medium" | "low";
  group?: string;
  group_size?: number;
}
```

## View Implementations

### Multi-PDF Comparison (`/plans/multi-pdf/`)
- Loads combined extraction results
- PDF selector dropdown
- Sign counter and statistics
- Group visualization for clustered signs
- Touch-optimized for tablets

### Embedded Text View (`/plans/embedded-text/`)
- Shows 98% accurate embedded text results
- Color-coded confidence levels
- Click-to-copy sign numbers
- Export functionality

### Calibrated View (`/plans/calibrated/`)
- Uses fixed coordinates for testing
- Verifies hotspot positioning accuracy
- Debug mode with coordinate display

## Styling Patterns

### Tailwind Configuration
```css
/* Hotspot styling */
.hotspot {
  @apply absolute border-2 cursor-pointer transition-all duration-200;
  @apply hover:scale-110 hover:z-10;
}

/* Confidence-based colors */
.confidence-embedded { @apply border-green-500; }
.confidence-high { @apply border-blue-500; }
.confidence-medium { @apply border-yellow-500; }
.confidence-low { @apply border-red-500; }
```

### Responsive Design
- Mobile: Single column, larger touch targets
- Tablet: Optimized pan/zoom, side panel
- Desktop: Multi-panel layout, keyboard shortcuts

## State Management

### Local State Pattern
```typescript
const [selectedPdf, setSelectedPdf] = useState<string>('pdf13');
const [selectedSign, setSelectedSign] = useState<SignData | null>(null);
const [zoomLevel, setZoomLevel] = useState<number>(1);
const [panPosition, setPanPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
```

### Data Loading Pattern
```typescript
useEffect(() => {
  fetch('/extraction/combined_results.json')
    .then(res => res.json())
    .then(data => {
      setResults(data);
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to load results:', err);
      setError(true);
    });
}, []);
```

## Performance Optimizations

### Image Loading
- Lazy load floor plan images
- Progressive JPEG for faster initial display
- Preload adjacent PDFs in multi-PDF mode

### Hotspot Rendering
- Virtual scrolling for 100+ hotspots
- CSS transforms for smooth pan/zoom
- RequestAnimationFrame for gesture handling

## Known Issues

### Touch Gesture Conflicts
- **Issue**: Pinch-zoom conflicts with browser zoom
- **Solution**: preventDefault on touch events
- **File**: `PanZoomViewer.tsx:handleTouchMove()`

### Large Image Performance
- **Issue**: 3300x2550px images slow on mobile
- **Solution**: Generate responsive image sizes
- **Status**: Planning implementation

### Hotspot Click Accuracy
- **Issue**: Small hotspots hard to click on mobile
- **Solution**: Minimum touch target size of 44x44px
- **Status**: Implemented in PanZoomViewer

## Testing Approach

### Visual Testing
```typescript
// Test data in /plans/test/real-data.ts
export const realSignsData = [
  { sign_number: "2001", x: 10.5, y: 15.2, confidence: "embedded" },
  { sign_number: "2001.1", x: 10.5, y: 16.8, confidence: "high" },
  // ... 155 more signs
];
```

### Coordinate Verification
1. Load calibrated view
2. Click known sign locations
3. Verify correct sign number displayed
4. Check hotspot alignment visually

## Deployment

### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### Static Assets
- Floor plan images: `/public/plans/`
- Extraction results: `/public/extraction/`
- Auto-deployed on git push to main

## Future Enhancements

1. **Search Functionality**: Find signs by number
2. **Filters**: Show/hide by confidence level
3. **Annotations**: Add notes to signs
4. **Export**: Download verified results
5. **Keyboard Navigation**: Arrow keys for sign selection
6. **Mini-map**: Overview navigation widget
7. **Split View**: Compare original PDF with extraction

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Type check
npm run type-check

# Lint
npm run lint
```

## Dependencies

```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.x",
  "@radix-ui/react-select": "latest",
  "class-variance-authority": "latest",
  "clsx": "latest"
}
```

---
*Parent: `/sign-ocr-extraction/claude.md`*
*Last Updated: August 31, 2025*