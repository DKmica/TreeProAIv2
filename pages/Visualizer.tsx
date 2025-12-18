import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, Undo2, Trash2, Wand2, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  brushSize: number;
}

const Visualizer: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setProcessedImage(null);
        setStrokes([]);
        setShowComparison(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImage(event.target?.result as string);
          setProcessedImage(null);
          setStrokes([]);
          setShowComparison(false);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  useEffect(() => {
    if (image && canvasRef.current && maskCanvasRef.current) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        const canvas = canvasRef.current!;
        const maskCanvas = maskCanvasRef.current!;
        
        const maxWidth = containerRef.current?.clientWidth || 800;
        const maxHeight = 500;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        maskCanvas.width = width;
        maskCanvas.height = height;
        
        drawCanvas();
      };
      img.src = image;
    }
  }, [image]);

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    [...strokes, { points: currentStroke, brushSize }].forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      ctx.lineWidth = stroke.brushSize;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      
      stroke.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, stroke.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    
    ctx.globalAlpha = 1;
  }, [strokes, currentStroke, brushSize]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (coords) {
      setIsDrawing(true);
      setCurrentStroke([coords]);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (coords) {
      setCurrentStroke(prev => [...prev, coords]);
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentStroke.length > 0) {
      setStrokes(prev => [...prev, { points: currentStroke, brushSize }]);
      setCurrentStroke([]);
    }
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
    setProcessedImage(null);
    setShowComparison(false);
  };

  const handleClear = () => {
    setStrokes([]);
    setProcessedImage(null);
    setShowComparison(false);
  };

  const generateMask = (): string | null => {
    if (!maskCanvasRef.current || !canvasRef.current) return null;
    
    const maskCanvas = maskCanvasRef.current;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    strokes.forEach(stroke => {
      if (stroke.points.length === 0) return;
      
      ctx.lineWidth = stroke.brushSize;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      
      stroke.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, stroke.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    
    return maskCanvas.toDataURL('image/png');
  };

  const handleGeneratePreview = async () => {
    if (strokes.length === 0) {
      alert('Please mark the areas you want to trim first by painting on the image.');
      return;
    }
    
    setIsProcessing(true);
    
    const mask = generateMask();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (canvasRef.current && imageRef.current) {
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = canvasRef.current.width;
      resultCanvas.height = canvasRef.current.height;
      const ctx = resultCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(imageRef.current, 0, 0, resultCanvas.width, resultCanvas.height);
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 0.7;
        
        strokes.forEach(stroke => {
          if (stroke.points.length === 0) return;
          
          ctx.lineWidth = stroke.brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
          
          stroke.points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, stroke.brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
          });
        });
        
        ctx.globalCompositeOperation = 'destination-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
        
        setProcessedImage(resultCanvas.toDataURL('image/png'));
        setShowComparison(true);
      }
    }
    
    setIsProcessing(false);
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSlider(true);
  };

  const handleSliderMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingSlider || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    const position = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  }, [isDraggingSlider]);

  const handleSliderUp = useCallback(() => {
    setIsDraggingSlider(false);
  }, []);

  useEffect(() => {
    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleSliderMove);
      window.addEventListener('mouseup', handleSliderUp);
      window.addEventListener('touchmove', handleSliderMove);
      window.addEventListener('touchend', handleSliderUp);
      
      return () => {
        window.removeEventListener('mousemove', handleSliderMove);
        window.removeEventListener('mouseup', handleSliderUp);
        window.removeEventListener('touchmove', handleSliderMove);
        window.removeEventListener('touchend', handleSliderUp);
      };
    }
  }, [isDraggingSlider, handleSliderMove, handleSliderUp]);

  const handleDownload = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.download = 'tree-trim-preview.png';
    link.href = processedImage;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tree Trim Visualizer</h1>
            <p className="text-gray-600 mt-1">
              Upload a photo and paint over the areas you want to trim. Then generate a preview to show your customer.
            </p>
          </div>

          {!image ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload a Tree Photo</h3>
                  <p className="text-gray-500 text-sm mt-1">Take a photo or select from your gallery</p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleCameraCapture}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    Take Photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Upload File
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setImage(null);
                      setProcessedImage(null);
                      setStrokes([]);
                      setShowComparison(false);
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    New Photo
                  </button>
                </div>
                
                {!showComparison && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Brush:</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-24 accent-emerald-600"
                      />
                      <span className="text-sm text-gray-500 w-8">{brushSize}px</span>
                    </div>
                    
                    <button
                      onClick={handleUndo}
                      disabled={strokes.length === 0}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Undo"
                    >
                      <Undo2 className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleClear}
                      disabled={strokes.length === 0}
                      className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Clear All"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div 
                ref={containerRef}
                className="relative bg-gray-100 rounded-lg overflow-hidden"
                style={{ minHeight: '300px' }}
              >
                {showComparison && processedImage ? (
                  <div className="relative w-full flex items-center justify-center" style={{ height: canvasRef.current?.height || 400 }}>
                    <div className="relative" style={{ width: canvasRef.current?.width || '100%', height: canvasRef.current?.height || 400 }}>
                      <img
                        src={processedImage}
                        alt="After"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      
                      <div
                        className="absolute inset-0"
                        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                      >
                        <img
                          src={image}
                          alt="Before"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-lg z-10"
                        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                        onMouseDown={handleSliderMouseDown}
                        onTouchStart={() => setIsDraggingSlider(true)}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                          <ChevronLeft className="w-4 h-4 text-gray-600 -mr-1" />
                          <ChevronRight className="w-4 h-4 text-gray-600 -ml-1" />
                        </div>
                      </div>
                      
                      <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded z-10">
                        Before
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded z-10">
                        After
                      </div>
                    </div>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    className="block mx-auto cursor-crosshair touch-none"
                    style={{ maxWidth: '100%' }}
                  />
                )}
                
                <canvas ref={maskCanvasRef} className="hidden" />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {showComparison ? (
                  <>
                    <button
                      onClick={() => setShowComparison(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Edit Mask
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Download Preview
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleGeneratePreview}
                    disabled={isProcessing || strokes.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Generate Trim Preview
                      </>
                    )}
                  </button>
                )}
              </div>

              {!showComparison && strokes.length === 0 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  Paint over the branches or foliage you want to remove, then click "Generate Trim Preview"
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800">Preview Mode</h3>
          <p className="text-amber-700 text-sm mt-1">
            This tool creates a simple visualization by removing the marked areas. For photorealistic AI-generated previews, 
            integration with image generation APIs (like Stability AI or similar) can be added in the future.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
