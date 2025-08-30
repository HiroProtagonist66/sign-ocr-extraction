'use client';

import { useState, useEffect } from 'react';
import { COMPLETE_EXTRACTION_DATA } from '../test/all-signs-data';

interface ExtractedSign {
  text: string;
  signType: string | null;
  boundingBox: {
    x_percentage: number;
    y_percentage: number;
    width_percentage: number;
    height_percentage: number;
  };
  confidence: number;
  isFieldLocate?: boolean;
}

interface ExtractionResult {
  pdfFile: string;
  pageNumber: number;
  imageSize: {
    width: number;
    height: number;
  };
  planImageUrl?: string;
  extractedSigns: ExtractedSign[];
  timestamp: string;
  processingTime: number;
  stats?: {
    totalSigns: number;
    fieldLocateSigns: number;
    mainAreaSigns: number;
  };
}

interface HotspotData {
  id: string;
  signNumber: string;
  signType: string | null;
  x_percentage: number;
  y_percentage: number;
  width_percentage: number;
  height_percentage: number;
  status: 'pending' | 'installed' | 'issue' | 'missing';
  confidence: number;
  isFieldLocate: boolean;
}

const HOTSPOT_COLORS = {
  pending: '#6B7280',    // Gray
  installed: '#10B981',  // Green
  issue: '#F59E0B',      // Yellow
  missing: '#EF4444',    // Red
};

