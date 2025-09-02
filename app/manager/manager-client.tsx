'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Download, ChevronLeft, ChevronRight, Check, AlertCircle, FileSpreadsheet, Database, Upload, ZoomIn, ZoomOut, Maximize2, Move, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import PDFUpload from './pdf-upload';
import { AutoDetectReviewPanel } from './auto-detect-review-panel';
import { detectSignTypesForPages } from '@/lib/sign-type-detector';

// Common sign types in datacenters
const commonSignTypes = [
  { code: 'BC-1.0', description: 'Exit Signs', shortcut: '1' },
  { code: 'BC-1.1', description: 'Exit Route', shortcut: '2' },
  { code: 'BC-2.0', description: 'Fire Equipment', shortcut: '3' },
  { code: 'BC-5.1', description: '1-Hour Fire Barrier', shortcut: '4' },
  { code: 'BC-5.2', description: '2-Hour Fire Barrier', shortcut: '5' },
  { code: 'PAC-1.1', description: 'Power Centers', shortcut: '6' },
  { code: 'ID-5.2', description: 'Room Identification', shortcut: '7' },
  { code: 'BID-1.2', description: 'Building ID', shortcut: '8' },
  { code: 'SPLIT', description: 'Multiple Types', shortcut: '9' },
  { code: 'NONE', description: 'No Signs', shortcut: '0' },
];

// Site configuration
const SITE_ID = 'ATL06';
const TOTAL_PAGES = 119; // Updated based on actual PDF page count

