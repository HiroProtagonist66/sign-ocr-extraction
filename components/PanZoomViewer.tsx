'use client';

import React, { useState, useRef, useEffect, useCallback, MouseEvent, TouchEvent } from 'react';
import Image from 'next/image';

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
}

interface SignStatus {
  status: 'installed' | 'missing' | 'damaged';
  timestamp: string;
  installer?: string;
}

interface PanZoomViewerProps {
  imagePath?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
  signs: SignHotspot[];
  selectedSigns: Set<string>;
  onSignClick: (signNumber: string | SignHotspot) => void;
  onMultiSelect?: (signNumbers: string[]) => void;
  showGrid?: boolean;
  signStatuses?: Record<string, SignStatus>;
  viewMode?: 'validation' | 'field';
}

export default function PanZoomViewer({
  imagePath,
  imageSrc,
  imageWidth,
  imageHeight,
  signs,
  selectedSigns,
  onSignClick,
  onMultiSelect,
  showGrid = false,
  signStatuses,
  viewMode = 'validation'
}: PanZoomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 });
  
  // Touch handling state
  const [isTouchPanning, setIsTouchPanning] = useState(false);
  const [touchPanStart, setTouchPanStart] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [initialTouchZoom, setInitialTouchZoom] = useState(1);
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });
  const [showPinchDebug, setShowPinchDebug] = useState(false); // Debug visualization

  // Load image and get dimensions
  useEffect(() => {
    if (!imagePath) {
      console.error('No image path provided to PanZoomViewer');
      return;
    }
    
    console.log('Loading image:', imagePath);
    setImageLoaded(false);
    setImageError(false);
    
    const img = new window.Image();
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height);
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image:', imagePath);
      setImageError(true);
    };
    img.src = imagePath;
  }, [imagePath]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const delta = e.deltaY * -0.001;
    const newScale = Math.max(0.1, Math.min(10, transform.scale * (1 + delta)));
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleChange = newScale - transform.scale;
    const newX = transform.x - mouseX * scaleChange;
    const newY = transform.y - mouseY * scaleChange;
    
    setTransform({ x: newX, y: newY, scale: newScale });
  }, [transform]);

  // Pan handling
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      if (e.shiftKey) {
        // Start selection box
        setIsSelecting(true);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - transform.x) / transform.scale;
          const y = (e.clientY - rect.top - transform.y) / transform.scale;
          setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        }
      } else {
        // Start panning
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setTransform({
        ...transform,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (isSelecting) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.scale;
        const y = (e.clientY - rect.top - transform.y) / transform.scale;
        setSelectionBox(prev => ({ ...prev, endX: x, endY: y }));
      }
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && onMultiSelect) {
      // Find signs within selection box
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      
      const selectedSignNumbers: string[] = [];
      signs.forEach(sign => {
        const x = (sign.hotspot_bbox.x_percentage / 100) * imageSize.width;
        const y = (sign.hotspot_bbox.y_percentage / 100) * imageSize.height;
        const w = (sign.hotspot_bbox.width_percentage / 100) * imageSize.width;
        const h = (sign.hotspot_bbox.height_percentage / 100) * imageSize.height;
        
        if (x >= minX && x + w <= maxX && y >= minY && y + h <= maxY) {
          selectedSignNumbers.push(sign.sign_number);
        }
      });
      
      if (selectedSignNumbers.length > 0) {
        onMultiSelect(selectedSignNumbers);
      }
    }
    
    setIsPanning(false);
    setIsSelecting(false);
    setSelectionBox({ startX: 0, startY: 0, endX: 0, endY: 0 });
  };

  // Touch handlers (single-finger pan, two-finger pinch-zoom)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsTouchPanning(true);
      const t = e.touches[0];
      setTouchPanStart({ x: t.clientX - transform.x, y: t.clientY - transform.y });
    } else if (e.touches.length === 2) {
      setIsTouchPanning(false);
      
      // Calculate center point between two fingers
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // Get container position to convert to relative coordinates
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const relativeCenterX = (centerX - rect.left - transform.x) / transform.scale;
        const relativeCenterY = (centerY - rect.top - transform.y) / transform.scale;
        
        setPinchCenter({ x: relativeCenterX, y: relativeCenterY });
        setShowPinchDebug(true); // Enable debug visualization
      }
      
      // Calculate initial distance between fingers
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const dist = Math.hypot(dx, dy);
      setTouchStartDistance(dist);
      setInitialTouchZoom(transform.scale);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isTouchPanning) {
      const t = e.touches[0];
      setTransform(prev => ({ ...prev, x: t.clientX - touchPanStart.x, y: t.clientY - touchPanStart.y }));
    } else if (e.touches.length === 2 && touchStartDistance > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Calculate new distance
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.hypot(dx, dy);
      
      const scaleChange = currentDistance / touchStartDistance;
      let newScale = initialTouchZoom * scaleChange;
      
      // Enforce zoom limits (MIN_ZOOM = 1)
      newScale = Math.max(1, Math.min(10, newScale));
      
      // Calculate scale delta
      const scaleDelta = newScale / transform.scale;
      
      // Adjust pan to zoom toward pinch center
      const newX = pinchCenter.x + (transform.x - pinchCenter.x) * scaleDelta;
      const newY = pinchCenter.y + (transform.y - pinchCenter.y) * scaleDelta;
      
      setTransform({
        x: newX,
        y: newY,
        scale: newScale
      });
    }
  };

  const handleTouchEnd = () => {
    setIsTouchPanning(false);
    setTouchStartDistance(0);
    setShowPinchDebug(false); // Hide debug visualization
  };

  const getHotspotColor = (sign: SignHotspot) => {
    // Field mode status colors
    if (viewMode === 'field' && signStatuses) {
      const status = signStatuses[sign.sign_number];
      if (selectedSigns.has(sign.sign_number)) {
        return 'border-blue-600 bg-blue-500 bg-opacity-40 border-4';
      }
      switch (status?.status) {
        case 'installed':
          return 'border-green-500 bg-green-200 bg-opacity-40 border-3';
        case 'missing':
          return 'border-red-500 bg-red-200 bg-opacity-40 border-3';
        case 'damaged':
          return 'border-orange-500 bg-orange-200 bg-opacity-40 border-3';
        default:
          return 'border-gray-400 bg-gray-200 bg-opacity-20 border-2';
      }
    }
    
    // Validation mode colors
    if (selectedSigns.has(sign.sign_number)) {
      return 'border-blue-500 bg-blue-500 bg-opacity-20 hover:bg-opacity-30';
    }
    
    switch (sign.status) {
      case 'verified':
        return 'border-green-500 bg-green-500 bg-opacity-5 hover:bg-opacity-20';
      case 'error':
        return 'border-red-500 bg-red-500 bg-opacity-5 hover:bg-opacity-20';
      case 'pending':
      default:
        return 'border-yellow-500 bg-yellow-500 bg-opacity-5 hover:bg-opacity-20';
    }
  };

  const zoomIn = () => setTransform(t => ({ ...t, scale: Math.min(10, t.scale * 1.2) }));
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale / 1.2) }));
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });
  
  const fitToScreen = () => {
    if (!containerRef.current || imageSize.width === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = rect.width / imageSize.width;
    const scaleY = rect.height / imageSize.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    setTransform({ x: 0, y: 0, scale });
  };

  // Show error state if image fails to load
  if (imageError) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-gray-800 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="mb-2">Failed to load floor plan image</p>
          <p className="text-sm">{imagePath}</p>
        </div>
      </div>
    );
  }

  // Show loading state while image loads
  if (!imageLoaded && imagePath) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-gray-800 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading floor plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-800">
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-20 bg-gray-900 rounded-lg p-2 space-y-2">
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          +
        </button>
        <div className="text-center text-xs text-white">
          {Math.round(transform.scale * 100)}%
        </div>
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white"
        >
          -
        </button>
        <button
          onClick={fitToScreen}
          className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
        >
          Fit
        </button>
        <button
          onClick={resetZoom}
          className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
        >
          1:1
        </button>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        // Disable browser touch gestures so we can handle them
        style={{
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        onTouchStart={(e) => { e.preventDefault(); handleTouchStart(e); }}
        onTouchMove={(e) => { e.preventDefault(); handleTouchMove(e); }}
        onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd(); }}
      >
        {/* Grid Overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${50 * transform.scale}px ${50 * transform.scale}px`,
              backgroundPosition: `${transform.x}px ${transform.y}px`,
            }}
          />
        )}

        {/* Image and Hotspots Container */}
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            width: imageSize.width || '100%',
            height: imageSize.height || '100%',
          }}
          className="absolute"
        >
          {(imagePath || imageSrc) && (
            <>
              <img
                ref={imageRef}
                src={imageSrc || imagePath}
                alt="Floor Plan"
                className="select-none"
                draggable={false}
                onLoad={() => console.log('Image element loaded in DOM')}
                onError={() => console.error('Image element failed to load in DOM')}
                style={{
                  width: imageSize.width || 'auto',
                  height: imageSize.height || 'auto',
                  maxWidth: '100%',
                  display: imageLoaded ? 'block' : 'none'
                }}
              />
              
              {/* Sign Hotspots */}
              {imageLoaded && signs.map((sign, index) => {
                // For pixel-perfect positioning when image size is known
                const usePixels = imageSize.width > 0 && imageSize.height > 0;
                const x = usePixels ? (sign.hotspot_bbox.x_percentage / 100) * imageSize.width : 0;
                const y = usePixels ? (sign.hotspot_bbox.y_percentage / 100) * imageSize.height : 0;
                const width = usePixels ? (sign.hotspot_bbox.width_percentage / 100) * imageSize.width : 0;
                const height = usePixels ? (sign.hotspot_bbox.height_percentage / 100) * imageSize.height : 0;
                
                return (
                  <div
                    key={`${sign.sign_number}-${index}`}
                    className={`absolute border-2 cursor-pointer transition-all duration-200 ${getHotspotColor(sign)}`}
                    style={usePixels ? {
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    } : {
                      left: `${sign.hotspot_bbox.x_percentage}%`,
                      top: `${sign.hotspot_bbox.y_percentage}%`,
                      width: `${sign.hotspot_bbox.width_percentage}%`,
                      height: `${sign.hotspot_bbox.height_percentage}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Support both string and full sign object
                      onSignClick(viewMode === 'field' ? sign : sign.sign_number);
                    }}
                    title={`${sign.sign_number} (${sign.confidence})`}
                  >
                    <div className="absolute -top-5 left-0 text-xs bg-black bg-opacity-60 text-white px-1 rounded whitespace-nowrap z-10 font-semibold">
                      {sign.sign_number}
                    </div>
                    {/* Status icon for field mode */}
                    {viewMode === 'field' && signStatuses && signStatuses[sign.sign_number] && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-sm font-bold">
                        {signStatuses[sign.sign_number].status === 'installed' && <span className="text-green-600">✓</span>}
                        {signStatuses[sign.sign_number].status === 'missing' && <span className="text-red-600">✗</span>}
                        {signStatuses[sign.sign_number].status === 'damaged' && <span className="text-orange-600">⚠</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          
          {/* Selection Box */}
          {isSelecting && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-400 bg-opacity-20"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
              }}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-90 text-white text-xs p-2 rounded">
        <div>Click: Select sign</div>
        <div>Shift+Drag: Multi-select</div>
        <div>Scroll: Zoom</div>
        <div>Drag: Pan</div>
      </div>
      
      {/* Debug visualization for pinch center (red dot) */}
      {showPinchDebug && pinchCenter.x !== 0 && (
        <div
          className="absolute w-6 h-6 bg-red-500 rounded-full z-50 pointer-events-none animate-pulse"
          style={{
            left: `${pinchCenter.x * transform.scale + transform.x}px`,
            top: `${pinchCenter.y * transform.scale + transform.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
}
