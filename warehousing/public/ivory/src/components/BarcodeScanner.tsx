import { useState, useEffect, useRef } from 'react';
import { Scan } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function BarcodeScanner({ onScan, placeholder = 'Scan barcode or enter manually', autoFocus = false }: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleScan = () => {
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue('');
      // Refocus after scan for next barcode
      if (autoFocus && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button
        onClick={handleScan}
        disabled={!inputValue.trim()}
        className="w-full bg-blue-600 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Submit
      </button>
    </div>
  );
}