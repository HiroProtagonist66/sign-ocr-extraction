'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PanZoomViewer from '@/components/PanZoomViewer';
import { Download, Save, Undo, Redo, Filter, Search, Check, X, AlertCircle, Info, Keyboard, Grid, Eye, EyeOff, ChevronDown, ChevronUp, Plus, Minus, Copy, Trash2, ArrowLeft } from 'lucide-react';

interface SignHotspot {
  sign_number: string;
  sign_type?: string;
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
  confidence: string;
  status?: 'verified' | 'pending' | 'error';
  notes?: string;
  revision?: string;
  field_locate?: boolean;
  floor?: string;
  area?: string;
}

interface ValidationData {
  pdf_id: string;
  pdf_name: string;
  extraction_method: string;
  total_signs_detected: number;
  pages: Array<{
    page: number;
    page_number?: number;
    image_path?: string;
    signs_detected: number;
    signs: SignHotspot[];
  }>;
}

interface ValidationSession {
  sessionId: string;
  startTime: Date;
  lastSave: Date;
  signsReviewed: number;
  signsModified: number;
  history: any[];
}

const SIGN_TYPES = [
  'BC-1.0', 'BC-1.1', 'BC-2.0', 'BC-2.1',
  'PAC-1.0', 'PAC-1.1', 'PAC-2.0', 'PAC-2.1',
  'BID-1.0', 'BID-1.1', 'BID-2.0',
  'COLO-1.0', 'COLO-2.0', 'COLO-3.0'
];

const FLOORS = ['Level 1', 'Level 2', 'Mezzanine', 'Roof'];
const AREAS = ['Admin', 'IT', 'Electrical', 'Mechanical', 'Security'];

