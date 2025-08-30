# Sign Inventory Management System - Claude.md

## Project Vision
A comprehensive Progressive Web App for managing sign inventory at Microsoft data center construction sites. The core innovation is interactive site plans with hotspot overlays, enabling field installers to visually track sign installations directly on architectural drawings, with robust offline capabilities for areas without network connectivity.

## Current Implementation Status

### ✅ Completed Features
- User authentication with role-based access (Manager/Installer)
- Site and area selection hierarchy
- Sign inventory tracking with status recording (Present/Missing/Damaged)
- Sign type filtering and sorting
- Offline data persistence with IndexedDB
- PWA installation on mobile devices
- Manager dashboard with analytics and charts
- CSV export functionality
- Background sync for offline→online data transfer
- Row Level Security (RLS) on all database tables

### 🚧 Planned Core Feature: Interactive Site Plans
- Interactive hotspots overlaid on architectural drawings
- Visual sign tracking directly on floor plans
- Offline map downloading and caching
- Touch-optimized interaction for mobile devices
- Persistent offline state management

## Architecture Overview

### Data Hierarchy
```
Sites (Buildings) → FTY02, SAT80, CC006, ATL06, FTY01
  └── Areas → Admin, Colo 1, Colo 2, Colo 3, Site, Guardhouse
      └── Cells (for Colos) → CE1, CE2, CE3, CE4
          └── Signs → Individual sign placements with unique numbers
```

### Sign Numbering Convention
Signs follow a hierarchical naming pattern:
- **Simple Format**: Sequential numbers (e.g., "1263", "2001")
- **Area Context**: Stored in `project_sign_catalog.original_csv_level_no`
- **Location Reference**: Areas like "COLO 2" marked on plans

### Sign Type Classification
```
BC = Building Code signs
  - BC-1.0: Exit signs
  - BC-1.14: Special exit variants
  - BC-5.1: 1 Hour Fire Barrier
  - BC-5.2: 2 Hour Fire Barrier
  - BC-6.1: Equipment identification
  
PAC = Project-specific signs
  - PAC-1.1: Project-specific markers
  
BID = Bidirectional signs
  - BID-1.2: Two-way directional
  
ID = Identification signs
  - ID-5.2: Room/area identification
```

## Database Schema Design

### Core Tables

#### Site Management
```sql
sites                    -- Physical buildings/data centers
project_areas           -- Logical divisions (Admin, Colos, etc.)
slp_areas              -- Site Layout Plan areas for mapping
slp_pages              -- Individual architectural drawing pages
```

#### Sign Catalog
```sql
sign_descriptions       -- Master list of sign types (BC-1.0, etc.)
project_sign_catalog   -- All signs for each site with metadata
  - sign_number        -- Unique identifier per sign
  - sign_description_id -- Links to sign type
  - side_a_message     -- Custom text for side A
  - side_b_message     -- Custom text for side B
  - original_csv_level_no -- Area designation from import
```

#### Hotspot System (Interactive Maps)
```sql
hotspots
  - slp_page_id        -- Links to specific architectural drawing
  - x_percentage       -- Horizontal position (0-100%)
  - y_percentage       -- Vertical position (0-100%)
  - width_percentage   -- Hotspot width as % of drawing
  - height_percentage  -- Hotspot height as % of drawing
  - sign_number        -- Links to project_sign_catalog
  - inventory_status   -- Not_Inventoried_Yet|Present|Missing|Issue
  - install_status     -- Pending_Install|Installed|Issue
  - bbox              -- JSON bounding box data
```

#### Inventory Tracking
```sql
inventory_sessions     -- Groups inventory activities by session
inventory_log         -- Individual sign status records
  - inventory_type    -- Present|Missing|Damaged
  - quantity         -- Number of signs checked
  - notes           -- Field notes
```

#### User Management
```sql
user_profiles         -- User accounts with roles
user_site_assignments -- Maps users to accessible sites
```

#### Future: Installation Verification
```sql
installation_photos   -- Photo evidence of installations
  - ocr_extracted_sign_number  -- Future OCR capability
  - ocr_confidence             -- OCR accuracy score
  - status                    -- pending_ocr|processed|verified
```

## Critical Offline Requirements

