import React, { useState, useEffect } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2, Settings, Zap, BarChart3 } from 'lucide-react';

export default function YOLODetectionDemo() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(0.25);
  const [detectionInfo, setDetectionInfo] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');

  // Remove trailing slash from API URL to avoid double slashes
  const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('API Status:', data);
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch (err) {
      console.error('API check failed:', err);
      setApiStatus('offline');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG or PNG)');
      return;
    }

    // Clean up previous URLs
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResultUrl(null);
    setError(null);
    setDetectionInfo(null);
  };

  const handleDetect = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResultUrl(null);
    setDetectionInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log(`Calling API: ${API_URL}/detect-json?confidence=${confidence}`);

      // Use JSON endpoint for reliable data
      const response = await fetch(
        `${API_URL}/detect-json?confidence=${confidence}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Detection response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Detection failed');
      }

      // Set the image from base64
      setResultUrl(data.image_base64);
      
      // Set detection info
      setDetectionInfo({
        found: data.objects_found,
        count: data.detection_count,
        confidence: data.max_confidence,
        time: data.processing_time,
        detections: data.detections || []
      });

      console.log('Detection successful:', {
        found: data.objects_found,
        count: data.detection_count,
        confidence: data.max_confidence,
        time: data.processing_time
      });

    } catch (err) {
      console.error('Detection error:', err);
      setError(err.message || 'An error occurred during detection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // Clean up object URLs
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl && resultUrl.startsWith('blob:')) {
      URL.revokeObjectURL(resultUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
    setDetectionInfo(null);
  };

  const formatConfidence = (conf) => {
    return `${(conf * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <Zap className="w-10 h-10 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              Coyote Detection System
            </h1>
          </div>
          <p className="text-gray-600 text-lg mb-2">
            AI-powered coyote detection using YOLOv8
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className={`px-3 py-1 rounded-full ${apiStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              API: {apiStatus === 'online' ? '✅ Online' : '❌ Offline'}
            </div>
            <div className="text-gray-500">
              Backend: {API_URL.replace('https://', '').replace('http://', '')}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Controls Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* File Upload */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Image
                </label>
                <label className="flex flex-col items-center justify-center w-full px-4 py-8 border-3 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-gray-600 text-center">
                    {selectedFile ? (
                      <span className="font-medium text-blue-600">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="block">Click to select image</span>
                        <span className="text-sm text-gray-500 mt-1">JPEG, PNG up to 10MB</span>
                      </>
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Settings Panel */}
              <div className="flex-1 w-full bg-gray-50 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <Settings className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Detection Settings</h3>
                </div>

                <div className="space-y-6">
                  {/* Confidence Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Confidence Threshold
                      </label>
                      <span className="text-lg font-bold text-blue-600">
                        {confidence.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={confidence}
                      onChange={(e) => setConfidence(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>More sensitive</span>
                      <span>More precise</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Lower values detect more objects, higher values increase accuracy
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      onClick={handleDetect}
                      disabled={!selectedFile || loading || apiStatus !== 'online'}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          Detect Coyotes
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="space-y-4 mb-8">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Detection Results */}
            {detectionInfo && (
              <div className={`p-5 rounded-xl ${detectionInfo.found ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'} animate-fadeIn`}>
                <div className="flex items-start">
                  {detectionInfo.found ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div>
                        <h3 className={`text-xl font-bold ${detectionInfo.found ? 'text-green-800' : 'text-yellow-800'}`}>
                          {detectionInfo.found 
                            ? `🎯 Coyote Detected! (${detectionInfo.count} object${detectionInfo.count > 1 ? 's' : ''})`
                            : '📭 No Coyotes Detected'
                          }
                        </h3>
                        <p className={`text-sm mt-1 ${detectionInfo.found ? 'text-green-700' : 'text-yellow-700'}`}>
                          Processing time: {detectionInfo.time.toFixed(2)} seconds
                        </p>
                      </div>
                      
                      {detectionInfo.found && detectionInfo.detections.length > 0 && (
                        <div className="mt-3 md:mt-0">
                          <div className="flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              Top confidence: {formatConfidence(detectionInfo.confidence)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detection Details */}
                    {detectionInfo.found && detectionInfo.detections.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <h4 className="text-sm font-semibold text-green-800 mb-2">Detection Details:</h4>
                        <div className="space-y-2">
                          {detectionInfo.detections.map((detection, index) => (
                            <div key={index} className="flex items-center justify-between text-sm bg-white/50 p-2 rounded">
                              <span className="font-medium text-gray-700">
                                {detection.class}
                              </span>
                              <span className="font-bold text-green-700">
                                {formatConfidence(detection.confidence)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Image Display */}
          {(previewUrl || resultUrl) && !loading && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original Image */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  Original Image
                </h3>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-inner">
                  <img
                    src={previewUrl}
                    alt="Original"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
              </div>

              {/* Detection Result */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Detection Result
                </h3>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-inner">
                  {resultUrl ? (
                    <img
                      src={resultUrl}
                      alt="Detected"
                      className="w-full h-auto max-h-[500px] object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!previewUrl && !loading && (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-blue-50 rounded-2xl mb-6">
                <Upload className="w-16 h-16 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-3">
                Ready to Detect Coyotes
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Upload an image to analyze it with our AI detection system. 
                The system will identify coyotes and other objects in real-time.
              </p>
              <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Supports JPEG & PNG
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Adjustable confidence
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  Real-time processing
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl mb-6">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-3">
                Analyzing Image
              </h3>
              <p className="text-gray-500 mb-6">
                Processing your image with YOLOv8 AI model...
              </p>
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                This usually takes 5-10 seconds depending on image size
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-sm">
            Powered by YOLOv8 | FastAPI Backend | React Frontend
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Confidence threshold adjusts detection sensitivity. Lower values detect more objects but may include false positives.
          </p>
        </div>
      </div>

      {/* Add CSS for animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Log the URL for debugging
      console.log(`Calling: ${API_URL}/detect?confidence=${confidence}`);

      const response = await fetch(
        `${API_URL}/detect?confidence=${confidence}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Log response details for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:');
      Array.from(response.headers.entries()).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Detection failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Received blob size:', blob.size, 'type:', blob.type);
      
      if (blob.size === 0) {
        console.warn('Received empty blob - using original image as fallback');
        setResultUrl(previewUrl);
      } else {
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
      }

      // Get all headers from backend
      const objectsFound = response.headers.get('X-Objects-Found');
      const detections = response.headers.get('X-Detections');
      const confidenceScore = response.headers.get('X-Confidence-Score');
      const processingTime = response.headers.get('X-Processing-Time');

      console.log('Parsed headers:', {
        objectsFound,
        detections,
        confidenceScore,
        processingTime
      });

      setDetectionInfo({
        found: objectsFound === 'true',
        count: detections || '0',
        confidence: confidenceScore ? parseFloat(confidenceScore) : 0,
        time: processingTime ? parseFloat(processingTime) : 0
      });

    } catch (err) {
      console.error('Detection error:', err);
      setError(err.message || 'An error occurred during detection');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
    setDetectionInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Coyote Detection System
          </h1>
          <p className="text-slate-600 text-lg">
            Upload an image to detect coyotes using YOLOv8
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Backend: {API_URL}
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Controls */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              {/* File Upload */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Image
                </label>
                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-slate-500" />
                  <span className="text-slate-600">
                    {selectedFile ? selectedFile.name : 'Choose file'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Confidence Slider */}
              <div className="flex-1 w-full">
                <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                  <Settings className="w-4 h-4 mr-1" />
                  Confidence Threshold: {confidence.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Low (0.0)</span>
                  <span>High (1.0)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDetect}
                  disabled={!selectedFile || loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Detect Coyotes'
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
              <div className="text-red-800">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Detection Results */}
          {detectionInfo && (
            <div className={`mb-6 p-4 ${detectionInfo.found ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg flex items-start`}>
              {detectionInfo.found ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <div className={detectionInfo.found ? 'text-green-800' : 'text-yellow-800'}>
                <p className="font-medium">
                  {detectionInfo.found 
                    ? `✅ Coyote Detected! (${detectionInfo.count} object${detectionInfo.count > 1 ? 's' : ''})`
                    : '⚠️ No Coyotes Detected'
                  }
                </p>
                {detectionInfo.found ? (
                  <div className="text-sm mt-1 space-y-1">
                    <p>Confidence: {(detectionInfo.confidence * 100).toFixed(1)}%</p>
                    <p>Processing time: {detectionInfo.time.toFixed(2)} seconds</p>
                  </div>
                ) : (
                  <p className="text-sm mt-1">
                    Processing time: {detectionInfo.time.toFixed(2)} seconds
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Image Display */}
          {(previewUrl || resultUrl) && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original Image */}
              {previewUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Original Image
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img
                      src={previewUrl}
                      alt="Original"
                      className="w-full h-auto max-h-[400px] object-contain"
                      onLoad={() => console.log('Original image loaded')}
                      onError={(e) => console.error('Error loading original:', e)}
                    />
                  </div>
                </div>
              )}

              {/* Detection Result */}
              {resultUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Detection Result
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img
                      src={resultUrl}
                      alt="Detected"
                      className="w-full h-auto max-h-[400px] object-contain"
                      onLoad={() => console.log('Result image loaded')}
                      onError={(e) => {
                        console.error('Error loading result:', e);
                        // Fallback to original image if result fails to load
                        setResultUrl(previewUrl);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!previewUrl && !loading && (
            <div className="text-center py-16 text-slate-400">
              <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Upload an image to detect coyotes</p>
              <p className="text-sm mt-2">Supported formats: JPEG, PNG</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="text-lg text-slate-600">Analyzing image for coyotes...</p>
              <p className="text-sm text-slate-500 mt-2">
                This may take a few seconds
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>Powered by YOLOv8 | FastAPI Backend + React Frontend</p>
          <p className="mt-1">Confidence threshold adjusts detection sensitivity</p>
        </div>
      </div>
    </div>
  );
}
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `${API_URL}/detect?confidence=${confidence}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);

      const detections = response.headers.get('X-Detections');
      const processingTime = response.headers.get('X-Processing-Time');
      
      setDetectionInfo({
        count: detections || '0',
        time: processingTime || '0'
      });

    } catch (err) {
      setError(err.message || 'An error occurred during detection');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
    setDetectionInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            YOLOv8 Object Detection
          </h1>
          <p className="text-slate-600 text-lg">
            Upload an image to detect objects with YOLOv8-nano
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Controls */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              {/* File Upload */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Image
                </label>
                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-slate-500" />
                  <span className="text-slate-600">
                    {selectedFile ? selectedFile.name : 'Choose file'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Confidence Slider */}
              <div className="flex-1 w-full">
                <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                  <Settings className="w-4 h-4 mr-1" />
                  Confidence: {confidence.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDetect}
                  disabled={!selectedFile || loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing
                    </>
                  ) : (
                    'Detect'
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

          {/* Success Info */}
          {detectionInfo && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-green-800">
                <p className="font-medium">Detection Complete</p>
                <p className="text-sm mt-1">
                  Found {detectionInfo.count} object(s) in {parseFloat(detectionInfo.time).toFixed(2)}s
                </p>
              </div>
            </div>
          )}

          {/* Image Display */}
          {(previewUrl || resultUrl) && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original Image */}
              {previewUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Original Image
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img
                      src={previewUrl}
                      alt="Original"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {/* Detection Result */}
              {resultUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Detection Result
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img
                      src={resultUrl}
                      alt="Detected"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
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
          <p>Powered by YOLOv8-nano | FastAPI + React</p>
        </div>
      </div>
    </div>
  );
}
