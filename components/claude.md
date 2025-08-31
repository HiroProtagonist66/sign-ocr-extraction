# Claude.md - Shared Components

## Folder Purpose
Reusable React components and UI primitives for the sign extraction viewer application. Built with TypeScript, Tailwind CSS, and Radix UI for accessibility.

## Component Library

### PlanViewer Component (`/PlanViewer/`)
Main floor plan visualization component with interactive hotspots.

```typescript
interface PlanViewerProps {
  planImage: string;
  signs: SignData[];
  onSignClick?: (sign: SignData) => void;
  showLabels?: boolean;
  highlightSign?: string;
}
```

Key features:
- Responsive image scaling
- Percentage-based hotspot positioning
- Touch and mouse interaction
- Zoom controls
- Sign highlighting

### UI Primitives (`/ui/`)
Styled components using Radix UI and class-variance-authority.

#### Badge Component
```typescript
// Usage: Status indicators, confidence levels
<Badge variant="outline" className="confidence-high">
  98% Accurate
</Badge>

// Variants: default, secondary, destructive, outline
```

#### Button Component
```typescript
// Usage: Actions, navigation
<Button 
  variant="default" 
  size="lg" 
  onClick={handleExtract}
>
  Extract Signs
</Button>

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon
```

#### Card Component
```typescript
// Usage: Sign details, statistics panels
<Card>
  <CardHeader>
    <CardTitle>Sign 2001</CardTitle>
    <CardDescription>Admin Level 1</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Location: Zone A</p>
    <p>Confidence: High</p>
  </CardContent>
</Card>
```

#### Select Component
```typescript
// Usage: PDF selector, filter dropdowns
<Select value={selectedPdf} onValueChange={setSelectedPdf}>
  <SelectTrigger>
    <SelectValue placeholder="Choose PDF" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pdf13">COLO 2 - Admin</SelectItem>
    <SelectItem value="pdf14">COLO 2 - Service</SelectItem>
  </SelectContent>
</Select>
```

## Component Patterns

### Styling with CVA
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Accessibility Features
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus visible indicators
- Screen reader announcements

### Responsive Design
```typescript
// Utility for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "grid gap-4",
  "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
)}>
  {/* Responsive grid layout */}
</div>
```

## State Management Patterns

### Local Component State
```typescript
function PlanViewer({ signs }: Props) {
  const [selectedSign, setSelectedSign] = useState<SignData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Derived state
  const visibleSigns = useMemo(() => 
    filterVisibleSigns(signs, zoomLevel, panOffset),
    [signs, zoomLevel, panOffset]
  );
}
```

### Event Handling
```typescript
const handleHotspotClick = useCallback((sign: SignData) => {
  setSelectedSign(sign);
  onSignClick?.(sign);
  
  // Analytics tracking
  trackEvent('sign_clicked', {
    sign_number: sign.sign_number,
    confidence: sign.confidence
  });
}, [onSignClick]);
```

## Performance Optimizations

### Memoization
```typescript
// Expensive computations
const processedSigns = useMemo(() => 
  signs.map(sign => ({
    ...sign,
    color: getConfidenceColor(sign.confidence),
    size: calculateHotspotSize(sign, zoomLevel)
  })),
  [signs, zoomLevel]
);
```

### Lazy Loading
```typescript
// Dynamic imports for heavy components
const HeavyVisualization = dynamic(
  () => import('./HeavyVisualization'),
  { 
    loading: () => <Skeleton className="h-96" />,
    ssr: false 
  }
);
```

### Virtual Rendering
```typescript
// Only render visible hotspots
function renderHotspots(signs: SignData[], viewport: Viewport) {
  return signs
    .filter(sign => isInViewport(sign, viewport))
    .map(sign => <Hotspot key={sign.sign_number} {...sign} />);
}
```

## Testing Approach

### Component Testing
```typescript
// Testing interactive behavior
describe('PlanViewer', () => {
  it('should highlight sign on click', () => {
    const onSignClick = jest.fn();
    const { getByTestId } = render(
      <PlanViewer signs={mockSigns} onSignClick={onSignClick} />
    );
    
    fireEvent.click(getByTestId('sign-2001'));
    expect(onSignClick).toHaveBeenCalledWith(
      expect.objectContaining({ sign_number: '2001' })
    );
  });
});
```

### Visual Regression
- Storybook stories for each component
- Percy snapshots for visual changes
- Responsive breakpoint testing

## Utility Functions (`/lib/utils.ts`)

```typescript
// Class name merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Coordinate conversion
export function pixelToPercentage(pixel: number, total: number): number {
  return (pixel / total) * 100;
}

// Sign validation
export function isValidSignNumber(value: string): boolean {
  return /^\d{4}(?:\.\d+)?$/.test(value);
}

// Confidence color mapping
export function getConfidenceColor(confidence: string): string {
  const colors = {
    embedded: 'border-green-500',
    high: 'border-blue-500',
    medium: 'border-yellow-500',
    low: 'border-red-500'
  };
  return colors[confidence] || 'border-gray-500';
}
```

## Known Issues

### Touch Gesture Handling
- **Issue**: Pinch zoom conflicts with browser zoom
- **Solution**: Custom gesture handler with preventDefault
- **File**: `PlanViewer/PlanViewer.tsx`

### Large Dataset Performance
- **Issue**: Rendering 150+ hotspots causes lag
- **Solution**: Viewport culling and virtualization
- **Status**: Implemented in PlanViewer

## Future Components

1. **SearchBar**: Find signs by number
2. **FilterPanel**: Filter by confidence/zone
3. **MiniMap**: Overview navigation
4. **SignDetailsModal**: Detailed sign information
5. **ExportDialog**: Export verified results
6. **KeyboardShortcuts**: Navigation helper
7. **ProgressIndicator**: Extraction status

## Component Documentation

Each component should have:
- TypeScript interfaces for props
- JSDoc comments for complex logic
- Storybook stories for variants
- Usage examples in comments

Example:
```typescript
/**
 * PlanViewer - Interactive floor plan with sign hotspots
 * 
 * @example
 * <PlanViewer
 *   planImage="/plans/colo2.png"
 *   signs={extractedSigns}
 *   onSignClick={(sign) => console.log(sign)}
 *   showLabels={true}
 * />
 */
```

---
*Parent: `/sign-ocr-extraction/claude.md`*
*Last Updated: August 31, 2025*