### Data Persistence Strategy
1. **IndexedDB Primary Storage**: All site data, plans, and inventory cached locally
2. **Service Worker Caching**: Static assets and PWA shell
3. **Session Storage**: Active session state and filters
4. **Sync Queue**: Pending changes awaiting network connection

### Offline Capabilities Must-Haves
- ✅ **Complete Offline Navigation**: Every screen accessible without network
- ✅ **Data Loss Prevention**: Survives browser crashes and phone restarts
- ✅ **Selective Download**: Download specific areas/maps when online
- ✅ **Visual Feedback**: Clear offline/online status indicators
- ✅ **Conflict Resolution**: Handle multiple offline sessions gracefully

### Offline Data Flow
```
1. While Online:
   - Download site plans for assigned areas
   - Cache hotspot overlays and sign catalog
   - Store in IndexedDB with versioning

2. Going Offline:
   - Seamlessly switch to cached data
   - Queue all changes locally
   - Maintain full app functionality

3. During Offline Work:
   - Update hotspot statuses
   - Record inventory changes
   - Add notes and observations
   - All data persisted to IndexedDB

4. Returning Online:
   - Background sync activates
   - Queue processed in order
   - Conflicts resolved by timestamp
   - User notified of sync status
```

## Interactive Site Plans Feature

### Implementation Architecture
```javascript
// Hotspot interaction flow
1. Load site plan image as base layer
2. Overlay hotspots from database
3. Enable pan/zoom for navigation
4. Tap hotspot to show sign details
5. Quick actions: Mark as Installed/Issue/Missing
6. Changes saved to IndexedDB immediately
7. Sync queue updated for later upload
```

### Hotspot Rendering Strategy
- Use percentage-based positioning for responsive scaling
- SVG overlays for crisp rendering at any zoom level
- Touch-optimized hit targets (minimum 44x44px)
- Visual states: Pending (gray), Installed (green), Issue (yellow), Missing (red)

### Plan Navigation Features
- Pinch-to-zoom on mobile devices
- Double-tap to zoom to specific area
- Mini-map for orientation on large plans
- Search by sign number with visual highlighting
- Filter hotspots by status or sign type

## Technical Implementation Details

### Tech Stack
```
Frontend:
  - Next.js 15.5.2 (App Router)
  - React 19
  - TypeScript
  - Tailwind CSS
  
Backend:
  - Supabase (PostgreSQL)
  - Row Level Security (RLS)
  - Realtime subscriptions (future)
  
Offline:
  - Service Worker (v3)
  - IndexedDB via Dexie.js (recommended)
  - Background Sync API
  
Deployment:
  - Vercel
  - GitHub CI/CD
```

### File Structure
```
/sign-inventory/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── inventory/          # Main inventory interface
│   │   ├── plans/             # [FUTURE] Interactive site plans
│   │   ├── dashboard/         # Manager analytics
│   │   └── manager/           # User management
│   ├── components/
│   │   ├── Hotspot/          # [FUTURE] Hotspot components
│   │   ├── PlanViewer/       # [FUTURE] Site plan viewer
│   │   └── InventoryList/    # Current list view
│   └── lib/
│       ├── offline/          # Offline storage logic
│       ├── sync/             # Sync queue management
│       └── supabase/         # Database queries
├── public/
│   ├── plans/               # [FUTURE] Cached site plans
│   ├── manifest.json        # PWA manifest
│   └── sw.js               # Service worker
└── chat_summaries/         # Development documentation
```

## Development Workflow

