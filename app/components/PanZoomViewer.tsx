'use client';

import React, { useState, useRef, useEffect, useCallback, WheelEvent, MouseEvent, TouchEvent } from 'react';
import Image from 'next/image';

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

interface PanZoomViewerProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  children?: React.ReactNode;
  onTransformChange?: (transform: ViewTransform) => void;
}

const ZOOM_LEVELS = [1, 1.5, 2, 3, 4, 5];
const MIN_ZOOM = 1;  // Can't zoom out past 100% (viewport size)
const MAX_ZOOM = 5;  // Maximum 500% zoom
const ZOOM_STEP = 0.1;

export default function PanZoomViewer({
  imageSrc,
  imageWidth,
  imageHeight,
  children,
  onTransformChange
}: PanZoomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  
  // Touch handling
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [isTouchPanning, setIsTouchPanning] = useState(false);

  // Update parent when transform changes
  useEffect(() => {
    onTransformChange?.(transform);
  }, [transform, onTransformChange]);

  // Draw minimap
  useEffect(() => {
    if (!minimapRef.current || !containerRef.current) return;
    
    const canvas = minimapRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image outline
    ctx.strokeStyle = '#666';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Calculate viewport position on minimap
    const viewportWidth = containerRect.width / transform.scale;
    const viewportHeight = containerRect.height / transform.scale;
    const viewportX = (-transform.x / transform.scale) * (canvas.width / imageWidth);
    const viewportY = (-transform.y / transform.scale) * (canvas.height / imageHeight);
    
    const minimapViewWidth = (viewportWidth / imageWidth) * canvas.width;
    const minimapViewHeight = (viewportHeight / imageHeight) * canvas.height;
    
    // Draw viewport rectangle
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewportX, viewportY, minimapViewWidth, minimapViewHeight);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(viewportX, viewportY, minimapViewWidth, minimapViewHeight);
  }, [transform, imageWidth, imageHeight]);

  // Zoom functions
  const zoomTo = useCallback((newScale: number, centerX?: number, centerY?: number) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Clamp zoom
    newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    
    // Default to center if no point specified
    const zoomPointX = centerX ?? rect.width / 2;
    const zoomPointY = centerY ?? rect.height / 2;
    
    // Calculate new position to keep zoom point stationary
    const scaleDiff = newScale - transform.scale;
    const newX = transform.x - (zoomPointX - rect.left) * scaleDiff;
    const newY = transform.y - (zoomPointY - rect.top) * scaleDiff;
    
    setTransform({ x: newX, y: newY, scale: newScale });
  }, [transform]);

  const zoomIn = () => zoomTo(transform.scale * 1.2);
  const zoomOut = () => zoomTo(transform.scale / 1.2);
  const resetZoom = () => setTransform({ x: 0, y: 0, scale: 1 });
  
  const fitToScreen = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const scaleX = rect.width / imageWidth;
    const scaleY = rect.height / imageHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to have some padding
    
    setTransform({ x: 0, y: 0, scale });
  };

  // Mouse wheel zoom - simple and direct
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Simple zoom step: scroll up = zoom in, scroll down = zoom out
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = transform.scale + delta;
    
    // Clamp to limits and apply
    const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    
    // Zoom to mouse position
    zoomTo(clampedScale, e.clientX, e.clientY);
  }, [transform, zoomTo]);

  // Pan handling
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    
    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    
    setTransform({
      ...transform,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  }, [isPanning, panStart, transform]);

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    setIsPanning(false);
    e.currentTarget.style.cursor = 'grab';
  };

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    setIsPanning(false);
    e.currentTarget.style.cursor = 'grab';
  };

  // Double click zoom
  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const newScale = e.shiftKey ? transform.scale / 2 : transform.scale * 2;
    zoomTo(newScale, e.clientX, e.clientY);
  };

  // Touch handling for mobile
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Single touch - pan
      setIsTouchPanning(true);
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      setIsTouchPanning(false);
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDistance(distance);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isTouchPanning) {
      // Pan
      const touch = e.touches[0];
      setTransform({
        ...transform,
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y
      });
    } else if (e.touches.length === 2) {
      // Simple pinch zoom - direct mapping, no momentum
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      if (touchStartDistance > 0) {
        const scale = distance / touchStartDistance;
        const newScale = transform.scale * scale;
        
        // Clamp to limits
        const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
        
        // Zoom to center of pinch
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        zoomTo(clampedScale, centerX, centerY);
        setTouchStartDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsTouchPanning(false);
    setTouchStartDistance(0);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      
      switch(e.key) {
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
        case 'ArrowUp':
          setTransform(t => ({ ...t, y: t.y + 50 }));
          break;
        case 'ArrowDown':
          setTransform(t => ({ ...t, y: t.y - 50 }));
          break;
        case 'ArrowLeft':
          setTransform(t => ({ ...t, x: t.x + 50 }));
          break;
        case 'ArrowRight':
          setTransform(t => ({ ...t, x: t.x - 50 }));
          break;
        case 'f':
          fitToScreen();
          break;
        case 'g':
          setShowGrid(g => !g);
          break;
        case 'c':
          setShowCrosshair(c => !c);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom, fitToScreen]);

  return (
    <div className="relative w-full h-full">
      {/* Fit to Screen Button - Top Right Corner */}
      <button
        onClick={() => {
          setTransform({ x: 0, y: 0, scale: 1 });
        }}
        className="absolute top-4 right-4 z-40 bg-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 transition font-medium text-sm"
        title="Reset view to fit screen"
      >
        Fit to Screen
      </button>

      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-30 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={zoomIn}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition"
          title="Zoom In (+ key)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        
        <div className="text-center text-sm font-medium py-1">
          {Math.round(transform.scale * 100)}%
        </div>
        
        <button
          onClick={zoomOut}
          className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition"
          title="Zoom Out (- key)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        
        <hr className="border-gray-300" />
        
        <select
          value={transform.scale}
          onChange={(e) => zoomTo(parseFloat(e.target.value))}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          {ZOOM_LEVELS.map(level => (
            <option key={level} value={level}>
              {Math.round(level * 100)}%
            </option>
          ))}
        </select>
        
        <button
          onClick={fitToScreen}
          className="w-full px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          title="Fit to Screen (F key)"
        >
          Fit
        </button>
        
        <button
          onClick={resetZoom}
          className="w-full px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          title="Reset Zoom (0 key)"
        >
          100%
        </button>
      </div>

      {/* View Options - Moved down to avoid overlap with Fit button */}
      <div className="absolute top-20 right-4 z-30 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showMinimap}
            onChange={(e) => setShowMinimap(e.target.checked)}
            className="rounded"
          />
          Minimap
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="rounded"
          />
          Grid (G)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showCrosshair}
            onChange={(e) => setShowCrosshair(e.target.checked)}
            className="rounded"
          />
          Crosshair (C)
        </label>
      </div>

      {/* Minimap */}
      {showMinimap && (
        <div className="absolute bottom-4 right-4 z-30 bg-white rounded-lg shadow-lg p-2">
          <canvas
            ref={minimapRef}
            width={150}
            height={107}
            className="border border-gray-300"
          />
        </div>
      )}

      {/* Main Viewport */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-gray-200"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid Overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${50 * transform.scale}px ${50 * transform.scale}px`,
              backgroundPosition: `${transform.x}px ${transform.y}px`,
            }}
          />
        )}

        {/* Crosshair */}
        {showCrosshair && (
          <>
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-red-500/50 pointer-events-none z-10 -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 pointer-events-none z-10 -translate-y-1/2" />
          </>
        )}

        {/* Image and Content Container */}
        <div
          ref={imageRef}
          className="absolute origin-top-left"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            width: imageWidth,
            height: imageHeight,
          }}
        >
          <Image
            src={imageSrc}
            alt="Floor Plan"
            width={imageWidth}
            height={imageHeight}
            className="select-none"
            draggable={false}
            priority
          />
          {children}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 z-30 bg-white/90 rounded-lg shadow-lg p-2 text-xs">
        <div className="font-semibold mb-1">Shortcuts:</div>
        <div className="space-y-0.5 text-gray-600">
          <div>+/- : Zoom</div>
          <div>Arrows: Pan</div>
          <div>F: Fit to screen</div>
          <div>0: Reset zoom</div>
          <div>Double-click: Zoom in</div>
          <div>Shift+Double-click: Zoom out</div>
        </div>
      </div>
    </div>
  );
}