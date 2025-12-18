
import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas dimensions based on container size for responsiveness
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 200; // Fixed height

      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = '#334155'; // brand-gray-700
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        setCtx(context);
      }
    }
  }, []);

  const getCoords = (event: MouseEvent | TouchEvent): { x: number, y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    } else { // TouchEvent
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (ctx) {
      const { x, y } = getCoords(event.nativeEvent);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasSignature(true);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    event.preventDefault();
    const { x, y } = getCoords(event.nativeEvent);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (canvasRef.current && ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSignature(false);
    }
  };

  const handleSave = () => {
    if (canvasRef.current && hasSignature) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full h-[200px] bg-brand-gray-100 border border-brand-gray-300 rounded-md cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={clearCanvas}
          className="text-sm font-semibold text-brand-gray-600 py-2 px-4 rounded-md hover:bg-brand-gray-100"
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          disabled={!hasSignature}
          className="rounded-md bg-brand-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-cyan-700 disabled:bg-brand-gray-300 disabled:cursor-not-allowed"
        >
          Confirm & Save Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
