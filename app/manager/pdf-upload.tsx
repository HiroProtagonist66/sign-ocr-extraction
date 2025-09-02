'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface PDFUploadProps {
  onUploadComplete?: (pageCount: number) => void;
  siteName?: string;
}

export default function PDFUpload({ onUploadComplete, siteName = 'ATL06' }: PDFUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setStatusMessage('Please select a PDF file');
      setUploadStatus('error');
      return;
    }

    await processFile(file);
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('uploading');
    setStatusMessage('Uploading PDF...');
    setProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('siteName', siteName);
      formData.append('dpi', '150');

      // Upload to API endpoint
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadStatus('processing');
      setStatusMessage('Converting PDF to images...');
      setProgress(50);

      // Poll for conversion status
      const result = await response.json();
      
      if (result.success) {
        setPageCount(result.pageCount);
        setUploadStatus('success');
        setStatusMessage(`Successfully processed ${result.pageCount} pages`);
        setProgress(100);
        
        if (onUploadComplete) {
          onUploadComplete(result.pageCount);
        }

        // Reload page after 2 seconds to show new images
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      await processFile(file);
    } else {
      setStatusMessage('Please drop a PDF file');
      setUploadStatus('error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const reset = () => {
    setUploadStatus('idle');
    setStatusMessage('');
    setPageCount(0);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Upload PDF Floor Plans</h2>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-400 hover:border-blue-500'}
          ${uploadStatus === 'success' ? 'border-green-500 bg-green-50' : ''}
          ${uploadStatus === 'error' ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        {uploadStatus === 'idle' && (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg mb-2">Drop PDF here or click to browse</p>
            <p className="text-sm text-gray-500 mb-4">PDF will be converted to images for viewing</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={isUploading}
            >
              Select PDF
            </button>
          </>
        )}

        {uploadStatus === 'uploading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-blue-600">{statusMessage}</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {uploadStatus === 'processing' && (
          <>
            <FileText className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <p className="text-lg font-medium text-blue-600">{statusMessage}</p>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 animate-pulse"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {uploadStatus === 'success' && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium text-green-600">{statusMessage}</p>
            <p className="text-sm text-gray-500 mt-2">Reloading page...</p>
          </>
        )}

        {uploadStatus === 'error' && (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg font-medium text-red-600">{statusMessage}</p>
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>

      {/* Upload instructions */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Upload PDF floor plans containing sign locations</li>
          <li>• PDFs will be converted to images (150 DPI)</li>
          <li>• Each page becomes a separate image file</li>
          <li>• Images are stored in /public/plans/{siteName}/</li>
          <li>• Processing may take a few seconds per page</li>
        </ul>
      </div>
    </div>
  );
}