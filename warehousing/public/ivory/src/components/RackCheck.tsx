import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Warehouse, MapPin, Package, AlertCircle, CheckCircle, Hash, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface RackCheckProps {
  onBack: () => void;
}

interface LotSerial {
  lotNumber: string;
  quantity: number;
  expiryDate?: string;
  manufactureDate?: string;
}

interface RackItem {
  name: string;
  sku: string;
  totalQuantity: number;
  lotSerials: LotSerial[];
}

interface RackData {
  rackId: string;
  location: string;
  zone: string;
  capacity: number;
  occupied: number;
  items: RackItem[];
}

export const RackCheck: React.FC<RackCheckProps> = ({ onBack }) => {
  const [error, setError] = useState(false);
  const [rackData, setRackData] = useState<RackData | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [scannedRackCode, setScannedRackCode] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [step, setStep] = useState<'scan' | 'level'>('scan');
  const levelInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === 'level' && levelInputRef.current) {
      levelInputRef.current.focus();
    }
  }, [step]);

  const handleRackScan = (barcode: string) => {
    setScannedRackCode(barcode);
    setStep('level');
    setError(false);
    setRackData(null);
  };

  const handleLevelSubmit = () => {
    if (!level.trim()) {
      return;
    }

    const fullLocation = `${scannedRackCode}-${level.padStart(2, '0')}`;
    searchRackLocation(fullLocation);
  };

  const handleLevelKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLevelSubmit();
    }
  };

  const searchRackLocation = async (fullLocation: string) => {
    // Mock database of rack locations
    setLoading(true); // Pastikan Anda menambahkan state [loading, setLoading] = useState(false)
    setError(false);
    setRackData(null);

    try {
      const response = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_location.warehouse_location.get_location_details?location=${fullLocation}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.message) {
        setRackData(data.message);
        setError(false);
        setExpandedItems(new Set());
      } else {
        setError(true);
        setRackData(null);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('scan');
    setScannedRackCode('');
    setLevel('');
    setError(false);
    setRackData(null);
    setExpandedItems(new Set());
  };

  const toggleItemExpansion = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white p-4 sticky top-0 shadow-lg z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Warehouse className="w-6 h-6" />
            <h2>Rack Check</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Step Indicator */}
        {scannedRackCode && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-blue-900 font-medium">Rack Code Scanned</div>
                <p className="text-blue-700 text-lg font-bold">{scannedRackCode}</p>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Reset
              </button>
            </div>
            {step === 'level' && (
              <p className="text-blue-600 text-sm">Now enter the level number below</p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-red-900">Location Not Found</div>
              <p className="text-red-700">The location {scannedRackCode}-{level.padStart(2, '0')} is not in the system.</p>
            </div>
          </div>
        )}

        {rackData && (
          <div className="space-y-4">


            <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
              <div>
                <div className="text-gray-900 mb-3">Location Information</div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Warehouse className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-gray-500">Warehouse</p>
                      <div className="text-gray-900">{rackData.zone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-gray-500">Location</p>
                      <div className="text-gray-900">{rackData.location}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Package className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-gray-500">Capacity</p>
                      <div className="text-gray-900">{rackData.occupied} / {rackData.capacity} {rackData.um_capacity}</div>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${(rackData.occupied / rackData.capacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-gray-900 mb-3">Items in Location</div>
                <div className="space-y-3">
                  {rackData.items.map((item, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleItemExpansion(index)}
                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-gray-900 mb-1">{item.name}</div>
                            <p className="text-gray-500">{item.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 font-medium">{item.totalQuantity} </span>
                            {expandedItems.has(index) ? (
                              <ChevronUp className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Hash className="w-4 h-4" />
                          <span>{item.lotSerials.length} Lot/Serial Number{item.lotSerials.length > 1 ? 's' : ''}</span>
                        </div>
                      </button>
                      
                      {expandedItems.has(index) && (
                        <div className="border-t-2 border-gray-200 bg-white p-3 space-y-2">
                          {item.lotSerials.map((lotSerial, lotIndex) => (
                            <div key={lotIndex} className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-gray-600 text-sm mb-1">Lot/Serial Number</div>
                                  <div className="text-gray-900 font-medium">{lotSerial.lotNumber}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-gray-600 text-sm mb-1">Quantity</div>
                                  <div className="text-blue-700 font-medium">{lotSerial.quantity} {item.um} </div>
                                </div>
                              </div>
                              
                              {(lotSerial.manufactureDate || lotSerial.expiryDate) && (
                                <div className="pt-2 border-t border-blue-200 space-y-1">
                                  {lotSerial.manufactureDate && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Created Date:</span>
                                      <span className="text-gray-900">{lotSerial.manufactureDate}</span>
                                    </div>
                                  )}
                                  {lotSerial.expiryDate && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Expiry Date:</span>
                                      <span className="text-gray-900">{lotSerial.expiryDate}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
        <div className="max-w-md mx-auto">
          {step === 'scan' ? (
            <>
              <BarcodeScanner onScan={handleRackScan} placeholder="Scan rack barcode (e.g., AA01)" autoFocus />
            
            </>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={levelInputRef}
                  type="number"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  onKeyPress={handleLevelKeyPress}
                  placeholder="Enter level (e.g., 1, 5, 10)"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="99"
                />
              </div>
              
              <button
                onClick={handleLevelSubmit}
                disabled={!level.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                Search Location
              </button>
              
              <p className="text-gray-500 text-center text-sm">
                Searching for: {scannedRackCode}-{level ? level.padStart(2, '0') : '__'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