export default function ManagerClient() {
  const [pageAssignments, setPageAssignments] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pagesExist, setPagesExist] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Database states
  const [signTypes, setSignTypes] = useState<Array<{sign_type_code: string; description: string}>>([]);
  const [pageIdMap, setPageIdMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Auto-detect states
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [autoDetectProgress, setAutoDetectProgress] = useState(0);
  const [detectedAssignments, setDetectedAssignments] = useState<any>({});
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  
  // Pan and zoom states
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  // Calculate progress
  const assignedCount = Object.keys(pageAssignments).filter(key => pageAssignments[parseInt(key)]).length;
  const progressPercent = Math.round((assignedCount / TOTAL_PAGES) * 100);

  // Get current page image path (using converted images)
  const pageStr = currentPage.toString().padStart(2, '0');
  const imagePath = `/plans/atl06/page_${pageStr}.png`;

  // Check if pages exist in database
  async function checkPagesExist() {
    if (!isSupabaseConfigured()) {
      setPagesExist(true); // Assume they exist in dev mode
      return;
    }
    
    try {
      const { count } = await supabase
        .from('slp_pages')
        .select('*', { count: 'exact', head: true })
        .eq('slp_areas.sites.name', SITE_ID);
      
      setPagesExist((count || 0) > 0);
      console.log(`Pages exist for ${SITE_ID}: ${(count || 0) > 0} (${count} pages)`);
    } catch (error) {
      console.error('Error checking pages:', error);
      setPagesExist(false);
    }
  }
  
  // Initialize pages in database
  async function initializePages() {
    if (!isSupabaseConfigured()) {
      alert('Cannot initialize pages in development mode. Configure Supabase first.');
      return;
    }
    
    setIsInitializing(true);
    
    try {
      console.log(`Starting initialization for ${SITE_ID}...`);
      
      // Test database connection first
      const { error: pingError } = await supabase
        .from('sites')
        .select('count(*)', { count: 'exact', head: true });
      
      if (pingError) {
        throw new Error(`Database not connected: ${pingError.message}`);
      }
      
      console.log('Database connected, creating site...');
      
      // Use upsert to avoid conflicts
      const { data: sites, error: siteError } = await supabase
        .from('sites')
        .upsert(
          { name: SITE_ID },
          { onConflict: 'name', ignoreDuplicates: false }
        )
        .select('id');
      
      if (siteError) {
        console.error('Site error details:', siteError);
        throw new Error(`Failed to create/get site: ${siteError.message}`);
      }
      
      const site = sites?.[0];
      if (!site) {
        throw new Error('No site returned after upsert');
      }
      
      console.log(`Site ready: ${site.id}`);
      
      // Create or get area - note the column name is slp_area_id in some tables
      const { data: areas, error: areaError } = await supabase
        .from('slp_areas')
        .upsert(
          { 
            site_id: site.id, 
            name: 'Main Building'
          },
          { onConflict: 'site_id,name', ignoreDuplicates: false }
        )
        .select('id');
      
      if (areaError) {
        console.error('Area error details:', areaError);
        throw new Error(`Failed to create/get area: ${areaError.message}`);
      }
      
      const area = areas?.[0];
      if (!area) {
        throw new Error('No area returned after upsert');
      }
      
      console.log(`Area ready: ${area.id}`);
      
      // Create pages - note: column might be slp_area_id not area_id
      const pages = [];
      for (let i = 1; i <= TOTAL_PAGES; i++) {
        const pageStr = i.toString().padStart(2, '0');
        pages.push({
          slp_area_id: area.id,  // Changed from area_id to slp_area_id
          page_number: i,
          image_storage_path: `atl06/page_${pageStr}_full.png`,
          image_width_pixels: 1920,
          image_height_pixels: 1080
        });
      }
      
      console.log(`Inserting ${pages.length} pages in batches...`);
      
      // Insert pages in smaller batches of 20
      const batchSize = 20;
      let successCount = 0;
      
      for (let i = 0; i < pages.length; i += batchSize) {
        const batch = pages.slice(i, i + batchSize);
        
        // Use upsert to avoid duplicates
        const { data, error } = await supabase
          .from('slp_pages')
          .upsert(batch, { 
            onConflict: 'slp_area_id,page_number',
            ignoreDuplicates: true 
          });
        
        if (error) {
          console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error);
          // Continue with other batches even if one fails
        } else {
          successCount += batch.length;
          console.log(`Inserted pages ${i + 1} to ${Math.min(i + batchSize, pages.length)}`);
        }
      }
      
      if (successCount === 0) {
        throw new Error('No pages were successfully created');
      }
      
      console.log(`Successfully initialized ${successCount} pages for ${SITE_ID}`);
      alert(`Successfully created ${successCount} pages for ${SITE_ID}!`);
      
      // Reload data
      await checkPagesExist();
      await loadPageAssignments();
      
    } catch (error: any) {
      console.error('Initialization failed:', error);
      alert(`Initialization failed: ${error.message || 'Unknown error'}\n\nCheck the browser console for details.`);
    } finally {
      setIsInitializing(false);
    }
  }
  
  // Load sign types and assignments on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      // First check if pages exist
      await checkPagesExist();
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        // Use demo data for development
        console.log('📦 Using demo data - Supabase not configured');
        
        // Set demo sign types
        setSignTypes([
          { sign_type_code: 'BC-1.0', description: 'Exit Signs' },
          { sign_type_code: 'BC-1.1', description: 'Exit Route' },
          { sign_type_code: 'BC-2.0', description: 'Fire Equipment' },
          { sign_type_code: 'BC-5.1', description: '1-Hour Fire Barrier' },
          { sign_type_code: 'BC-5.2', description: '2-Hour Fire Barrier' },
          { sign_type_code: 'PAC-1.1', description: 'Power Centers' },
          { sign_type_code: 'ID-5.2', description: 'Room Identification' },
          { sign_type_code: 'BID-1.2', description: 'Building ID' },
          { sign_type_code: 'MULTIPLE', description: 'Multiple Types on Page' },
          { sign_type_code: 'NONE', description: 'No Signs on Page' }
        ]);
        
        // Load assignments from localStorage only
        const saved = localStorage.getItem(`pageAssignments_${SITE_ID}`);
        if (saved) {
          setPageAssignments(JSON.parse(saved));
        }
        
        setLoading(false);
        return;
      }
      
      // Load from Supabase
      console.log('Loading data from Supabase...');
      
      try {
        await Promise.all([
          loadSignTypes(),
          loadPageAssignments()
        ]);
        
        console.log('Data loading complete');
        console.log(`Sign types loaded: ${signTypes.length}`);
        console.log(`Page ID map entries: ${Object.keys(pageIdMap).length}`);
        console.log(`Existing assignments: ${Object.keys(pageAssignments).length}`);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Auto-save when assignments change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(pageAssignments).length > 0) {
        localStorage.setItem(`pageAssignments_${SITE_ID}`, JSON.stringify(pageAssignments));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pageAssignments]);

  // Keyboard navigation and shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      // Zoom controls with Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
          return;
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
          return;
        } else if (e.key === '0') {
          e.preventDefault();
          handleFitToScreen();
          return;
        } else if (e.key === 's') {
          e.preventDefault();
          saveAssignments();
          return;
        }
      }

      // Arrow key navigation
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < TOTAL_PAGES) {
        setCurrentPage(currentPage + 1);
      } else if (e.key === 'ArrowUp' && currentPage > 1) {
        e.preventDefault();
        setCurrentPage(currentPage - 1);
      } else if (e.key === 'ArrowDown' && currentPage < TOTAL_PAGES) {
        e.preventDefault();
        setCurrentPage(currentPage + 1);
      }
      
      // Quick assign with number keys (disabled for now - no shortcuts in database)
      // TODO: Add shortcut mapping for database sign types
      // const type = commonSignTypes.find(t => t.shortcut === e.key);
      // if (type) {
      //   updatePage(currentPage, type.code === 'NONE' ? '' : type.code);
      // }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, pageAssignments, zoom]);

  // Preload adjacent page images and reset zoom
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    
    // Reset zoom and position when changing pages
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    
    // Preload adjacent pages
    [currentPage - 1, currentPage + 1]
      .filter(p => p >= 1 && p <= TOTAL_PAGES)
      .forEach(pageNum => {
        const img = new Image();
        const pageStr = pageNum.toString().padStart(2, '0');
        img.src = `/plans/atl06/page_${pageStr}.png`;
      });
  }, [currentPage]);

  // Load sign types from database
  async function loadSignTypes() {
    try {
      // Get all sign types from sign_descriptions table
      const { data: allSignTypes, error } = await supabase
        .from('sign_descriptions')
        .select('sign_type_code, description')
        .order('sign_type_code');
      
      if (error) throw error;
      
      if (allSignTypes) {
        // Add special options for pages without signs or with multiple types
        const specialTypes = [
          { sign_type_code: 'MULTIPLE', description: 'Multiple Types on Page' },
          { sign_type_code: 'NONE', description: 'No Signs on Page' }
        ];
        
        setSignTypes([...allSignTypes, ...specialTypes]);
      }
      
    } catch (error) {
      console.error('Error loading sign types:', error);
      // Fallback to hardcoded types if database fails
      setSignTypes(commonSignTypes.map(t => ({
        sign_type_code: t.code,
        description: t.description
      })));
    }
  }

  // Load page assignments from database
  async function loadPageAssignments() {
    try {
      console.log(`Loading page assignments for ${SITE_ID}...`);
      
      // Get all pages for ATL06 with their current assignments
      // Note: Using slp_area_id for the join
      const { data: pages, error } = await supabase
        .from('slp_pages')
        .select(`
          id,
          page_number,
          sign_type_code,
          image_storage_path,
          slp_areas!slp_area_id (
            sites!site_id (
              name
            )
          )
        `)
        .eq('slp_areas.sites.name', SITE_ID)
        .order('page_number');
      
      if (error) {
        console.error('Error loading pages:', error);
        // Still check localStorage as fallback
        loadAssignmentsFromLocalStorage();
        return;
      }
      
      if (pages && pages.length > 0) {
        // Convert to simple object for state
        const assignments: Record<number, string> = {};
        const idMap: Record<number, string> = {};
        
        pages.forEach(page => {
          if (page.sign_type_code) {
            assignments[page.page_number] = page.sign_type_code;
          }
          idMap[page.page_number] = page.id;
        });
        
        console.log(`Loaded ${pages.length} pages with ${Object.keys(assignments).length} existing assignments`);
        console.log('Page ID map populated:', Object.keys(idMap).length, 'entries');
        
        setPageAssignments(assignments);
        setPageIdMap(idMap);
        setPagesExist(true);
      } else {
        console.warn(`No pages found for ${SITE_ID} in database`);
        setPagesExist(false);
        // Still load from localStorage if available
        loadAssignmentsFromLocalStorage();
      }
      
    } catch (error) {
      console.error('Error loading page assignments:', error);
      // Try loading from localStorage as fallback
      loadAssignmentsFromLocalStorage();
    }
  }

  // Fallback: Load assignments from localStorage
  function loadAssignmentsFromLocalStorage() {
    const saved = localStorage.getItem(`pageAssignments_${SITE_ID}`);
    if (saved) {
      setPageAssignments(JSON.parse(saved));
    }
  }

  // Save single assignment to database
  async function saveAssignment(pageNumber: number, signTypeCode: string) {
    // In development mode without Supabase, only save to localStorage
    if (!isSupabaseConfigured()) {
      const newAssignments = {
        ...pageAssignments,
        [pageNumber]: signTypeCode
      };
      localStorage.setItem(`pageAssignments_${SITE_ID}`, JSON.stringify(newAssignments));
      setLastSaved(new Date());
      return;
    }
    
    try {
      let pageId = pageIdMap[pageNumber];
      
      if (!pageId) {
        console.warn(`No page ID in map for page ${pageNumber}, attempting to fetch from database...`);
        
        // Try to find the page ID from database with proper join
        const { data: pages, error } = await supabase
          .from('slp_pages')
          .select(`
            id,
            page_number,
            slp_areas!slp_area_id (
              sites!site_id (
                name
              )
            )
          `)
          .eq('page_number', pageNumber)
          .eq('slp_areas.sites.name', SITE_ID);
        
        const page = pages?.[0];
        
        if (error || !page) {
          console.error(`Could not find page ${pageNumber} in database:`, error);
          return;
        }
        
        // Update the map for future use
        pageId = page.id;
        setPageIdMap(prev => ({ ...prev, [pageNumber]: pageId }));
        console.log(`Found and cached page ID for page ${pageNumber}: ${pageId}`);
      }
      
      // Update the database
      const { error } = await supabase
        .from('slp_pages')
        .update({ 
          sign_type_code: signTypeCode || null,
          last_modified_at: new Date().toISOString()
        })
        .eq('id', pageId);
      
      if (error) throw error;
      
      // Update local state
      setPageAssignments(prev => ({
        ...prev,
        [pageNumber]: signTypeCode || undefined
      }));
      
      // Also save to localStorage as backup
      const newAssignments = {
        ...pageAssignments,
        [pageNumber]: signTypeCode
      };
      localStorage.setItem(`pageAssignments_${SITE_ID}`, JSON.stringify(newAssignments));
      
      setLastSaved(new Date());
      
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  }

  // Save all assignments (batch update)
  async function saveAssignments() {
    setIsSaving(true);
    localStorage.setItem(`pageAssignments_${SITE_ID}`, JSON.stringify(pageAssignments));
    
    // In development mode without Supabase, only save to localStorage
    if (!isSupabaseConfigured()) {
      setLastSaved(new Date());
      setIsSaving(false);
      return;
    }
    
    try {
      // Update each page that has an assignment
      const updatePromises = Object.entries(pageAssignments).map(async ([pageNum, typeCode]) => {
        const pageId = pageIdMap[parseInt(pageNum)];
        if (pageId) {
          return supabase
            .from('slp_pages')
            .update({ 
              sign_type_code: typeCode || null,
              last_modified_at: new Date().toISOString()
            })
            .eq('id', pageId);
        }
      });

      await Promise.all(updatePromises);
      setLastSaved(new Date());
      
    } catch (error) {
      console.error('Failed to save to database:', error);
    } finally {
      setIsSaving(false);
    }
  }

  // Update a single page assignment
  function updatePage(page: number, signType: string) {
    if (signType) {
      setPageAssignments(prev => ({
        ...prev,
        [page]: signType
      }));
    } else {
      // Clear assignment
      setPageAssignments(prev => {
        const updated = { ...prev };
        delete updated[page];
        return updated;
      });
    }
    // Save to database immediately
    saveAssignment(page, signType);
  }

  // Navigate to page
  function navigateToPage(page: number) {
    if (page >= 1 && page <= TOTAL_PAGES) {
      setCurrentPage(page);
    }
  }

  // Apply current selection to page
  function applyAssignment() {
    if (selectedType) {
      updatePage(currentPage, selectedType);
      setSelectedType('');
      // Auto-advance to next page if not on last page
      if (currentPage < TOTAL_PAGES) {
        setCurrentPage(currentPage + 1);
      }
    }
  }

  // Auto-detect sign types for all pages
  async function autoDetectSignTypes() {
    setIsAutoDetecting(true);
    setAutoDetectProgress(0);
    setDetectedAssignments({});
    
    try {
      console.log(`Starting auto-detection for ${TOTAL_PAGES} pages...`);
      
      // Create array of all page numbers
      const pageNumbers = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
      
      // Detect sign types with progress callback
      const results = await detectSignTypesForPages(
        pageNumbers,
        (current, total) => {
          setAutoDetectProgress(Math.round((current / total) * 100));
        }
      );
      
      // Convert Map to object for state
      const detectionsObj: Record<number, any> = {};
      results.forEach((value, key) => {
        if (value.type) {
          detectionsObj[key] = value;
        }
      });
      
      console.log(`Auto-detection complete. Found ${Object.keys(detectionsObj).length} suggestions`);
      
      setDetectedAssignments(detectionsObj);
      setShowReviewPanel(true);
      setReviewMode(true);
      
    } catch (error) {
      console.error('Auto-detection failed:', error);
      alert('Auto-detection failed. Please try again.');
    } finally {
      setIsAutoDetecting(false);
      setAutoDetectProgress(0);
    }
  }
  
  // Apply auto-detected assignments
  function applyDetectedAssignments(assignments: Record<number, string>) {
    // Update page assignments
    Object.entries(assignments).forEach(([pageStr, type]) => {
      const pageNum = parseInt(pageStr);
      updatePage(pageNum, type);
    });
    
    // Show success message
    const count = Object.keys(assignments).length;
    console.log(`✅ Applied ${count} auto-detected assignments`);
    
    // Exit review mode
    setReviewMode(false);
    setShowReviewPanel(false);
  }

  // Export as CSV
  function exportCSV() {
    const rows = ['Page,Sign Type,Description'];
    for (let page = 1; page <= TOTAL_PAGES; page++) {
      const type = pageAssignments[page] || 'Unassigned';
      const desc = signTypes.find(t => t.sign_type_code === type)?.description || '';
      rows.push(`${page},${type},${desc}`);
    }
    
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${SITE_ID}-page-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Get sign type description
  function getDescription(code: string | undefined): string {
    if (!code) return '--';
    return signTypes.find(t => t.sign_type_code === code)?.description || code;
  }

  // Zoom control functions
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };
  
  const handleFitToScreen = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(prev + delta, MAX_ZOOM)));
  };
  
  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Touch support for tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };
  
  // Keyboard shortcuts for navigation and review
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // Review mode shortcuts
      if (reviewMode && detectedAssignments[currentPage]) {
        if (e.key === 'Enter' || e.key === 'y') {
          // Accept current suggestion
          e.preventDefault();
          updatePage(currentPage, detectedAssignments[currentPage].type);
          if (currentPage < TOTAL_PAGES) {
            setCurrentPage(currentPage + 1);
          }
        } else if (e.key === 'n' || e.key === 'Delete') {
          // Skip current suggestion
          e.preventDefault();
          if (currentPage < TOTAL_PAGES) {
            setCurrentPage(currentPage + 1);
          }
        }
      }
      
      // Arrow keys for navigation (always active)
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        navigateToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < TOTAL_PAGES) {
        e.preventDefault();
        navigateToPage(currentPage + 1);
      } else if (e.key === 'ArrowUp' && currentPage > 10) {
        e.preventDefault();
        navigateToPage(currentPage - 10);
      } else if (e.key === 'ArrowDown' && currentPage <= TOTAL_PAGES - 10) {
        e.preventDefault();
        navigateToPage(currentPage + 10);
      }
      
      // Zoom controls
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleFitToScreen();
        } else if (e.key === 's') {
          // Save shortcut
          e.preventDefault();
          saveAssignments();
        }
      }
      
      // ESC to exit review mode
      if (e.key === 'Escape' && reviewMode) {
        setReviewMode(false);
        setShowReviewPanel(false);
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, reviewMode, detectedAssignments]);

  // Page Viewer Component (Top Section) with Pan/Zoom
  function PageViewer() {
    const suggestedAssignment = detectedAssignments[currentPage];
    
    return (
      <div className="bg-white shadow-sm flex flex-col" style={{ height: '55vh' }}>
        {/* Review mode banner */}
        {reviewMode && suggestedAssignment && (
          <div className={`px-4 py-2 flex items-center justify-between animate-slide-down ${
            suggestedAssignment.confidence > 0.8 ? 'bg-green-100' :
            suggestedAssignment.confidence > 0.5 ? 'bg-yellow-100' :
            'bg-red-100'
          }`}>
            <div className="flex items-center gap-4">
              <span className="font-medium">Auto-detected:</span>
              <span className="font-mono font-bold text-lg">
                {suggestedAssignment.type}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      suggestedAssignment.confidence > 0.8 ? 'bg-green-500' :
                      suggestedAssignment.confidence > 0.5 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${suggestedAssignment.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm">
                  {Math.round(suggestedAssignment.confidence * 100)}% confidence
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  updatePage(currentPage, suggestedAssignment.type);
                  if (currentPage < TOTAL_PAGES) {
                    setCurrentPage(currentPage + 1);
                  }
                }}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                ✓ Accept
              </button>
              <button
                onClick={() => {
                  if (currentPage < TOTAL_PAGES) {
                    setCurrentPage(currentPage + 1);
                  }
                }}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                ✗ Skip
              </button>
            </div>
          </div>
        )}
        
        {/* Navigation bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b">
          <button 
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium">Page</span>
            <input 
              type="number" 
              min="1" 
              max={TOTAL_PAGES} 
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= TOTAL_PAGES) navigateToPage(page);
              }}
              className="w-20 px-3 py-2 text-center border rounded-lg text-lg font-mono"
              suppressHydrationWarning={true}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
            />
            <span className="text-lg">of {TOTAL_PAGES}</span>
          </div>
          
          <button 
            onClick={() => navigateToPage(currentPage + 1)}
            disabled={currentPage === TOTAL_PAGES}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 border-b">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition"
            title="Zoom Out (Ctrl+-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="px-3 py-1 bg-white rounded-lg shadow min-w-[80px] text-center font-mono text-sm">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition"
            title="Zoom In (Ctrl+=)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          <button
            onClick={handleFitToScreen}
            className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition"
            title="Fit to Screen (Ctrl+0)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <div className="ml-auto text-sm text-gray-600 flex items-center gap-2">
            <Move className="w-4 h-4" />
            <span>Drag to pan • Scroll to zoom</span>
          </div>
        </div>
        
        {/* Image viewer with pan/zoom */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-gray-200 relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none' // Prevent browser gestures
          }}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.2s',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {imageError ? (
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-lg font-medium">Page {currentPage}</p>
                <p className="text-sm">Floor plan image not available</p>
                <p className="text-xs mt-2 font-mono text-gray-400">{imagePath}</p>
              </div>
            ) : (
              <>
                <img 
                  src={imagePath}
                  alt={`Page ${currentPage}`}
                  onLoad={() => {
                    setImageLoaded(true);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageLoaded(false);
                    setImageError(true);
                  }}
                  className="max-w-none"
                  style={{ 
                    display: imageLoaded ? 'block' : 'none',
                    width: '100%',
                    height: 'auto',
                    pointerEvents: 'none', // Prevent image from interfering with pan
                    userSelect: 'none'
                  }}
                  draggable={false}
                />
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-500">
                      <div className="animate-pulse text-center">
                        <div className="text-4xl mb-2">⏳</div>
                        <p>Loading page {currentPage}...</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Quick assignment bar */}
        <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-t">
          <span className="font-medium">Assign Page {currentPage}:</span>
          <select 
            value={selectedType || pageAssignments[currentPage] || ''}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 border rounded-lg"
            suppressHydrationWarning={true}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
          >
            <option value="">Not assigned</option>
            {signTypes.map(type => (
              <option key={type.sign_type_code} value={type.sign_type_code}>
                {type.sign_type_code} - {type.description}
              </option>
            ))}
          </select>
          <button 
            onClick={applyAssignment}
            disabled={!selectedType}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            Apply
          </button>
          
          {/* Current assignment status */}
          <div className="flex items-center gap-2 ml-auto">
            {pageAssignments[currentPage] ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-green-600 font-medium">Assigned: {pageAssignments[currentPage]}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-600">Not assigned</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Assignment Table Component (Bottom Section)
  function AssignmentTable() {
    return (
      <div className="flex-1 flex flex-col bg-white border-t" style={{ height: 'calc(45vh - 80px)' }}>
        {/* Table header */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">All Page Assignments</h3>
          <div className="text-sm text-gray-600">
            {assignedCount} of {TOTAL_PAGES} pages assigned
          </div>
        </div>
        
        {/* Scrollable table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-20">Page</th>
                <th className="px-4 py-3 text-left w-32">Type</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-center w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map(page => {
                const isAssigned = !!pageAssignments[page];
                const isCurrent = page === currentPage;
                
                return (
                  <tr 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`
                      cursor-pointer border-b hover:bg-blue-50 transition
                      ${isCurrent ? 'bg-blue-100' : ''}
                      ${!isAssigned && !isCurrent ? 'bg-yellow-50' : ''}
                    `}
                  >
                    <td className="px-4 py-3 font-mono font-medium">{page}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">
                        {pageAssignments[page] || '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getDescription(pageAssignments[page])}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAssigned ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Action bar */}
        <div className="px-6 py-3 bg-gray-50 border-t flex items-center gap-3">
          <button 
            onClick={saveAssignments}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save to Database'}
          </button>
          <button 
            onClick={exportCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {reviewMode ? (
                <span>Review Mode: <kbd>Enter</kbd> Accept, <kbd>N</kbd> Skip, <kbd>ESC</kbd> Exit</span>
              ) : (
                <span>Keyboard: ← → ↑ ↓ navigate, Ctrl+S save</span>
              )}
            </div>
            {lastSaved && (
              <div className="text-sm text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading {SITE_ID} data from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Development Mode Banner */}
      {!isSupabaseConfigured() && process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm">
          <span className="font-medium text-yellow-800">Development Mode:</span>
          <span className="text-yellow-700 ml-2">
            Using demo data. Run 
            <code className="mx-1 px-2 py-0.5 bg-yellow-200 rounded font-mono text-xs">vercel env pull .env.local</code>
            to connect to database
          </span>
        </div>
      )}
      
      {/* Pages Not Initialized Warning */}
      {isSupabaseConfigured() && !pagesExist && !loading && (
        <div className="bg-orange-100 border-b border-orange-400 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-orange-800">Setup Required: </span>
              <span className="text-orange-700">
                No pages found for {SITE_ID}. Initialize the database to start assigning sign types.
              </span>
            </div>
            <button
              onClick={initializePages}
              disabled={isInitializing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 transition font-medium"
            >
              {isInitializing ? `Initializing... ${Math.round((Object.keys(pageIdMap).length / TOTAL_PAGES) * 100)}%` : `Initialize ${TOTAL_PAGES} Pages`}
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Page-to-Sign-Type Manager</h1>
              <p className="text-sm text-gray-600">{SITE_ID} Release PDF</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Progress:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{assignedCount}/{TOTAL_PAGES}</span>
                <span className="text-sm text-gray-600">pages</span>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <button
              onClick={autoDetectSignTypes}
              disabled={isAutoDetecting}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              {isAutoDetecting ? `Detecting... ${autoDetectProgress}%` : 'Auto-Detect'}
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Quick Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content area with conditional layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content - adjusts width when review panel is open */}
        <div className={`flex flex-col transition-all duration-300 ${
          showReviewPanel ? 'flex-1' : 'w-full'
        }`}>
          {/* Top: Page viewer */}
          <PageViewer />
          
          {/* Bottom: Assignment table */}
          <AssignmentTable />
        </div>
        
        {/* Review Panel - Slides in from right */}
        {showReviewPanel && (
          <AutoDetectReviewPanel
            suggestions={detectedAssignments}
            currentPage={currentPage}
            onPageSelect={setCurrentPage}
            onApply={applyDetectedAssignments}
            onClose={() => {
              setShowReviewPanel(false);
              setReviewMode(false);
            }}
            signTypes={signTypes}
          />
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Upload New PDF</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <PDFUpload 
                siteName={SITE_ID}
                onUploadComplete={(pageCount) => {
                  console.log(`Uploaded ${pageCount} pages`);
                  setShowUploadModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}