export default function EnhancedDemoPage() {
  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [extractionData] = useState<{ [key: string]: ExtractionResult[] }>(COMPLETE_EXTRACTION_DATA);
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [showFieldLocate, setShowFieldLocate] = useState(true);
  const [showMainSigns, setShowMainSigns] = useState(true);

  useEffect(() => {
    const firstPdf = Object.keys(COMPLETE_EXTRACTION_DATA)[0];
    setSelectedPdf(firstPdf);
    loadHotspots(firstPdf);
  }, []);

  const loadHotspots = (pdfName: string) => {
    const results = extractionData[pdfName];
    if (!results || results.length === 0) return;

    const extraction = results[0];
    const newHotspots = extraction.extractedSigns.map((sign, index) => ({
      id: `hotspot-${index}`,
      signNumber: sign.text,
      signType: sign.signType,
      x_percentage: sign.boundingBox.x_percentage,
      y_percentage: sign.boundingBox.y_percentage,
      width_percentage: sign.boundingBox.width_percentage,
      height_percentage: sign.boundingBox.height_percentage,
      status: 'pending' as const,
      confidence: sign.confidence,
      isFieldLocate: sign.isFieldLocate || false
    }));

    setHotspots(newHotspots);
    setSelectedSign(null);
  };

  const handlePdfChange = (value: string) => {
    setSelectedPdf(value);
    loadHotspots(value);
  };

  const handleHotspotClick = (hotspotId: string) => {
    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (hotspot) {
      setSelectedSign(hotspot.signNumber);
    }
  };

  const updateHotspotStatus = (status: 'pending' | 'installed' | 'issue' | 'missing') => {
    if (!selectedSign) return;
    
    setHotspots(prev => prev.map(h => 
      h.signNumber === selectedSign 
        ? { ...h, status }
        : h
    ));
  };

  const currentExtraction = extractionData[selectedPdf]?.[0];
  const visibleHotspots = hotspots.filter(h => {
    if (h.isFieldLocate) return showFieldLocate;
    return showMainSigns;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sign OCR Extraction - COLO 2 Complete View</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1">Select PDF</label>
              <select 
                value={selectedPdf}
                onChange={(e) => handlePdfChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {Object.keys(extractionData).map(pdf => (
                  <option key={pdf} value={pdf}>
                    {pdf.replace('000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 ', 'PDF ')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showMainSigns}
                  onChange={(e) => setShowMainSigns(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Main Signs ({currentExtraction?.stats?.mainAreaSigns || 0})</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showFieldLocate}
                  onChange={(e) => setShowFieldLocate(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Field Locate ({currentExtraction?.stats?.fieldLocateSigns || 0})</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        {currentExtraction && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">{currentExtraction.stats?.totalSigns || currentExtraction.extractedSigns.length}</div>
              <div className="text-sm text-gray-600">Total Signs Found</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">{visibleHotspots.length}</div>
              <div className="text-sm text-gray-600">Currently Visible</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">
                {(currentExtraction.extractedSigns[0]?.confidence * 100 || 95).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">
                {(currentExtraction.processingTime / 1000).toFixed(1)}s
              </div>
              <div className="text-sm text-gray-600">Processing Time</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Plan Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-2">Interactive Plan View - COLO 2</h2>
              <div className="relative w-full bg-gray-100 rounded overflow-auto" style={{ height: '600px' }}>
                {currentExtraction?.planImageUrl ? (
                  <>
                    <img 
                      src={currentExtraction.planImageUrl}
                      alt="Site Plan"
                      className="w-full h-full object-contain"
                      style={{ minWidth: '800px' }}
                    />
                    {/* Hotspot Overlays */}
                    <div className="absolute inset-0" style={{ minWidth: '800px' }}>
                      {visibleHotspots.map(hotspot => (
                        <div
                          key={hotspot.id}
                          className="absolute cursor-pointer transition-all hover:scale-110"
                          style={{
                            left: `${hotspot.x_percentage}%`,
                            top: `${hotspot.y_percentage}%`,
                            width: `${Math.max(hotspot.width_percentage, 3)}%`,
                            height: `${Math.max(hotspot.height_percentage, 2)}%`,
                            backgroundColor: hotspot.signNumber === selectedSign 
                              ? 'rgba(59, 130, 246, 0.5)'
                              : `${HOTSPOT_COLORS[hotspot.status]}33`,
                            border: `2px solid ${
                              hotspot.signNumber === selectedSign 
                                ? '#3B82F6'
                                : HOTSPOT_COLORS[hotspot.status]
                            }`,
                            minWidth: '44px',
                            minHeight: '24px',
                          }}
                          onClick={() => handleHotspotClick(hotspot.id)}
                          title={`Sign ${hotspot.signNumber}${hotspot.isFieldLocate ? ' (Field Locate)' : ''}`}
                        >
                          <div className="text-xs font-bold text-center" 
                               style={{ 
                                 color: hotspot.signNumber === selectedSign ? '#1E40AF' : '#000',
                                 textShadow: '0 0 3px rgba(255,255,255,0.8)'
                               }}>
                            {hotspot.signNumber}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Loading plan image...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sign Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-semibold mb-2">Sign Details</h2>
              {selectedSign ? (
                <div>
                  <div className="mb-4">
                    <div className="text-2xl font-bold mb-2">Sign #{selectedSign}</div>
                    {hotspots.find(h => h.signNumber === selectedSign)?.isFieldLocate && (
                      <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Field Locate Sign
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="font-medium">Confidence:</span>{' '}
                      {(hotspots.find(h => h.signNumber === selectedSign)?.confidence || 0.95) * 100}%
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Position:</span>{' '}
                      {hotspots.find(h => h.signNumber === selectedSign)?.x_percentage.toFixed(1)}%, {' '}
                      {hotspots.find(h => h.signNumber === selectedSign)?.y_percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Current Status:</span>{' '}
                      <span className="font-bold" style={{ 
                        color: HOTSPOT_COLORS[hotspots.find(h => h.signNumber === selectedSign)?.status || 'pending'] 
                      }}>
                        {hotspots.find(h => h.signNumber === selectedSign)?.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateHotspotStatus('installed')}
                      className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Installed
                    </button>
                    <button
                      onClick={() => updateHotspotStatus('issue')}
                      className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Issue
                    </button>
                    <button
                      onClick={() => updateHotspotStatus('missing')}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Missing
                    </button>
                    <button
                      onClick={() => updateHotspotStatus('pending')}
                      className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Pending
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Click on a hotspot to view details</p>
              )}
            </div>

            {/* Sign List */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-2">
                Sign List ({visibleHotspots.length} visible)
              </h2>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {visibleHotspots.map(hotspot => (
                    <div
                      key={hotspot.id}
                      onClick={() => handleHotspotClick(hotspot.id)}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        hotspot.signNumber === selectedSign
                          ? 'bg-blue-100 border-blue-500 border'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {hotspot.signNumber}
                          {hotspot.isFieldLocate && (
                            <span className="text-xs text-yellow-600 ml-2">[FL]</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {(hotspot.confidence * 100).toFixed(0)}%
                          </span>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: HOTSPOT_COLORS[hotspot.status] }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}