export default function ValidationPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [selectedSigns, setSelectedSigns] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending' | 'error'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHotspots, setShowHotspots] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedPdf, setSelectedPdf] = useState('pdf13');
  const [selectedAtl06Page, setSelectedAtl06Page] = useState(1);
  
  // Map PDF IDs to their corresponding full image paths with all text visible
  const pdfImagePaths: Record<string, string> = {
    'pdf13': '/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1_full.png',
    'pdf14': '/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14_page_1_full.png',
    'atl06': `/plans/ATL06/page_${String(selectedAtl06Page).padStart(2, '0')}_full.png`
  };
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const viewerRef = useRef<HTMLDivElement>(null);

  // Load PDF data
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    loadPdfData(selectedPdf).finally(() => {
      setIsLoading(false);
    });
    initializeSession();
  }, [selectedPdf]);

  // Auto-save timer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    
    const timer = setInterval(() => {
      saveToLocalStorage();
    }, 30000); // Auto-save every 30 seconds
    
    setAutoSaveTimer(timer);
    
    return () => {
      if (autoSaveTimer) clearInterval(autoSaveTimer);
    };
  }, [validationData]);

  // Keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveToLocalStorage();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'e':
            e.preventDefault();
            exportData();
            break;
        }
      } else {
        switch(e.key.toLowerCase()) {
          case ' ':
            e.preventDefault();
            toggleVerified();
            break;
          case 'g':
            setShowGrid(prev => !prev);
            break;
          case 'h':
            setShowHotspots(prev => !prev);
            break;
          case 'delete':
            deleteSelectedSigns();
            break;
          case 'arrowleft':
          case 'arrowright':
          case 'arrowup':
          case 'arrowdown':
            e.preventDefault();
            nudgeSelectedSigns(e.key, e.shiftKey);
            break;
          case '+':
          case '=':
            e.preventDefault();
            scaleSelectedSigns(1.1);
            break;
          case '-':
            e.preventDefault();
            scaleSelectedSigns(0.9);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedSigns, validationData]);

  const loadPdfData = async (pdfId: string) => {
    try {
      let url = '';
      if (pdfId === 'atl06') {
        url = '/extraction/ATL06/extraction_results.json';
      } else {
        url = `/extraction/${pdfId}_extraction_results.json`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load PDF data: ${response.status}`);
      }
      const data = await response.json();
      
      // Initialize status for all signs and add image paths
      let pdfName = data.pdf_name;
      if (!pdfName) {
        if (pdfId === 'pdf13') pdfName = 'COLO 2 - Admin Level 1';
        else if (pdfId === 'pdf14') pdfName = 'BC East Level 1';
        else if (pdfId === 'atl06') pdfName = 'ATL06 - Complete Site';
      }
      
      const initializedData = {
        ...data,
        pdf_id: pdfId,
        pdf_name: pdfName,
        pages: data.pages.map((page: any, index: number) => ({
          ...page,
          image_path: pdfId === 'atl06' 
            ? `/plans/ATL06/page_${String(page.page_number || index + 1).padStart(2, '0')}_full.png`
            : pdfImagePaths[pdfId],
          signs: page.signs.map((sign: SignHotspot) => ({
            ...sign,
            status: sign.status || 'pending',
            sign_type: sign.sign_type || detectSignType(sign.sign_number),
            floor: sign.floor || 'Level 1',
            area: sign.area || 'Admin'
          }))
        }))
      };
      
      console.log('Loaded validation data:', initializedData);
      console.log('Image path for current page:', initializedData.pages[0]?.image_path);
      console.log('Number of signs on first page:', initializedData.pages[0]?.signs?.length);
      
      setValidationData(initializedData);
      addToHistory(initializedData);
    } catch (error) {
      console.error('Failed to load PDF data:', error);
      // Set empty data to prevent errors
      setValidationData({
        pdf_id: pdfId,
        pdf_name: pdfId === 'pdf13' ? 'COLO 2 - Admin Level 1' : 'BC East Level 1',
        extraction_method: 'embedded_text',
        total_signs_detected: 0,
        pages: []
      });
    }
  };

  const initializeSession = () => {
    const sessionId = `session_${Date.now()}`;
    const newSession: ValidationSession = {
      sessionId,
      startTime: new Date(),
      lastSave: new Date(),
      signsReviewed: 0,
      signsModified: 0,
      history: []
    };
    setSession(newSession);
  };

  const detectSignType = (signNumber: string): string => {
    const prefix = signNumber.split('-')[0];
    if (prefix === 'BC') return 'BC-1.0';
    if (prefix === 'PAC') return 'PAC-1.0';
    if (prefix === 'BID') return 'BID-1.0';
    if (prefix === 'COLO') return 'COLO-1.0';
    return 'BC-1.0';
  };

  const addToHistory = (data: any) => {
    const newHistory = [...history.slice(0, historyIndex + 1), data];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setValidationData(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setValidationData(history[historyIndex + 1]);
    }
  };

  const saveToLocalStorage = () => {
    if (typeof window === 'undefined' || !validationData || !session) return;
    
    const saveData = {
      validationData,
      session: {
        ...session,
        lastSave: new Date()
      }
    };
    
    localStorage.setItem(`validation_${selectedPdf}`, JSON.stringify(saveData));
    
    // Update session
    setSession(prev => prev ? { ...prev, lastSave: new Date() } : null);
  };

  const exportData = () => {
    if (!validationData) return;
    
    const dataStr = JSON.stringify(validationData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${validationData.pdf_name}_validated.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const exportSQL = () => {
    if (!validationData) return;
    
    let sql = '-- Validated Sign Data SQL Inserts\\n';
    sql += `-- Generated: ${new Date().toISOString()}\\n`;
    sql += `-- PDF: ${validationData.pdf_name}\\n\\n`;
    
    validationData.pages.forEach(page => {
      page.signs.forEach(sign => {
        sql += `INSERT INTO signs (sign_number, sign_type, x_percentage, y_percentage, width_percentage, height_percentage, floor, area, confidence, status, notes)\\n`;
        sql += `VALUES ('${sign.sign_number}', '${sign.sign_type || ''}', ${sign.hotspot_bbox.x_percentage}, ${sign.hotspot_bbox.y_percentage}, ${sign.hotspot_bbox.width_percentage}, ${sign.hotspot_bbox.height_percentage}, '${sign.floor || 'Level 1'}', '${sign.area || 'Admin'}', '${sign.confidence}', '${sign.status}', '${sign.notes || ''}');\\n\\n`;
      });
    });
    
    const dataUri = 'data:text/sql;charset=utf-8,'+ encodeURIComponent(sql);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${validationData.pdf_name}_inserts.sql`);
    linkElement.click();
  };

  const exportCSV = () => {
    if (!validationData) return;
    
    let csv = 'Sign Number,Sign Type,X%,Y%,Width%,Height%,Floor,Area,Confidence,Status,Notes\\n';
    
    validationData.pages.forEach(page => {
      page.signs.forEach(sign => {
        csv += `"${sign.sign_number}","${sign.sign_type || ''}",${sign.hotspot_bbox.x_percentage},${sign.hotspot_bbox.y_percentage},${sign.hotspot_bbox.width_percentage},${sign.hotspot_bbox.height_percentage},"${sign.floor || 'Level 1'}","${sign.area || 'Admin'}","${sign.confidence}","${sign.status}","${sign.notes || ''}"\\n`;
      });
    });
    
    const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csv);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${validationData.pdf_name}_validated.csv`);
    linkElement.click();
  };

  const toggleVerified = () => {
    if (!validationData || selectedSigns.size === 0) return;
    
    const updatedData = { ...validationData };
    updatedData.pages = updatedData.pages.map(page => ({
      ...page,
      signs: page.signs.map(sign => {
        if (selectedSigns.has(sign.sign_number)) {
          return {
            ...sign,
            status: sign.status === 'verified' ? 'pending' : 'verified'
          };
        }
        return sign;
      })
    }));
    
    setValidationData(updatedData);
    addToHistory(updatedData);
    
    if (session) {
      setSession({
        ...session,
        signsReviewed: session.signsReviewed + selectedSigns.size
      });
    }
  };

  const updateSignField = (signNumber: string, field: string, value: any) => {
    if (!validationData) return;
    
    const updatedData = { ...validationData };
    updatedData.pages = updatedData.pages.map(page => ({
      ...page,
      signs: page.signs.map(sign => {
        if (sign.sign_number === signNumber) {
          return { ...sign, [field]: value };
        }
        return sign;
      })
    }));
    
    setValidationData(updatedData);
    addToHistory(updatedData);
    
    if (session) {
      setSession({
        ...session,
        signsModified: session.signsModified + 1
      });
    }
  };

  const updateSelectedSigns = (updates: Partial<SignHotspot>) => {
    if (!validationData || selectedSigns.size === 0) return;
    
    const updatedData = { ...validationData };
    updatedData.pages = updatedData.pages.map(page => ({
      ...page,
      signs: page.signs.map(sign => {
        if (selectedSigns.has(sign.sign_number)) {
          return { ...sign, ...updates };
        }
        return sign;
      })
    }));
    
    setValidationData(updatedData);
    addToHistory(updatedData);
    
    if (session) {
      setSession({
        ...session,
        signsModified: session.signsModified + selectedSigns.size
      });
    }
  };

  const deleteSelectedSigns = () => {
    if (!validationData || selectedSigns.size === 0) return;
    
    const updatedData = { ...validationData };
    updatedData.pages = updatedData.pages.map(page => ({
      ...page,
      signs: page.signs.filter(sign => !selectedSigns.has(sign.sign_number)),
      signs_detected: page.signs.filter(sign => !selectedSigns.has(sign.sign_number)).length
    }));
    
    updatedData.total_signs_detected = updatedData.pages.reduce((sum, page) => sum + page.signs_detected, 0);
    
    setValidationData(updatedData);
    addToHistory(updatedData);
    setSelectedSigns(new Set());
  };

  const nudgeSelectedSigns = (direction: string, large: boolean) => {
    if (!validationData || selectedSigns.size === 0) return;
    
    const delta = large ? 1 : 0.1; // 1% or 0.1% movement
    
    const updatedData = { ...validationData };
    updatedData.pages = updatedData.pages.map(page => ({
      ...page,
      signs: page.signs.map(sign => {
        if (selectedSigns.has(sign.sign_number)) {
          const updated = { ...sign };
          switch(direction.toLowerCase()) {
            case 'arrowleft':
              updated.hotspot_bbox.x_percentage -= delta;
              break;
            case 'arrowright':
              updated.hotspot_bbox.x_percentage += delta;
              break;
            case 'arrowup':
              updated.hotspot_bbox.y_percentage -= delta;
              break;
            case 'arrowdown':
              updated.hotspot_bbox.y_percentage += delta;
              break;
          }
          return updated;
        }
        return sign;
      })
    }));
    
    setValidationData(updatedData);
    addToHistory(updatedData);
  };

  const scaleSelectedSigns = (factor: number) => {
    if (!validationData || selectedSigns.size === 0) return;
    
    const updatedData = { ...validationData };
    updatedData.pages = updatedData.pages.map(page => ({
      ...page,
      signs: page.signs.map(sign => {
        if (selectedSigns.has(sign.sign_number)) {
          return {
            ...sign,
            hotspot_bbox: {
              ...sign.hotspot_bbox,
              width_percentage: sign.hotspot_bbox.width_percentage * factor,
              height_percentage: sign.hotspot_bbox.height_percentage * factor
            }
          };
        }
        return sign;
      })
    }));
    
    setValidationData(updatedData);
    addToHistory(updatedData);
  };

  const getFilteredSigns = () => {
    if (!validationData) return [];
    
    const currentPageData = validationData.pages[currentPage];
    if (!currentPageData) return [];
    
    let signs = [...currentPageData.signs];
    
    // Filter by status
    if (filterStatus !== 'all') {
      signs = signs.filter(sign => sign.status === filterStatus);
    }
    
    // Filter by type
    if (filterType !== 'all') {
      signs = signs.filter(sign => sign.sign_type === filterType);
    }
    
    // Filter by search query
    if (searchQuery) {
      signs = signs.filter(sign => 
        sign.sign_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sign.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return signs;
  };

  const getSelectedSignDetails = () => {
    if (!validationData || selectedSigns.size === 0) return null;
    
    const signs: SignHotspot[] = [];
    validationData.pages.forEach(page => {
      page.signs.forEach(sign => {
        if (selectedSigns.has(sign.sign_number)) {
          signs.push(sign);
        }
      });
    });
    
    return signs;
  };

  const getStatistics = () => {
    if (!validationData) return null;
    
    let total = 0;
    let verified = 0;
    let pending = 0;
    let errors = 0;
    const typeCount: Record<string, number> = {};
    const confidenceCount: Record<string, number> = {};
    
    validationData.pages.forEach(page => {
      page.signs.forEach(sign => {
        total++;
        
        if (sign.status === 'verified') verified++;
        else if (sign.status === 'pending') pending++;
        else if (sign.status === 'error') errors++;
        
        const type = sign.sign_type || 'Unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
        
        confidenceCount[sign.confidence] = (confidenceCount[sign.confidence] || 0) + 1;
      });
    });
    
    return {
      total,
      verified,
      pending,
      errors,
      typeCount,
      confidenceCount,
      percentComplete: total > 0 ? Math.round((verified / total) * 100) : 0
    };
  };

  const stats = getStatistics();
  const filteredSigns = getFilteredSigns();
  const selectedSignDetails = getSelectedSignDetails();

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading validation interface...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-100">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
            <h1 className="text-xl font-bold">Sign Validation Interface</h1>
            <select
              value={selectedPdf}
              onChange={(e) => {
                setSelectedPdf(e.target.value);
                if (e.target.value === 'atl06') {
                  setCurrentPage(0);
                  setSelectedAtl06Page(1);
                }
              }}
              className="bg-gray-700 text-white px-3 py-1 rounded"
            >
              <option value="pdf13">FTY02 - COLO 2 Admin Level 1</option>
              <option value="pdf14">FTY02 - BC East Level 1</option>
              <option value="atl06">ATL06 - Complete Site (57 pages)</option>
            </select>
          </div>
          
          {/* Progress Bar */}
          {stats && (
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                {stats.verified} of {stats.total} verified ({stats.percentComplete}%)
              </div>
              <div className="w-48 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.percentComplete}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={saveToLocalStorage}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded flex items-center space-x-1"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            
            <div className="relative group">
              <button className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded flex items-center space-x-1">
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg hidden group-hover:block z-10">
                <button
                  onClick={exportData}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={exportSQL}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export SQL</span>
                </button>
                <button
                  onClick={exportCSV}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
            
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            >
              <Undo className="w-4 h-4" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            >
              <Redo className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - PDF Viewer */}
        <div className="w-2/5 border-r border-gray-700 relative" ref={viewerRef}>
          {validationData && validationData.pages[currentPage] && (
            <div className="relative h-full">
              <PanZoomViewer
                imagePath={validationData.pages[currentPage].image_path || pdfImagePaths[selectedPdf]}
                signs={showHotspots ? validationData.pages[currentPage].signs : []}
                selectedSigns={selectedSigns}
                onSignClick={(signNumber) => {
                  if (selectedSigns.has(signNumber)) {
                    const newSelected = new Set(selectedSigns);
                    newSelected.delete(signNumber);
                    setSelectedSigns(newSelected);
                  } else {
                    setSelectedSigns(new Set([...selectedSigns, signNumber]));
                  }
                }}
                onMultiSelect={(signs) => setSelectedSigns(new Set(signs))}
                showGrid={showGrid}
              />
              
              {/* Page Navigation */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg px-3 py-2 flex items-center space-x-2">
                {selectedPdf === 'atl06' ? (
                  <>
                    <button
                      onClick={() => {
                        const newPage = Math.max(0, currentPage - 1);
                        setCurrentPage(newPage);
                        setSelectedAtl06Page(newPage + 1);
                      }}
                      disabled={currentPage === 0}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                      ←
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={validationData.pages.length}
                      value={selectedAtl06Page}
                      onChange={(e) => {
                        const page = Math.max(1, Math.min(validationData.pages.length, Number(e.target.value)));
                        setSelectedAtl06Page(page);
                        setCurrentPage(page - 1);
                      }}
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-center"
                    />
                    <span className="text-sm">
                      of {validationData.pages.length}
                    </span>
                    <button
                      onClick={() => {
                        const newPage = Math.min(validationData.pages.length - 1, currentPage + 1);
                        setCurrentPage(newPage);
                        setSelectedAtl06Page(newPage + 1);
                      }}
                      disabled={currentPage === validationData.pages.length - 1}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                      →
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                      ←
                    </button>
                    <span className="text-sm">
                      Page {currentPage + 1} of {validationData.pages.length}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(validationData.pages.length - 1, currentPage + 1))}
                      disabled={currentPage === validationData.pages.length - 1}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                      →
                    </button>
                  </>
                )}
              </div>
              
              {/* View Controls */}
              <div className="absolute top-4 right-4 bg-gray-800 rounded-lg px-3 py-2 flex flex-col space-y-2">
                <button
                  onClick={() => setShowHotspots(!showHotspots)}
                  className="flex items-center space-x-2 text-sm hover:text-blue-400"
                >
                  {showHotspots ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>Hotspots</span>
                </button>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className="flex items-center space-x-2 text-sm hover:text-blue-400"
                >
                  <Grid className="w-4 h-4" />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center Panel - Sign List */}
        <div className="w-1/4 border-r border-gray-700 flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-gray-700 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search signs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="error">Errors</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700"
              >
                <option value="all">All Types</option>
                {SIGN_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Bulk Operations */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const allSignNumbers = filteredSigns.map(s => s.sign_number);
                  setSelectedSigns(new Set(allSignNumbers));
                }}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Select All
              </button>
              <button
                onClick={toggleVerified}
                disabled={selectedSigns.size === 0}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
              >
                Mark Verified
              </button>
              <button
                onClick={deleteSelectedSigns}
                disabled={selectedSigns.size === 0}
                className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 rounded disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
          
          {/* Sign List */}
          <div className="flex-1 overflow-y-auto">
            {filteredSigns.map((sign) => (
              <div
                key={sign.sign_number}
                onClick={() => {
                  if (selectedSigns.has(sign.sign_number)) {
                    const newSelected = new Set(selectedSigns);
                    newSelected.delete(sign.sign_number);
                    setSelectedSigns(newSelected);
                  } else {
                    setSelectedSigns(new Set([sign.sign_number]));
                  }
                }}
                className={`px-4 py-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 ${
                  selectedSigns.has(sign.sign_number) ? 'bg-blue-900 bg-opacity-30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{sign.sign_number}</div>
                    <div className="text-xs text-gray-400">{sign.sign_type || 'Unknown'}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {sign.status === 'verified' && <Check className="w-4 h-4 text-green-500" />}
                    {sign.status === 'pending' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    {sign.status === 'error' && <X className="w-4 h-4 text-red-500" />}
                    <span className={`text-xs px-2 py-1 rounded ${
                      sign.confidence === 'embedded' ? 'bg-green-700' :
                      sign.confidence === 'high' ? 'bg-blue-700' :
                      sign.confidence === 'medium' ? 'bg-yellow-700' :
                      'bg-red-700'
                    }`}>
                      {sign.confidence}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Statistics */}
          {stats && (
            <div className="p-4 border-t border-gray-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Total Signs:</span>
                <span>{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Verified:</span>
                <span className="text-green-400">{stats.verified}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="text-yellow-400">{stats.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Errors:</span>
                <span className="text-red-400">{stats.errors}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Sign Editor */}
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedSignDetails && selectedSignDetails.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {selectedSignDetails.length === 1 ? 'Sign Details' : `${selectedSignDetails.length} Signs Selected`}
              </h2>
              
              {selectedSignDetails.length === 1 ? (
                // Single sign editor
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sign Number</label>
                    <input
                      type="text"
                      value={selectedSignDetails[0].sign_number}
                      onChange={(e) => updateSignField(selectedSignDetails[0].sign_number, 'sign_number', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Sign Type</label>
                    <select
                      value={selectedSignDetails[0].sign_type || ''}
                      onChange={(e) => updateSignField(selectedSignDetails[0].sign_number, 'sign_type', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Type...</option>
                      {SIGN_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">X Position</label>
                      <input
                        type="number"
                        value={selectedSignDetails[0].hotspot_bbox.x_percentage.toFixed(2)}
                        onChange={(e) => {
                          const updated = { ...selectedSignDetails[0] };
                          updated.hotspot_bbox.x_percentage = parseFloat(e.target.value);
                          updateSignField(selectedSignDetails[0].sign_number, 'hotspot_bbox', updated.hotspot_bbox);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Y Position</label>
                      <input
                        type="number"
                        value={selectedSignDetails[0].hotspot_bbox.y_percentage.toFixed(2)}
                        onChange={(e) => {
                          const updated = { ...selectedSignDetails[0] };
                          updated.hotspot_bbox.y_percentage = parseFloat(e.target.value);
                          updateSignField(selectedSignDetails[0].sign_number, 'hotspot_bbox', updated.hotspot_bbox);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Width %</label>
                      <input
                        type="number"
                        value={selectedSignDetails[0].hotspot_bbox.width_percentage.toFixed(2)}
                        onChange={(e) => {
                          const updated = { ...selectedSignDetails[0] };
                          updated.hotspot_bbox.width_percentage = parseFloat(e.target.value);
                          updateSignField(selectedSignDetails[0].sign_number, 'hotspot_bbox', updated.hotspot_bbox);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Height %</label>
                      <input
                        type="number"
                        value={selectedSignDetails[0].hotspot_bbox.height_percentage.toFixed(2)}
                        onChange={(e) => {
                          const updated = { ...selectedSignDetails[0] };
                          updated.hotspot_bbox.height_percentage = parseFloat(e.target.value);
                          updateSignField(selectedSignDetails[0].sign_number, 'hotspot_bbox', updated.hotspot_bbox);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Floor</label>
                    <select
                      value={selectedSignDetails[0].floor || 'Level 1'}
                      onChange={(e) => updateSignField(selectedSignDetails[0].sign_number, 'floor', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      {FLOORS.map(floor => (
                        <option key={floor} value={floor}>{floor}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Area</label>
                    <select
                      value={selectedSignDetails[0].area || 'Admin'}
                      onChange={(e) => updateSignField(selectedSignDetails[0].sign_number, 'area', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      {AREAS.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      value={selectedSignDetails[0].notes || ''}
                      onChange={(e) => updateSignField(selectedSignDetails[0].sign_number, 'notes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      placeholder="Add notes or special instructions..."
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedSignDetails[0].field_locate || false}
                        onChange={(e) => updateSignField(selectedSignDetails[0].sign_number, 'field_locate', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Field Locate Required</span>
                    </label>
                  </div>
                  
                  {selectedSignDetails[0].revision && (
                    <div className="p-3 bg-yellow-900 bg-opacity-30 rounded">
                      <div className="text-sm font-medium text-yellow-400">Revision Note</div>
                      <div className="text-sm">{selectedSignDetails[0].revision}</div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-800 rounded">
                    <div className="text-sm font-medium mb-2">Metadata</div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span>{selectedSignDetails[0].confidence}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pixel X:</span>
                        <span>{selectedSignDetails[0].text_bbox.x}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pixel Y:</span>
                        <span>{selectedSignDetails[0].text_bbox.y}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Multiple signs batch editor
                <div className="space-y-4">
                  <div className="p-3 bg-blue-900 bg-opacity-30 rounded">
                    <Info className="w-4 h-4 inline mr-2" />
                    <span className="text-sm">Editing {selectedSignDetails.length} signs. Changes will apply to all selected signs.</span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Sign Type (Apply to All)</label>
                    <select
                      onChange={(e) => updateSelectedSigns({ sign_type: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Type...</option>
                      {SIGN_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Floor (Apply to All)</label>
                    <select
                      onChange={(e) => updateSelectedSigns({ floor: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Floor...</option>
                      {FLOORS.map(floor => (
                        <option key={floor} value={floor}>{floor}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Area (Apply to All)</label>
                    <select
                      onChange={(e) => updateSelectedSigns({ area: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Area...</option>
                      {AREAS.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Status (Apply to All)</label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateSelectedSigns({ status: 'verified' })}
                        className="flex-1 px-3 py-2 bg-green-700 hover:bg-green-600 rounded"
                      >
                        Mark Verified
                      </button>
                      <button
                        onClick={() => updateSelectedSigns({ status: 'pending' })}
                        className="flex-1 px-3 py-2 bg-yellow-700 hover:bg-yellow-600 rounded"
                      >
                        Mark Pending
                      </button>
                      <button
                        onClick={() => updateSelectedSigns({ status: 'error' })}
                        className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-600 rounded"
                      >
                        Mark Error
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium mb-2">Selected Signs:</h3>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {selectedSignDetails.map(sign => (
                        <div key={sign.sign_number} className="flex items-center justify-between text-sm p-2 bg-gray-800 rounded">
                          <span>{sign.sign_number}</span>
                          <span className="text-xs text-gray-400">{sign.sign_type || 'Unknown'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Info className="w-12 h-12 mb-4" />
              <p>Select a sign to edit its details</p>
              <p className="text-sm mt-2">Click on a sign in the viewer or list</p>
            </div>
          )}
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="absolute bottom-4 right-4 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Toggle Verified</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">Space</kbd>
            </div>
            <div className="flex justify-between">
              <span>Navigate Signs</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">Tab</kbd>
            </div>
            <div className="flex justify-between">
              <span>Delete Selected</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">Delete</kbd>
            </div>
            <div className="flex justify-between">
              <span>Save</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+S</kbd>
            </div>
            <div className="flex justify-between">
              <span>Export</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+E</kbd>
            </div>
            <div className="flex justify-between">
              <span>Undo/Redo</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+Z/Y</kbd>
            </div>
            <div className="flex justify-between">
              <span>Toggle Grid</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">G</kbd>
            </div>
            <div className="flex justify-between">
              <span>Toggle Hotspots</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">H</kbd>
            </div>
            <div className="flex justify-between">
              <span>Nudge Position</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">Arrow Keys</kbd>
            </div>
            <div className="flex justify-between">
              <span>Scale Size</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">+/-</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}