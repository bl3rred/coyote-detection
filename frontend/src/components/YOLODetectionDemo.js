import React, { useState } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function YOLODetectionDemo() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResultUrl(null);
    setError(null);
    setDetectionResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResultUrl(null);
    setDetectionResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `${API_URL}/detect?confidence=0.25`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const coyoteFound = response.headers.get('X-Coyote-Found') === 'true';
      const confidenceScore = response.headers.get('X-Confidence-Score');

      if (coyoteFound) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setDetectionResult({
          found: true,
          confidence: parseFloat(confidenceScore)
        });
      } else {
        setDetectionResult({
          found: false
        });
      }

    } catch (err) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
    setDetectionResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Coyote Detection
          </h1>
          <p className="text-slate-600 text-lg">
            Upload an image to detect coyotes using YOLOv8
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Controls */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              {/* File Upload */}
              <div className="flex-1">
                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-slate-500" />
                  <span className="text-slate-600">
                    {selectedFile ? selectedFile.name : 'Choose image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing
                    </>
                  ) : (
                    'Analyze'
                  )}
                </button>
                
                {selectedFile && (
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Detection Result Messages */}
          {detectionResult && detectionResult.found && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-green-800">
                <p className="font-medium">Coyote Detected!</p>
                <p className="text-sm mt-1">
                  Confidence: {(detectionResult.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {detectionResult && !detectionResult.found && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
              <XCircle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-amber-800">
                <p className="font-medium">No Coyote Found</p>
                <p className="text-sm mt-1">
                  No coyotes were detected in this image
                </p>
              </div>
            </div>
          )}

          {/* Image Display */}
          {resultUrl && detectionResult?.found && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <img
                src={resultUrl}
                alt="Coyote Detection Result"
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Preview (when no result yet) */}
          {previewUrl && !detectionResult && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Empty State */}
          {!previewUrl && (
            <div className="text-center py-16 text-slate-400">
              <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Upload an image to get started</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>Powered by YOLOv8-nano | Coyote Detection System</p>
        </div>
      </div>
    </div>
  );
}
