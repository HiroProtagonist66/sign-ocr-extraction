'use client';

import { useState, useEffect, useRef, WheelEvent, MouseEvent } from 'react';
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

export default function ZoomableDemoPage() {
  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [extractionData] = useState<{ [key: string]: ExtractionResult[] }>(COMPLETE_EXTRACTION_DATA);
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [showFieldLocate, setShowFieldLocate] = useState(true);
  const [showMainSigns, setShowMainSigns] = useState(true);
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

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
    resetZoom();
  };

  const handleHotspotClick = (hotspotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (hotspot) {
      setSelectedSign(hotspot.signNumber);
      
      // Auto-center on the selected sign if zoomed in
      if (scale > 1.5) {
        centerOnHotspot(hotspot);
      }
    }
  };

  const centerOnHotspot = (hotspot: HotspotData) => {
    if (!containerRef.current || !imageRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    // Calculate the hotspot center in image coordinates
    const hotspotCenterX = (hotspot.x_percentage / 100) * imageRect.width;
    const hotspotCenterY = (hotspot.y_percentage / 100) * imageRect.height;
    
    // Calculate new position to center the hotspot
    const newX = (containerRect.width / 2) - (hotspotCenterX * scale);
    const newY = (containerRect.height / 2) - (hotspotCenterY * scale);
    
    setPosition({ x: newX, y: newY });
  };

  const updateHotspotStatus = (status: 'pending' | 'installed' | 'issue' | 'missing') => {
    if (!selectedSign) return;
    
    setHotspots(prev => prev.map(h => 
      h.signNumber === selectedSign 
        ? { ...h, status }
        : h
    ));
  };

  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
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

  const currentExtraction = extractionData[selectedPdf]?.[0];
  const visibleHotspots = hotspots.filter(h => {
    if (h.isFieldLocate) return showFieldLocate;
    return showMainSigns;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sign OCR Extraction - Zoomable View</h1>
        
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
            
            {/* Zoom Controls */}
            <div className="flex gap-2 items-center">
              <button
                onClick={handleZoomOut}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Zoom Out"
              >
                ➖
              </button>
              <span className="min-w-[60px] text-center font-medium">
                {(scale * 100).toFixed(0)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Zoom In"
              >
                ➕
              </button>
              <button
                onClick={resetZoom}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Reset Zoom"
              >
                🔄
              </button>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold text-red-600">
                {currentExtraction.stats?.totalSigns || currentExtraction.extractedSigns.length}
              </div>
              <div className="text-sm text-gray-600">Found (Target: 150+)</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">{visibleHotspots.length}</div>
              <div className="text-sm text-gray-600">Currently Visible</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">
                {150 - (currentExtraction.stats?.totalSigns || 112)}
              </div>
              <div className="text-sm text-gray-600">Missing Signs</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">
                {(currentExtraction.extractedSigns[0]?.confidence * 100 || 95).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-2xl font-bold">
                {(scale * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Zoom Level</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Plan Viewer with Zoom */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Interactive Plan View - COLO 2</h2>
                <div className="text-sm text-gray-600">
                  🖱️ Drag to pan | Scroll to zoom | Click signs to select
                </div>
              </div>
              <div 
                ref={containerRef}
                className="relative w-full bg-gray-100 rounded overflow-hidden cursor-move" 
                style={{ height: '700px' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {currentExtraction?.planImageUrl ? (
                  <div
                    ref={imageRef}
                    className="absolute"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: '0 0',
                      transition: isDragging ? 'none' : 'transform 0.1s',
                      cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                  >
                    <img 
                      src={currentExtraction.planImageUrl}
                      alt="Site Plan"
                      className="select-none"
                      style={{ 
                        width: '1200px',
                        height: 'auto',
                        pointerEvents: 'none'
                      }}
                      draggable={false}
                    />
                    {/* Hotspot Overlays */}
                    <div className="absolute inset-0" style={{ width: '1200px', height: '857px' }}>
                      {visibleHotspots.map(hotspot => {
                        const minSize = scale > 2 ? 20 / scale : 40 / scale;
                        return (
                          <div
                            key={hotspot.id}
                            className="absolute transition-all hover:z-50"
                            style={{
                              left: `${hotspot.x_percentage}%`,
                              top: `${hotspot.y_percentage}%`,
                              width: `${Math.max(hotspot.width_percentage, minSize)}%`,
                              height: `${Math.max(hotspot.height_percentage, minSize/2)}%`,
                              backgroundColor: hotspot.signNumber === selectedSign 
                                ? 'rgba(59, 130, 246, 0.6)'
                                : `${HOTSPOT_COLORS[hotspot.status]}44`,
                              border: `${Math.max(1, 2/scale)}px solid ${
                                hotspot.signNumber === selectedSign 
                                  ? '#3B82F6'
                                  : HOTSPOT_COLORS[hotspot.status]
                              }`,
                              cursor: 'pointer',
                              minWidth: `${minSize}px`,
                              minHeight: `${minSize/2}px`,
                            }}
                            onClick={(e) => handleHotspotClick(hotspot.id, e)}
                            title={`Sign ${hotspot.signNumber}${hotspot.isFieldLocate ? ' (Field Locate)' : ''}`}
                          >
                            <div 
                              className="font-bold text-center flex items-center justify-center h-full" 
                              style={{ 
                                color: hotspot.signNumber === selectedSign ? '#1E40AF' : '#000',
                                textShadow: '0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.9)',
                                fontSize: `${Math.max(10, 12/scale)}px`
                              }}
                            >
                              {hotspot.signNumber}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Loading plan image...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sign Details and List */}
          <div className="lg:col-span-1">
            {/* Selected Sign Details */}
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
                      X: {hotspots.find(h => h.signNumber === selectedSign)?.x_percentage.toFixed(1)}%, {' '}
                      Y: {hotspots.find(h => h.signNumber === selectedSign)?.y_percentage.toFixed(1)}%
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
              <div className="text-xs text-gray-600 mb-2">
                Missing ~{150 - (currentExtraction?.stats?.totalSigns || 112)} signs
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {visibleHotspots
                    .sort((a, b) => parseInt(a.signNumber) - parseInt(b.signNumber))
                    .map(hotspot => (
                    <div
                      key={hotspot.id}
                      onClick={() => {
                        handleHotspotClick(hotspot.id, { stopPropagation: () => {} } as any);
                      }}
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