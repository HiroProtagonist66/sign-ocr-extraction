'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

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
}

interface PlanViewerProps {
  planImageUrl: string;
  hotspots: HotspotData[];
  onHotspotClick?: (hotspot: HotspotData) => void;
  className?: string;
}

const HOTSPOT_COLORS = {
  pending: '#6B7280',    // Gray
  installed: '#10B981',  // Green
  issue: '#F59E0B',      // Yellow
  missing: '#EF4444',    // Red
};

const HOTSPOT_BORDER_COLORS = {
  pending: '#4B5563',
  installed: '#059669', 
  issue: '#D97706',
  missing: '#DC2626',
};

interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

export default function PlanViewer({
  planImageUrl,
  hotspots,
  onHotspotClick,
  className = ''
}: PlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    translateX: 0,
    translateY: 0
  });
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  
  // Touch/mouse interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialTransform, setInitialTransform] = useState<Transform | null>(null);

  // Reset transform when image changes
  useEffect(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    setImageLoaded(false);
    setImageError(false);
    setSelectedHotspot(null);
  }, [planImageUrl]);

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point of touches
  const getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    let totalX = 0;
    let totalY = 0;
    for (let i = 0; i < touches.length; i++) {
      totalX += touches[i].clientX;
      totalY += touches[i].clientY;
    }
    return {
      x: totalX / touches.length,
      y: totalY / touches.length
    };
  };

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - start dragging
      setIsDragging(true);
      setLastPointer({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      setIsDragging(false);
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialTransform(transform);
      setLastPointer(getTouchCenter(e.touches));
    }
  }, [transform]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging && lastPointer) {
      // Single touch - pan
      const deltaX = e.touches[0].clientX - lastPointer.x;
      const deltaY = e.touches[0].clientY - lastPointer.y;
      
      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }));
      
      setLastPointer({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && initialPinchDistance && initialTransform) {
      // Two touches - pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      const scaleChange = currentDistance / initialPinchDistance;
      const newScale = Math.max(0.5, Math.min(5, initialTransform.scale * scaleChange));
      
      const center = getTouchCenter(e.touches);
      if (lastPointer) {
        const deltaX = center.x - lastPointer.x;
        const deltaY = center.y - lastPointer.y;
        
        setTransform({
          scale: newScale,
          translateX: initialTransform.translateX + deltaX,
          translateY: initialTransform.translateY + deltaY
        });
      }
    }
  }, [isDragging, lastPointer, initialPinchDistance, initialTransform]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      setIsDragging(false);
      setLastPointer(null);
      setInitialPinchDistance(null);
      setInitialTransform(null);
    } else if (e.touches.length === 1) {
      // Switched from pinch to single touch
      setInitialPinchDistance(null);
      setInitialTransform(null);
      setIsDragging(true);
      setLastPointer({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  // Handle mouse interactions (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left button only
      setIsDragging(true);
      setLastPointer({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && lastPointer) {
      const deltaX = e.clientX - lastPointer.x;
      const deltaY = e.clientY - lastPointer.y;
      
      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }));
      
      setLastPointer({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastPointer]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setLastPointer(null);
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(5, transform.scale * scaleChange));
    
    // Zoom towards mouse position
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setTransform(prev => ({
      scale: newScale,
      translateX: prev.translateX + (mouseX - rect.width / 2) * (1 - scaleChange),
      translateY: prev.translateY + (mouseY - rect.height / 2) * (1 - scaleChange)
    }));
  }, [transform.scale]);

  // Handle hotspot click
  const handleHotspotClick = useCallback((e: React.MouseEvent, hotspot: HotspotData) => {
    e.stopPropagation();
    
    // Don't trigger if we're dragging
    if (isDragging) return;
    
    setSelectedHotspot(hotspot.id);
    onHotspotClick?.(hotspot);
  }, [isDragging, onHotspotClick]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  // Double click to zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (transform.scale > 1) {
      resetZoom();
    } else {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      setTransform({
        scale: 2,
        translateX: (rect.width / 2 - mouseX) * 2,
        translateY: (rect.height / 2 - mouseY) * 2
      });
    }
  }, [transform.scale, resetZoom]);

  // Render hotspot
  const renderHotspot = (hotspot: HotspotData) => {
    const isSelected = selectedHotspot === hotspot.id;
    const color = HOTSPOT_COLORS[hotspot.status];
    const borderColor = HOTSPOT_BORDER_COLORS[hotspot.status];
    
    // Minimum size for touch targets (44x44px)
    const minSize = 44;
    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;
    
    const pixelWidth = (hotspot.width_percentage / 100) * containerWidth;
    const pixelHeight = (hotspot.height_percentage / 100) * containerHeight;
    
    const finalWidth = Math.max(pixelWidth, minSize);
    const finalHeight = Math.max(pixelHeight, minSize);
    
    return (
      <div
        key={hotspot.id}
        className={`absolute cursor-pointer transition-all duration-200 select-none ${
          isSelected ? 'z-30' : 'z-20'
        }`}
        style={{
          left: `${hotspot.x_percentage}%`,
          top: `${hotspot.y_percentage}%`,
          width: `${(finalWidth / containerWidth) * 100}%`,
          height: `${(finalHeight / containerHeight) * 100}%`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: color,
          border: `2px solid ${borderColor}`,
          borderRadius: '4px',
          opacity: isSelected ? 0.9 : 0.7,
          boxShadow: isSelected 
            ? `0 0 0 3px ${borderColor}40, 0 4px 12px rgba(0,0,0,0.3)`
            : '0 2px 4px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => handleHotspotClick(e, hotspot)}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) {
            handleHotspotClick(e as unknown as React.MouseEvent, hotspot);
          }
        }}
      >
        {/* Sign number label */}
        <div 
          className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold"
          style={{
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            fontSize: Math.max(10, Math.min(finalWidth / 4, 14))
          }}
        >
          {hotspot.signNumber}
        </div>
        
        {/* Sign type indicator */}
        {hotspot.signType && (
          <div 
            className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 rounded"
            style={{ fontSize: '10px' }}
          >
            {hotspot.signType}
          </div>
        )}
      </div>
    );
  };

  if (imageError) {
    return (
      <div className={`aspect-[4/3] bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500 p-4">
          <p className="mb-2">📋 Plan image not available</p>
          <p className="text-sm mb-3">Using mock visualization for testing</p>
          <div className="bg-white p-4 rounded border relative">
            {/* Mock plan visualization */}
            <div className="text-xs text-gray-400 absolute top-1 left-1">Mock Site Plan</div>
            {hotspots.map(renderHotspot)}
          </div>
          <p className="text-xs mt-2 text-gray-400">
            Generate image: open test_data/extraction_results/mock_image_generator.html
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
        <button
          onClick={resetZoom}
          className="bg-white shadow-md rounded px-3 py-1 text-sm hover:bg-gray-50 transition-colors"
        >
          Reset Zoom
        </button>
        <div className="bg-white shadow-md rounded px-3 py-1 text-sm">
          {Math.round(transform.scale * 100)}%
        </div>
      </div>

      {/* Loading indicator */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Main viewer container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        {/* Plan image */}
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out"
          style={{
            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
            transformOrigin: 'center center'
          }}
        >
          <Image
            ref={imageRef}
            src={planImageUrl}
            alt="Site plan"
            fill
            className="object-contain"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            draggable={false}
            priority
          />
          
          {/* Hotspots overlay */}
          {imageLoaded && hotspots.map(renderHotspot)}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-40 bg-black bg-opacity-70 text-white text-sm px-3 py-2 rounded">
        <div className="hidden md:block">
          Mouse: Drag to pan, wheel to zoom, double-click to reset
        </div>
        <div className="md:hidden">
          Touch: Drag to pan, pinch to zoom, double-tap to reset
        </div>
      </div>
    </div>
  );
}