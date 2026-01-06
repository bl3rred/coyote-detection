import React, { useState } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2, Settings } from 'lucide-react';

export default function YOLODetectionDemo() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(0.25);
  const [detectionInfo, setDetectionInfo] = useState(null);

  // Remove trailing slash from API URL
  const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG or PNG)');
      return;
    }

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

      console.log('Sending to:', `${API_URL}/detect-json?confidence=${confidence}`);

      const response = await fetch(
        `${API_URL}/detect-json?confidence=${confidence}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('API Response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Detection failed');
      }

      if (data.image_base64) {
        console.log('Image received, length:', data.image_base64.length);
        setResultUrl(data.image_base64);
      }

      setDetectionInfo({
        found: data.objects_found,
        count: data.detection_count,
        confidence: data.max_confidence,
        time: data.processing_time,
        detections: data.detections || [],
        rawData: data
      });

      console.log('Detection info:', {
        found: data.objects_found,
        count: data.detection_count,
        detections: data.detections
      });

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An error occurred during detection');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl && resultUrl.startsWith('blob:')) {
      URL.revokeObjectURL(resultUrl);
    }
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
    setDetectionInfo(null);
  };

  const formatConfidence = (conf) => {
    return `${(conf * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Object Detection System
          </h1>
          <p className="text-gray-600">
            Upload an image to detect objects using YOLOv8
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Backend: {API_URL.replace('https://', '').replace('http://', '')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Image
                </label>
                <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-gray-500" />
                  <span className="text-gray-600">
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

              <div className="flex-1">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full h-2 bg-gray-200 rounded-lg accent-blue-600"
                />
              </div>

              <div className="flex gap-2 items-end">
                <button
                  onClick={handleDetect}
                  disabled={!selectedFile || loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing
                    </>
                  ) : (
                    'Detect Objects'
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-red-800">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {detectionInfo && (
            <div className={`mb-6 p-4 rounded-lg border ${detectionInfo.found ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center mb-3">
                {detectionInfo.found ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-gray-600 mr-2" />
                )}
                <h3 className={`text-lg font-bold ${detectionInfo.found ? 'text-green-800' : 'text-gray-800'}`}>
                  {detectionInfo.found 
                    ? `Objects Detected (${detectionInfo.count})`
                    : 'No Objects Detected'
                  }
                </h3>
              </div>

              {detectionInfo.detections.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Detection Details:</h4>
                  <div className="space-y-2">
                    {detectionInfo.detections.map((detection, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                        <div>
                          <span className="font-medium text-gray-800">
                            {detection.class}
                          </span>
                          <span className="text-sm text-gray-600 ml-2">
                            Confidence: {formatConfidence(detection.confidence)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="ml-2 font-medium">{detectionInfo.time.toFixed(2)}s</span>
                  </div>
                  {detectionInfo.found && (
                    <div>
                      <span className="text-gray-600">Max Confidence:</span>
                      <span className="ml-2 font-medium text-green-700">
                        {formatConfidence(detectionInfo.confidence)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {(previewUrl || resultUrl) && !loading && (
            <div className="grid md:grid-cols-2 gap-6">
              {previewUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Original Image</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Original"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {resultUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Detection Result</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={resultUrl}
                      alt="Detection Result"
                      className="w-full h-auto"
                      onError={(e) => {
                        console.error('Failed to load result image');
                        e.target.src = previewUrl;
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!previewUrl && !loading && (
            <div className="text-center py-16 text-gray-400">
              <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Upload an image to detect objects</p>
              <p className="text-sm mt-2">Supported formats: JPEG, PNG</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <p className="text-lg text-gray-600">Processing image...</p>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by YOLOv8 Object Detection</p>
        </div>
      </div>
    </div>
  );
}