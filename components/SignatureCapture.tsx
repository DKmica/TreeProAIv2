import React, { useEffect, useRef, useState } from 'react';

interface SignatureCaptureProps {
  label?: string;
  onSave: (dataUrl: string) => void;
  clearLabel?: string;
  disabled?: boolean;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({ label = 'Sign below', onSave, clearLabel = 'Clear', disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.strokeStyle = '#111827';
    context.lineWidth = 2;
    context.lineCap = 'round';
  }, []);

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      const touch = event.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const coords = getCoordinates(event);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const endDrawing = () => setIsDrawing(false);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-gray-800">{label}</p>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-brand-gray-500 hover:text-brand-gray-800"
          disabled={disabled}
        >
          {clearLabel}
        </button>
      </div>
      <div className="border border-brand-gray-200 rounded-md bg-white">
        <canvas
          ref={canvasRef}
          width={640}
          height={200}
          className={`w-full touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={disabled || isEmpty}
          onClick={handleSave}
          className="inline-flex items-center px-3 py-2 rounded-md bg-brand-green-600 text-white text-sm font-semibold shadow disabled:opacity-50"
        >
          Save signature
        </button>
      </div>
    </div>
  );
};

export default SignatureCapture;
