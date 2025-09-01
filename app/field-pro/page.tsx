'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Wifi, WifiOff, Check, X, AlertTriangle, Maximize2, RotateCw, Info, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

// Dynamic import PanZoomViewer to avoid SSR issues
const PanZoomViewer = dynamic(
  () => import('@/components/PanZoomViewer'),
  { ssr: false }
);

interface SignStatus {
  status: 'installed' | 'missing' | 'damaged';
  timestamp: string;
  installer?: string;
}

interface SignData {
  sign_number: string;
  hotspot_bbox: {
    x_percentage: number;
    y_percentage: number;
    width_percentage: number;
    height_percentage: number;
  };
  text_bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: string;
  status?: 'verified' | 'pending' | 'error';
  notes?: string;
}

interface StatusChange {
  sign: string;
  previousStatus?: SignStatus;
  newStatus?: SignStatus;
  timestamp: string;
}

export default function FieldProInterface() {
  const [selectedSite, setSelectedSite] = useState('atl06');
  const [selectedPage, setSelectedPage] = useState(1);
  const [signs, setSigns] = useState<SignData[]>([]);
  const [signStatuses, setSignStatuses] = useState<Record<string, SignStatus>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'installed' | 'missing' | 'damaged'>('all');
  const [isOnline, setIsOnline] = useState(true);
  const [selectedSign, setSelectedSign] = useState<SignData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(57);
  
  // Procreate-inspired features
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [showPagePreview, setShowPagePreview] = useState<'previous' | 'next' | null>(null);
  const [showPageScrubber, setShowPageScrubber] = useState(false);
  const [showGestureHints, setShowGestureHints] = useState(true);
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageRotation, setImageRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomVelocity, setZoomVelocity] = useState(0);
  
  // Touch tracking refs
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef(0);
  const twoFingerTapTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);
    
    // Hide gesture hints after 5 seconds
    const timer = setTimeout(() => setShowGestureHints(false), 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timer);
    };
  }, []);

  // Load extraction data for current site and page
  useEffect(() => {
    setIsLoading(true);
    fetch(`/extraction/ATL06/extraction_results.json`)
      .then(res => res.json())
      .then(data => {
        const pageData = data.pages.find((p: any) => p.page === selectedPage || p.page_number === selectedPage);
        if (pageData) {
          setSigns(pageData.signs || []);
        }
        setTotalPages(data.pages.length);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load signs:', err);
        setIsLoading(false);
      });
  }, [selectedSite, selectedPage]);

  // Load saved statuses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`field_status_${selectedSite}_page${selectedPage}`);
    if (saved) {
      setSignStatuses(JSON.parse(saved));
    } else {
      setSignStatuses({});
    }
    
    // Load history
    const savedHistory = localStorage.getItem(`field_history_${selectedSite}`);
    if (savedHistory) {
      setStatusHistory(JSON.parse(savedHistory));
    }
  }, [selectedSite, selectedPage]);

  // Auto-save to localStorage
  useEffect(() => {
    if (Object.keys(signStatuses).length > 0) {
      localStorage.setItem(
        `field_status_${selectedSite}_page${selectedPage}`,
        JSON.stringify(signStatuses)
      );
    }
  }, [signStatuses, selectedSite, selectedPage]);

  // Save history
  useEffect(() => {
    if (statusHistory.length > 0) {
      localStorage.setItem(
        `field_history_${selectedSite}`,
        JSON.stringify(statusHistory.slice(-100)) // Keep last 100 changes
      );
    }
  }, [statusHistory, selectedSite]);

  const getFilteredSigns = () => {
    if (filterStatus === 'all') return signs;
    
    return signs.filter(sign => {
      const status = signStatuses[sign.sign_number];
      if (filterStatus === 'pending') return !status;
      return status?.status === filterStatus;
    });
  };

  const handleSignClick = (sign: SignData) => {
    setSelectedSign(sign);
    setToolMenuOpen(true);
  };

  const markSignStatus = (signNumber: string, status: 'installed' | 'missing' | 'damaged') => {
    const previousStatus = signStatuses[signNumber];
    
    // Add to history for undo
    const change: StatusChange = {
      sign: signNumber,
      previousStatus,
      newStatus: {
        status,
        timestamp: new Date().toISOString(),
        installer: localStorage.getItem('installer_name') || 'Field User'
      },
      timestamp: new Date().toISOString()
    };
    
    setStatusHistory(prev => [...prev, change]);
    setHistoryIndex(statusHistory.length);
    
    setSignStatuses(prev => ({
      ...prev,
      [signNumber]: change.newStatus!
    }));
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setSelectedSign(null);
    setToolMenuOpen(false);
  };

  // Undo/Redo functionality
  const undo = () => {
    if (historyIndex >= 0 && statusHistory[historyIndex]) {
      const change = statusHistory[historyIndex];
      setSignStatuses(prev => {
        const newStatuses = { ...prev };
        if (change.previousStatus) {
          newStatuses[change.sign] = change.previousStatus;
        } else {
          delete newStatuses[change.sign];
        }
        return newStatuses;
      });
      setHistoryIndex(historyIndex - 1);
      
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const redo = () => {
    if (historyIndex < statusHistory.length - 1) {
      const change = statusHistory[historyIndex + 1];
      if (change.newStatus) {
        setSignStatuses(prev => ({
          ...prev,
          [change.sign]: change.newStatus!
        }));
      }
      setHistoryIndex(historyIndex + 1);
      
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartTime.current = Date.now();
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };

    // Two-finger tap detection
    if (e.touches.length === 2) {
      if (twoFingerTapTimeout.current) {
        clearTimeout(twoFingerTapTimeout.current);
      }
      
      twoFingerTapTimeout.current = setTimeout(() => {
        // Two-finger tap detected - undo
        undo();
      }, 200);
      
      // Calculate initial distance for pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }

    // Edge swipe detection
    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;
    
    if (touchX < 50) {
      setShowPagePreview('previous');
    } else if (touchX > screenWidth - 50) {
      setShowPagePreview('next');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Clear two-finger tap if fingers move
    if (e.touches.length === 2 && twoFingerTapTimeout.current) {
      const moveDistance = Math.abs(e.touches[0].clientX - touchStartPos.current.x) + 
                          Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (moveDistance > 10) {
        clearTimeout(twoFingerTapTimeout.current);
        
        // Handle pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delta = distance - lastTouchDistance.current;
        
        setZoomVelocity(delta * 0.01);
        setZoomLevel(prev => Math.max(0.5, Math.min(5, prev + delta * 0.01)));
        lastTouchDistance.current = distance;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime.current;
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartPos.current.x;
    
    // Handle edge swipe page navigation
    if (showPagePreview && Math.abs(swipeDistance) > 100) {
      if (showPagePreview === 'previous' && swipeDistance > 0) {
        setSelectedPage(Math.max(1, selectedPage - 1));
      } else if (showPagePreview === 'next' && swipeDistance < 0) {
        setSelectedPage(Math.min(totalPages, selectedPage + 1));
      }
    }
    
    setShowPagePreview(null);
    
    // Apply zoom momentum
    if (Math.abs(zoomVelocity) > 0.001) {
      const momentumInterval = setInterval(() => {
        setZoomVelocity(v => v * 0.92);
        setZoomLevel(z => Math.max(0.5, Math.min(5, z + zoomVelocity)));
        if (Math.abs(zoomVelocity) < 0.001) {
          clearInterval(momentumInterval);
        }
      }, 16);
    }
  };

  // Three-finger tap to show/hide scrubber
  const handleThreeFingerTap = () => {
    setShowPageScrubber(prev => !prev);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const pendingCount = signs.filter(s => !signStatuses[s.sign_number]).length;
  const installedCount = Object.values(signStatuses).filter(s => s.status === 'installed').length;
  const missingCount = Object.values(signStatuses).filter(s => s.status === 'missing').length;
  const damagedCount = Object.values(signStatuses).filter(s => s.status === 'damaged').length;

  return (
    <div 
      className="h-screen flex flex-col bg-gray-900 touch-pan overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      {/* Minimal Header */}
      <header className="bg-black bg-opacity-80 text-white p-2 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium">{selectedSite.toUpperCase()} • Page {selectedPage}/{totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status pills */}
          <div className="flex gap-1 text-xs">
            <span className="px-2 py-1 bg-green-500 bg-opacity-20 rounded-full">✓ {installedCount}</span>
            <span className="px-2 py-1 bg-red-500 bg-opacity-20 rounded-full">✗ {missingCount}</span>
            <span className="px-2 py-1 bg-yellow-500 bg-opacity-20 rounded-full">⚠ {damagedCount}</span>
          </div>
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading floor plan...</p>
            </div>
          </div>
        ) : (
          <div 
            className="w-full h-full smooth-transform"
            style={{
              transform: `scale(${zoomLevel}) rotate(${imageRotation}deg)`,
              transition: 'transform 0.2s ease-out'
            }}
          >
            <PanZoomViewer
              imagePath={`/plans/ATL06/page_${String(selectedPage).padStart(2, '0')}_full.png`}
              imageSrc={`/plans/ATL06/page_${String(selectedPage).padStart(2, '0')}_full.png`}
              imageWidth={3300}
              imageHeight={2550}
              signs={getFilteredSigns()}
              onSignClick={(signOrNumber) => {
                if (typeof signOrNumber === 'string') {
                  const sign = signs.find(s => s.sign_number === signOrNumber);
                  if (sign) handleSignClick(sign);
                } else {
                  handleSignClick(signOrNumber as SignData);
                }
              }}
              selectedSigns={selectedSign ? new Set([selectedSign.sign_number]) : new Set()}
              signStatuses={signStatuses}
              viewMode="field"
            />
          </div>
        )}

        {/* Page Preview Overlays */}
        {showPagePreview === 'previous' && selectedPage > 1 && (
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black to-transparent pointer-events-none">
            <div className="h-full flex items-center justify-center">
              <div className="text-white text-center">
                <ChevronLeft className="w-12 h-12 mx-auto mb-2" />
                <span className="text-xl font-bold">Page {selectedPage - 1}</span>
              </div>
            </div>
          </div>
        )}
        
        {showPagePreview === 'next' && selectedPage < totalPages && (
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black to-transparent pointer-events-none">
            <div className="h-full flex items-center justify-center">
              <div className="text-white text-center">
                <ChevronRight className="w-12 h-12 mx-auto mb-2" />
                <span className="text-xl font-bold">Page {selectedPage + 1}</span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button Menu (Procreate-style) */}
        <div className="fixed bottom-6 right-6 z-50">
          {/* Expanded menu */}
          {toolMenuOpen && selectedSign && (
            <div className="absolute bottom-16 right-0 space-y-3">
              <button
                onClick={() => markSignStatus(selectedSign.sign_number, 'installed')}
                className="w-14 h-14 bg-green-500 rounded-full shadow-2xl flex items-center justify-center text-white font-bold animate-spring-in hover:scale-110 transition-transform"
                style={{ animationDelay: '0ms' }}
              >
                <Check className="w-7 h-7" />
              </button>
              <button
                onClick={() => markSignStatus(selectedSign.sign_number, 'missing')}
                className="w-14 h-14 bg-red-500 rounded-full shadow-2xl flex items-center justify-center text-white font-bold animate-spring-in hover:scale-110 transition-transform"
                style={{ animationDelay: '50ms' }}
              >
                <X className="w-7 h-7" />
              </button>
              <button
                onClick={() => markSignStatus(selectedSign.sign_number, 'damaged')}
                className="w-14 h-14 bg-orange-500 rounded-full shadow-2xl flex items-center justify-center text-white font-bold animate-spring-in hover:scale-110 transition-transform"
                style={{ animationDelay: '100ms' }}
              >
                <AlertTriangle className="w-7 h-7" />
              </button>
            </div>
          )}
          
          {/* Main FAB */}
          <button
            onClick={() => setToolMenuOpen(!toolMenuOpen)}
            className={`w-16 h-16 ${toolMenuOpen ? 'bg-gray-600' : 'bg-blue-600'} rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110`}
          >
            {toolMenuOpen ? <X className="w-8 h-8" /> : <Layers className="w-8 h-8" />}
          </button>
        </div>

        {/* Gesture Hints (Procreate-style) */}
        {showGestureHints && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-xl p-3 text-white text-xs space-y-1 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">👆</span>
              <span>Tap sign to select</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✌️</span>
              <span>Two fingers: Undo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👌</span>
              <span>Pinch: Zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">↔️</span>
              <span>Edge swipe: Change page</span>
            </div>
            <button
              onClick={() => setShowGestureHints(false)}
              className="mt-2 text-gray-400 underline"
            >
              Hide hints
            </button>
          </div>
        )}

        {/* Undo/Redo buttons (top right) */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={undo}
            disabled={historyIndex < 0}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-lg flex items-center justify-center text-white disabled:opacity-30 backdrop-blur-sm hover:bg-opacity-70 transition-colors"
          >
            <RotateCw className="w-5 h-5 rotate-180" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= statusHistory.length - 1}
            className="w-10 h-10 bg-black bg-opacity-50 rounded-lg flex items-center justify-center text-white disabled:opacity-30 backdrop-blur-sm hover:bg-opacity-70 transition-colors"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Page Scrubber (Procreate Gallery-style) */}
        {showPageScrubber && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-90 p-3 backdrop-blur-md">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedPage(i + 1);
                    setShowPageScrubber(false);
                  }}
                  className={`flex-shrink-0 transition-all ${
                    selectedPage === i + 1 
                      ? 'w-16 h-20 border-2 border-blue-400' 
                      : 'w-14 h-18 border border-gray-600 opacity-70 hover:opacity-100'
                  } rounded-lg overflow-hidden`}
                >
                  <div className="relative w-full h-full bg-gray-800">
                    <span className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                      {i + 1}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show scrubber toggle */}
        <button
          onClick={() => setShowPageScrubber(!showPageScrubber)}
          className="absolute bottom-4 left-4 w-12 h-12 bg-black bg-opacity-50 rounded-lg flex items-center justify-center text-white backdrop-blur-sm hover:bg-opacity-70 transition-colors"
        >
          <Layers className="w-6 h-6" />
        </button>
      </div>

      <style jsx>{`
        @keyframes spring-in {
          0% { 
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% { 
            transform: scale(1.1) rotate(10deg);
          }
          100% { 
            transform: scale(1) rotate(0);
            opacity: 1;
          }
        }
        
        .animate-spring-in {
          animation: spring-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .touch-pan {
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
        }
        
        .smooth-transform {
          will-change: transform;
          transform: translateZ(0);
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}