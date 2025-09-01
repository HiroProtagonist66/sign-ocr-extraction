'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Wifi, WifiOff, Check, X, AlertTriangle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function FieldInterface() {
  const [selectedSite, setSelectedSite] = useState('atl06');
  const [selectedPage, setSelectedPage] = useState(1);
  const [signs, setSigns] = useState<SignData[]>([]);
  const [signStatuses, setSignStatuses] = useState<Record<string, SignStatus>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'installed' | 'missing' | 'damaged'>('all');
  const [isOnline, setIsOnline] = useState(true);
  const [selectedSign, setSelectedSign] = useState<SignData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(57);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
  }, [selectedSite, selectedPage]);

  // Auto-save to localStorage
  useEffect(() => {
    if (Object.keys(signStatuses).length > 0) {
      localStorage.setItem(
        `field_status_${selectedSite}_page${selectedPage}`,
        JSON.stringify(signStatuses)
      );
      
      // Update overall progress
      const progress = {
        site: selectedSite,
        page: selectedPage,
        timestamp: new Date().toISOString(),
        statuses: signStatuses
      };
      const allProgress = JSON.parse(localStorage.getItem('field_progress') || '[]');
      const existingIndex = allProgress.findIndex((p: any) => 
        p.site === selectedSite && p.page === selectedPage
      );
      if (existingIndex >= 0) {
        allProgress[existingIndex] = progress;
      } else {
        allProgress.push(progress);
      }
      localStorage.setItem('field_progress', JSON.stringify(allProgress));
    }
  }, [signStatuses, selectedSite, selectedPage]);

  const getFilteredSigns = () => {
    if (filterStatus === 'all') return signs;
    
    return signs.filter(sign => {
      const status = signStatuses[sign.sign_number];
      if (filterStatus === 'pending') return !status;
      return status?.status === filterStatus;
    });
  };

  const handleSignClick = (signOrNumber: string | SignData) => {
    if (typeof signOrNumber === 'string') {
      const sign = signs.find(s => s.sign_number === signOrNumber);
      if (sign) setSelectedSign(sign);
    } else {
      setSelectedSign(signOrNumber);
    }
  };

  const markSignStatus = (signNumber: string, status: 'installed' | 'missing' | 'damaged') => {
    setSignStatuses(prev => ({
      ...prev,
      [signNumber]: {
        status,
        timestamp: new Date().toISOString(),
        installer: localStorage.getItem('installer_name') || 'Field User'
      }
    }));
    setSelectedSign(null);
  };

  const clearSignStatus = (signNumber: string) => {
    setSignStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[signNumber];
      return newStatuses;
    });
    setSelectedSign(null);
  };

  const pendingCount = signs.filter(s => !signStatuses[s.sign_number]).length;
  const installedCount = Object.values(signStatuses).filter(s => s.status === 'installed').length;
  const missingCount = Object.values(signStatuses).filter(s => s.status === 'missing').length;
  const damagedCount = Object.values(signStatuses).filter(s => s.status === 'damaged').length;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && selectedPage > 1) {
        setSelectedPage(selectedPage - 1);
      } else if (e.key === 'ArrowRight' && selectedPage < totalPages) {
        setSelectedPage(selectedPage + 1);
      } else if (e.key === 'Escape' && selectedSign) {
        setSelectedSign(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPage, totalPages, selectedSign]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* VERSION BANNER - TOUCH FIX v2.2 */}
      <div className="bg-blue-600 text-white text-center p-2 font-bold">
        👆 FIELD V2.2 - TOUCH FIX - Touch-action: none (custom handling) - Fingers work on floor plan - {new Date().toISOString()}
      </div>
      
      {/* Header */}
      <header className="bg-blue-600 text-white p-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1 hover:bg-blue-700 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">📋 Field Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-300" />
            )}
            <span className="text-sm">{selectedSite.toUpperCase()} - P{selectedPage}</span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b p-2 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filterStatus === 'all' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({signs.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filterStatus === 'pending' 
              ? 'bg-yellow-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('installed')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filterStatus === 'installed' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✓ Installed ({installedCount})
        </button>
        <button
          onClick={() => setFilterStatus('missing')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filterStatus === 'missing' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✗ Missing ({missingCount})
        </button>
        <button
          onClick={() => setFilterStatus('damaged')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filterStatus === 'damaged' 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚠ Damaged ({damagedCount})
        </button>
      </div>

      {/* Main Floor Plan View */}
      <div className="flex-1 relative overflow-hidden bg-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading floor plan...</p>
            </div>
          </div>
        ) : (
          <PanZoomViewer
            imagePath={`/plans/ATL06/page_${String(selectedPage).padStart(2, '0')}_full.png`}
            imageSrc={`/plans/ATL06/page_${String(selectedPage).padStart(2, '0')}_full.png`}
            imageWidth={3300}
            imageHeight={2550}
            signs={getFilteredSigns()}
            onSignClick={handleSignClick}
            selectedSigns={selectedSign ? new Set([selectedSign.sign_number]) : new Set()}
            signStatuses={signStatuses}
            viewMode="field"
          />
        )}
        
        {/* Page Navigation */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
          <button
            onClick={() => setSelectedPage(Math.max(1, selectedPage - 1))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={selectedPage === 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-2 min-w-[80px] text-center">
            <span className="font-medium">Page {selectedPage}</span>
            <span className="text-gray-500 text-sm"> / {totalPages}</span>
          </div>
          <button
            onClick={() => setSelectedPage(Math.min(totalPages, selectedPage + 1))}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={selectedPage === totalPages}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 min-w-[120px]">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Page Progress</div>
          <div className="text-2xl font-bold text-green-600">
            {installedCount}/{signs.length}
          </div>
          <div className="text-xs text-gray-500">signs installed</div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(installedCount / signs.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Panel (Mobile-Optimized) */}
      {selectedSign && (
        <div className="bg-white border-t shadow-2xl p-4 animate-slide-up">
          <div className="text-center mb-4">
            <span className="font-bold text-xl">Sign {selectedSign.sign_number}</span>
            {signStatuses[selectedSign.sign_number] && (
              <div className="text-sm text-gray-500 mt-1">
                Status: {signStatuses[selectedSign.sign_number].status}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => markSignStatus(selectedSign.sign_number, 'installed')}
              className="p-4 bg-green-500 text-white rounded-lg font-semibold active:bg-green-600 transform active:scale-95 transition-transform flex flex-col items-center gap-1"
            >
              <Check className="w-6 h-6" />
              <span className="text-sm">Installed</span>
            </button>
            <button
              onClick={() => markSignStatus(selectedSign.sign_number, 'missing')}
              className="p-4 bg-red-500 text-white rounded-lg font-semibold active:bg-red-600 transform active:scale-95 transition-transform flex flex-col items-center gap-1"
            >
              <X className="w-6 h-6" />
              <span className="text-sm">Missing</span>
            </button>
            <button
              onClick={() => markSignStatus(selectedSign.sign_number, 'damaged')}
              className="p-4 bg-orange-500 text-white rounded-lg font-semibold active:bg-orange-600 transform active:scale-95 transition-transform flex flex-col items-center gap-1"
            >
              <AlertTriangle className="w-6 h-6" />
              <span className="text-sm">Damaged</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {signStatuses[selectedSign.sign_number] && (
              <button
                onClick={() => clearSignStatus(selectedSign.sign_number)}
                className="p-3 bg-gray-300 text-gray-700 rounded-lg font-medium active:bg-gray-400 transform active:scale-95 transition-transform"
              >
                Clear Status
              </button>
            )}
            <button
              onClick={() => setSelectedSign(null)}
              className={`p-3 bg-gray-300 text-gray-700 rounded-lg font-medium active:bg-gray-400 transform active:scale-95 transition-transform ${
                !signStatuses[selectedSign.sign_number] ? 'col-span-2' : ''
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}