### Local Development
```bash
cd /Users/benjaminbegner/Documents/sign_app_supabase_directory/sign-inventory
npm run dev

# Access URLs
Desktop: http://localhost:3000
Mobile: http://192.168.50.96:3000 (same network)
Production: https://sign-inventory-app-one.vercel.app
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://odlzqhqvlqqcaivsohda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Key Implementation Patterns

### Offline-First Data Access
```typescript
// Always try local first, fallback to network
async function getSignData(siteId: string) {
  // 1. Check IndexedDB
  const localData = await db.signs.where('siteId').equals(siteId).toArray();
  
  if (localData.length && !isStale(localData)) {
    return localData;
  }
  
  // 2. If online, fetch and cache
  if (navigator.onLine) {
    const freshData = await supabase
      .from('project_sign_catalog')
      .select('*')
      .eq('site_id', siteId);
    
    await db.signs.bulkPut(freshData);
    return freshData;
  }
  
  // 3. Return stale data if offline
  return localData;
}
```

### Hotspot State Management
```typescript
interface HotspotState {
  id: string;
  signNumber: string;
  status: 'Not_Inventoried_Yet' | 'Present' | 'Missing' | 'Issue';
  installStatus: 'Pending_Install' | 'Installed' | 'Issue';
  lastModified: Date;
  syncStatus: 'synced' | 'pending' | 'error';
}
```

### Sync Queue Pattern
```typescript
// Queue changes for later sync
async function updateHotspotStatus(hotspotId: string, status: string) {
  // 1. Update local state immediately
  await db.hotspots.update(hotspotId, { 
    status, 
    syncStatus: 'pending',
    lastModified: new Date() 
  });
  
  // 2. Add to sync queue
  await db.syncQueue.add({
    type: 'hotspot_update',
    payload: { hotspotId, status },
    timestamp: new Date(),
    retries: 0
  });
  
  // 3. Trigger sync if online
  if (navigator.onLine) {
    await processSync Queue();
  }
}
```

## Performance Considerations

### Mobile Optimization
- Lazy load site plans (progressive image loading)
- Virtual scrolling for large sign lists
- Debounced search and filter operations
- Minimize re-renders with React.memo
- Use CSS transforms for smooth pan/zoom

### Data Management
- Selective sync based on user's assigned sites
- Compression for cached images
- Periodic cleanup of old offline data
- Efficient IndexedDB queries with proper indexes

## Security Model

### Row Level Security (RLS)
- All database tables protected with RLS policies
- Users can only see assigned sites (installers)
- Managers have full visibility
- Audit trail for all changes

### Authentication Flow
```
1. Supabase Auth handles user management
2. JWT tokens for session management
3. Automatic profile creation on signup
4. Role assignment (first user = manager)
```

## Future Enhancements

### Phase 1: Interactive Plans (Priority)
- [ ] Implement PlanViewer component
- [ ] Add hotspot overlay system
- [ ] Enable offline plan downloading
- [ ] Build touch-optimized interactions

### Phase 2: Enhanced Tracking
- [ ] GPS location verification
- [ ] Photo capture for installations
- [ ] QR code scanning for signs
- [ ] Time tracking per installation

### Phase 3: Advanced Features
- [ ] Real-time collaboration
- [ ] OCR for automatic sign detection
- [ ] AI-powered issue detection
- [ ] Predictive inventory analytics

### Phase 4: Enterprise Features
- [ ] Multi-project management
- [ ] Contractor portal
- [ ] Compliance reporting
- [ ] Integration with Microsoft systems

## Testing Strategy

### Offline Testing Checklist
- [ ] Airplane mode functionality
- [ ] Browser crash recovery
- [ ] Phone restart persistence
- [ ] Large dataset performance
- [ ] Sync conflict resolution
- [ ] Progressive download of plans

### Device Testing Matrix
- iPhone Safari (iOS 15+)
- Android Chrome (Android 10+)
- iPad Safari (landscape/portrait)
- Desktop Chrome/Edge/Firefox

## Known Issues & Solutions

### Current Issues
1. **Mobile Cookie Handling**: Middleware disabled, using client-side auth
2. **Browser Extensions**: Crypto wallets causing errors (suppressed)
3. **TypeScript Complexity**: Complex Supabase query types

### Mitigations
- Client-side AuthGuard for route protection
- GlobalErrorHandler for extension errors
- Careful type definitions for database queries

## Support & Documentation

### Key Documentation Files
- `PROJECT_SUMMARY_2025-08-28.md` - Complete system overview
- `SESSION_***.md` - Development session logs
- `USER_ROLES_SETUP.md` - Role configuration guide
- `TROUBLESHOOTING.md` - Common issues and fixes

### Contact & Resources
- Production URL: https://sign-inventory-app-one.vercel.app
- GitHub Repository: [Private]
- Supabase Dashboard: [Project-specific URL]

## Development Principles

1. **Offline-First**: Every feature must work offline
2. **Mobile-Optimized**: Touch-first interface design
3. **Data Integrity**: Never lose user's work
4. **Progressive Enhancement**: Core features work everywhere
5. **Performance**: Fast interactions even with large datasets

---

*This document serves as the primary reference for Claude when working on the Sign Inventory Management System. It captures both the current implementation and the vision for the interactive site plan features that will revolutionize field inventory management.*