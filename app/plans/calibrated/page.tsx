'use client';

import { useState, useEffect, useRef, WheelEvent, MouseEvent } from 'react';
import calibratedData from '../../../test_data/extraction_results/calibrated_extraction_results.json';

interface HotspotData {
  id: string;
  signNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'pending' | 'installed' | 'issue' | 'missing';
  confidence: number;
  isFieldLocate: boolean;
}

const HOTSPOT_COLORS = {
  pending: '#6B7280',
  installed: '#10B981',
  issue: '#F59E0B',
  missing: '#EF4444',
};

export default function CalibratedDemoPage() {
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [showFieldLocate, setShowFieldLocate] = useState(true);
  const [showMainSigns, setShowMainSigns] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Manual calibration - testing with just sign 2001
  // Looking at the screenshot, sign 2001 appears to be at approximately:
  // x: 25% from left (middle-left of the building plan)
  // y: 15% from top (upper portion of the plan)
  const manualCalibrations: { [key: string]: { x: number, y: number } } = {
    '2001': { x: 25, y: 15 },
  };

  useEffect(() => {
    // Load ONLY sign 2001 for testing
    const testSigns = ['2001'];
    
    const newHotspots = calibratedData.extractedSigns
      .filter((sign: any) => testSigns.includes(sign.text))
      .map((sign: any, index: number) => {
        const calibration = manualCalibrations[sign.text];
        
        // Use manual calibration if available, otherwise fall back to OCR coordinates
        return {
          id: `hotspot-${index}`,
          signNumber: sign.text,
          x: calibration ? calibration.x : sign.boundingBox.x_percentage,
          y: calibration ? calibration.y : sign.boundingBox.y_percentage,
          width: sign.boundingBox.width_percentage || 2,
          height: sign.boundingBox.height_percentage || 1,
          status: 'pending' as const,
          confidence: sign.confidence || 0.95,
          isFieldLocate: sign.isFieldLocate || false
        };
      });

    console.log('Sign 2001 OCR coordinates:', {
      x: calibratedData.extractedSigns.find((s: any) => s.text === '2001')?.boundingBox.x_percentage,
      y: calibratedData.extractedSigns.find((s: any) => s.text === '2001')?.boundingBox.y_percentage
    });
    console.log('Sign 2001 manual coordinates:', manualCalibrations['2001']);

    setHotspots(newHotspots);
  }, []);

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
    const imageWidth = 1200; // Base image width
    const imageHeight = 857; // Base image height
    
    // Calculate the hotspot center in image coordinates
    const hotspotCenterX = (hotspot.x / 100) * imageWidth;
    const hotspotCenterY = (hotspot.y / 100) * imageHeight;
    
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

  // Search functionality
  const searchAndHighlight = (signNumber: string) => {
    const hotspot = hotspots.find(h => h.signNumber === signNumber);
    if (hotspot) {
      setSelectedSign(signNumber);
      centerOnHotspot(hotspot);
      setScale(3); // Zoom in to 300% for better visibility
    }
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.5));
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
    if (e.button === 0) {
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

  const handleMouseUp = () => setIsDragging(false);

  const visibleHotspots = hotspots.filter(h => {
    const matchesSearch = !searchTerm || h.signNumber.includes(searchTerm);
    const matchesFilter = (h.isFieldLocate && showFieldLocate) || (!h.isFieldLocate && showMainSigns);
    return matchesSearch && matchesFilter;
  });

  const stats = (calibratedData as any).stats || { mainAreaSigns: 0, fieldLocateSigns: 0, calibratedSigns: 0 };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Sign OCR Extraction - Calibrated Positions
        </h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search sign number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchTerm) {
                    searchAndHighlight(searchTerm);
                  }
                }}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            {/* Zoom Controls */}
            <div className="flex gap-2 items-center">
              <button
                onClick={handleZoomOut}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Zoom Out (-)">
                ➖
              </button>
              <span className="min-w-[60px] text-center font-medium">
                {(scale * 100).toFixed(0)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Zoom In (+)">
                ➕
              </button>
              <button
                onClick={resetZoom}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                title="Reset (R)">
                🔄
              </button>
            </div>
            
            {/* Filters */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showMainSigns}
                  onChange={(e) => setShowMainSigns(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Main ({stats.mainAreaSigns || 0})</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showFieldLocate}
                  onChange={(e) => setShowFieldLocate(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Field Locate ({stats.fieldLocateSigns || 0})</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">
              {(calibratedData as any).totalSignsFound || 157}
            </div>
            <div className="text-sm text-gray-600">Total Found</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold">{visibleHotspots.length}</div>
            <div className="text-sm text-gray-600">Visible</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.calibratedSigns || 22}
            </div>
            <div className="text-sm text-gray-600">Calibrated</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold">95%</div>
            <div className="text-sm text-gray-600">Confidence</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold">{(scale * 100).toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Zoom</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Plan Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">COLO 2 - Calibrated View</h2>
                <div className="text-sm text-gray-600">
                  🖱️ Drag | Scroll zoom | Click signs
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
                    src="/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png"
                    alt="COLO 2 Plan"
                    className="select-none"
                    style={{ 
                      width: '1200px',
                      height: 'auto',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                  />
                  
                  {/* Calibrated Hotspot Overlays */}
                  <div className="absolute inset-0" style={{ width: '1200px', height: '857px' }}>
                    {visibleHotspots.map(hotspot => {
                      const isSelected = hotspot.signNumber === selectedSign;
                      const baseSize = 30;
                      const size = Math.max(baseSize / scale, 15);
                      
                      // Calculate absolute pixel positions from percentages
                      const xPos = (hotspot.x / 100) * 1200;
                      const yPos = (hotspot.y / 100) * 857;
                      
                      return (
                        <div
                          key={hotspot.id}
                          className="absolute flex items-center justify-center transition-all hover:z-50"
                          style={{
                            left: `${xPos}px`,
                            top: `${yPos}px`,
                            width: `${size}px`,
                            height: `${size * 0.7}px`,
                            transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.2)' : 'scale(1)'}`,
                            backgroundColor: isSelected 
                              ? 'rgba(59, 130, 246, 0.7)'
                              : `${HOTSPOT_COLORS[hotspot.status]}66`,
                            border: `${Math.max(2/scale, 1)}px solid ${
                              isSelected ? '#2563EB' : HOTSPOT_COLORS[hotspot.status]
                            }`,
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                          onClick={(e) => handleHotspotClick(hotspot.id, e)}
                          title={`Sign ${hotspot.signNumber}${hotspot.isFieldLocate ? ' (FL)' : ''}`}
                        >
                          <div 
                            className="font-bold text-center"
                            style={{ 
                              color: isSelected ? '#1E40AF' : '#000',
                              textShadow: '0 0 3px rgba(255,255,255,1)',
                              fontSize: `${Math.max(11/scale, 9)}px`,
                              lineHeight: 1,
                            }}
                          >
                            {hotspot.signNumber}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-1">
            {/* Sign Details */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-semibold mb-2">Sign Details</h2>
              {selectedSign ? (
                <div>
                  <div className="mb-4">
                    <div className="text-2xl font-bold mb-2">#{selectedSign}</div>
                    {hotspots.find(h => h.signNumber === selectedSign)?.isFieldLocate && (
                      <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Field Locate
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm">
                    <div>
                      <span className="font-medium">Position:</span>{' '}
                      X: {hotspots.find(h => h.signNumber === selectedSign)?.x.toFixed(1)}%, {' '}
                      Y: {hotspots.find(h => h.signNumber === selectedSign)?.y.toFixed(1)}%
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{' '}
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
                      className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    >
                      Installed
                    </button>
                    <button
                      onClick={() => updateHotspotStatus('issue')}
                      className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                    >
                      Issue
                    </button>
                    <button
                      onClick={() => updateHotspotStatus('missing')}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      Missing
                    </button>
                    <button
                      onClick={() => updateHotspotStatus('pending')}
                      className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                    >
                      Pending
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Click a sign to view details</p>
              )}
            </div>

            {/* Sign List */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-2">
                Signs ({visibleHotspots.length})
              </h2>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {visibleHotspots
                    .sort((a, b) => {
                      const aNum = parseInt(a.signNumber) || 9999;
                      const bNum = parseInt(b.signNumber) || 9999;
                      return aNum - bNum;
                    })
                    .map(hotspot => (
                    <div
                      key={hotspot.id}
                      onClick={() => {
                        setSelectedSign(hotspot.signNumber);
                        centerOnHotspot(hotspot);
                      }}
                      className={`p-2 rounded cursor-pointer transition-colors text-sm ${
                        hotspot.signNumber === selectedSign
                          ? 'bg-blue-100 border-blue-500 border'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {hotspot.signNumber}
                          {hotspot.isFieldLocate && (
                            <span className="text-xs text-yellow-600 ml-1">[FL]</span>
                          )}
                        </span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: HOTSPOT_COLORS[hotspot.status] }}
                        />
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