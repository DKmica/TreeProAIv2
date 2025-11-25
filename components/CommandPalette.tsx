import React, { useEffect, useRef } from 'react';
import GlobalSearchEnhanced from './GlobalSearchEnhanced';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl bg-brand-gray-900 border border-brand-gray-800 rounded-2xl shadow-2xl ring-1 ring-brand-cyan-500/30"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray-800">
          <div>
            <p className="text-sm font-semibold text-white">Command Palette</p>
            <p className="text-xs text-brand-gray-400">Search everything across TreeProAI or jump to a workflow</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-gray-300 border border-brand-gray-700 rounded-lg hover:border-brand-gray-500 hover:text-white transition-colors"
          >
            ESC to close
          </button>
        </div>

        <div className="p-4">
          <GlobalSearchEnhanced compact onClose={onClose} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-brand-gray-500">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-brand-gray-800 text-brand-gray-200">⌘ + K</span>
              <span>Open palette</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-brand-gray-800 text-brand-gray-200">↑ ↓</span>
              <span>Navigate results</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-brand-gray-800 text-brand-gray-200">⏎</span>
              <span>Open selection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-brand-gray-800 text-brand-gray-200">Esc</span>
              <span>Close palette</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
