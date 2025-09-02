'use client';

import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, ChevronRight, Eye, Filter } from 'lucide-react';

interface DetectedAssignment {
  type: string;
  confidence: number;
  patterns?: string[];
}

interface AutoDetectReviewPanelProps {
  suggestions: Record<number, DetectedAssignment>;
  currentPage: number;
  onPageSelect: (page: number) => void;
  onApply: (assignments: Record<number, string>) => void;
  onClose: () => void;
  signTypes: Array<{ sign_type_code: string; description: string }>;
}

export function AutoDetectReviewPanel({
  suggestions,
  currentPage,
  onPageSelect,
  onApply,
  onClose,
  signTypes
}: AutoDetectReviewPanelProps) {
  const [reviewedAssignments, setReviewedAssignments] = useState(suggestions);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Update when suggestions change
  useEffect(() => {
    setReviewedAssignments(suggestions);
  }, [suggestions]);

  // Calculate statistics
  const stats = {
    total: Object.keys(suggestions).length,
    highConfidence: Object.values(suggestions).filter(s => s.confidence > 0.8).length,
    mediumConfidence: Object.values(suggestions).filter(s => s.confidence > 0.5 && s.confidence <= 0.8).length,
    lowConfidence: Object.values(suggestions).filter(s => s.confidence <= 0.5).length
  };

  // Filter suggestions based on confidence
  const filteredSuggestions = Object.entries(reviewedAssignments).filter(([page, s]) => {
    if (filter === 'all') return true;
    if (filter === 'high') return s.confidence > 0.8;
    if (filter === 'medium') return s.confidence > 0.5 && s.confidence <= 0.8;
    if (filter === 'low') return s.confidence <= 0.5;
    return true;
  }).sort(([a], [b]) => Number(a) - Number(b)); // Sort by page number

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'green';
    if (confidence > 0.5) return 'yellow';
    return 'red';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-50 hover:bg-green-100';
    if (confidence > 0.5) return 'bg-yellow-50 hover:bg-yellow-100';
    return 'bg-red-50 hover:bg-red-100';
  };

  return (
    <div className="w-96 bg-white border-l shadow-lg flex flex-col animate-slide-in-right">
      {/* Panel Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Review Auto-Detection
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
          <div className="text-center p-2 bg-green-100 rounded-lg">
            <div className="font-bold text-green-700">{stats.highConfidence}</div>
            <div className="text-xs text-green-600">High</div>
          </div>
          <div className="text-center p-2 bg-yellow-100 rounded-lg">
            <div className="font-bold text-yellow-700">{stats.mediumConfidence}</div>
            <div className="text-xs text-yellow-600">Medium</div>
          </div>
          <div className="text-center p-2 bg-red-100 rounded-lg">
            <div className="font-bold text-red-700">{stats.lowConfidence}</div>
            <div className="text-xs text-red-600">Low</div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === 'high' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            High
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === 'medium' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Medium
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === 'low' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Low
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {filteredSuggestions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No suggestions match the current filter</p>
          </div>
        ) : (
          filteredSuggestions.map(([page, suggestion]) => {
            const isCurrentPage = Number(page) === currentPage;
            const confidenceColor = getConfidenceColor(suggestion.confidence);
            const confidenceBg = getConfidenceBg(suggestion.confidence);

            return (
              <div
                key={page}
                className={`border-b p-3 cursor-pointer transition-all ${confidenceBg} ${
                  isCurrentPage 
                    ? 'border-l-4 border-l-blue-500 bg-blue-50' 
                    : ''
                }`}
                onClick={() => onPageSelect(Number(page))}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Page {page}</span>
                    {isCurrentPage && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPageSelect(Number(page));
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="View page"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Detected type */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Detected:</span>
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {suggestion.type}
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 transition-all ${
                          confidenceColor === 'green' ? 'bg-green-500' :
                          confidenceColor === 'yellow' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${suggestion.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>

                  {/* Patterns found (if any) */}
                  {suggestion.patterns && suggestion.patterns.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Found: {suggestion.patterns.slice(0, 3).join(', ')}
                      {suggestion.patterns.length > 3 && ` +${suggestion.patterns.length - 3} more`}
                    </div>
                  )}

                  {/* Override dropdown */}
                  <select
                    value={reviewedAssignments[Number(page)]?.type || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      setReviewedAssignments(prev => ({
                        ...prev,
                        [page]: { ...prev[Number(page)], type: e.target.value }
                      }));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Type --</option>
                    {signTypes.map(type => (
                      <option key={type.sign_type_code} value={type.sign_type_code}>
                        {type.sign_type_code} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50 space-y-2">
        <div className="text-xs text-gray-600 mb-2">
          Review and modify suggestions above, then apply:
        </div>
        
        <button
          onClick={() => {
            const filtered = Object.entries(reviewedAssignments)
              .filter(([, s]) => s.confidence > 0.8 && s.type)
              .reduce((acc, [page, s]) => ({
                ...acc,
                [page]: s.type
              }), {});
            onApply(filtered);
            onClose();
          }}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          disabled={stats.highConfidence === 0}
        >
          <Check className="w-4 h-4" />
          Apply High Confidence Only ({stats.highConfidence})
        </button>

        <button
          onClick={() => {
            const all = Object.entries(reviewedAssignments)
              .filter(([, s]) => s.type)
              .reduce((acc, [page, s]) => ({
                ...acc,
                [page]: s.type
              }), {});
            onApply(all);
            onClose();
          }}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Apply All Suggestions ({stats.total})
        </button>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}