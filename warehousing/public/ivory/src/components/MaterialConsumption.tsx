import { useState } from 'react';
import { ArrowLeft, Flame, Package, CheckCircle, AlertCircle, ClipboardList, Wrench } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface MaterialConsumptionProps {
  onBack: () => void;
}

interface WorkOrder {
  woNumber: string;
  product: string;
  productionQty: number;
  productionLine: string;
  status: string;
  requiredMaterials: Array<{
    sku: string;
    name: string;
    qtyPerUnit: number;
    totalRequired: number;
    availableQty: number;
  }>;
}

interface ConsumedMaterial {
  sku: string;
  name: string;
  consumedQty: number;
  requiredQty: number;
}

const mockWorkOrders: Record<string, WorkOrder> = {
  'WO2024001': {
    woNumber: 'WO2024001',
    product: 'Bolt Assembly Unit',
    productionQty: 100,
    productionLine: 'Assembly Line A',
    status: 'In Progress',
    requiredMaterials: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', qtyPerUnit: 2, totalRequired: 200, availableQty: 250 },
      { sku: 'SKU67890', name: 'Washers 10mm', qtyPerUnit: 4, totalRequired: 400, availableQty: 450 },
      { sku: 'SKU11111', name: 'Nuts M8', qtyPerUnit: 2, totalRequired: 200, availableQty: 150 },
    ],
  },
  'WO2024002': {
    woNumber: 'WO2024002',
    product: 'Premium Fastener Kit',
    productionQty: 50,
    productionLine: 'Assembly Line B',
    status: 'Ready',
    requiredMaterials: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', qtyPerUnit: 10, totalRequired: 500, availableQty: 250 },
      { sku: 'SKU67890', name: 'Washers 10mm', qtyPerUnit: 10, totalRequired: 500, availableQty: 450 },
    ],
  },
};

export function MaterialConsumption({ onBack }: MaterialConsumptionProps) {
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [consumedMaterials, setConsumedMaterials] = useState<ConsumedMaterial[]>([]);
  const [currentSku, setCurrentSku] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleWOScan = (code: string) => {
    const wo = mockWorkOrders[code];
    if (wo) {
      setSelectedWO(wo);
      setConsumedMaterials([]);
      setCurrentSku('');
      setQuantity('');
      setError('');
    } else {
      setError('Work Order not found');
      setSelectedWO(null);
    }
  };

  const handleMaterialScan = (code: string) => {
    if (!selectedWO) return;

    const material = selectedWO.requiredMaterials.find(m => m.sku === code);
    if (material) {
      setCurrentSku(code);
      setError('');
    } else {
      setError('Material not required for this work order');
      setCurrentSku('');
    }
  };

  const handleConfirmQty = () => {
    if (!selectedWO || !currentSku) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    const material = selectedWO.requiredMaterials.find(m => m.sku === currentSku);
    if (!material) return;

    // Check if already consumed
    const existingIndex = consumedMaterials.findIndex(m => m.sku === currentSku);
    const currentConsumed = existingIndex >= 0 ? consumedMaterials[existingIndex].consumedQty : 0;
    const newTotal = currentConsumed + qty;

    // Validate against available quantity
    if (newTotal > material.availableQty) {
      setError(`Only ${material.availableQty} units available. Already consumed: ${currentConsumed}`);
      return;
    }

    // Update consumed materials
    if (existingIndex >= 0) {
      const updated = [...consumedMaterials];
      updated[existingIndex].consumedQty = newTotal;
      setConsumedMaterials(updated);
    } else {
      setConsumedMaterials([
        ...consumedMaterials,
        {
          sku: currentSku,
          name: material.name,
          consumedQty: qty,
          requiredQty: material.totalRequired,
        },
      ]);
    }

    setCurrentSku('');
    setQuantity('');
    setError('');
  };

  const handleFinalConfirm = () => {
    setShowConfirmation(true);
    setTimeout(() => {
      setSelectedWO(null);
      setConsumedMaterials([]);
      setShowConfirmation(false);
    }, 3000);
  };

  const getCurrentMaterial = () => {
    if (!selectedWO || !currentSku) return null;
    return selectedWO.requiredMaterials.find(m => m.sku === currentSku);
  };

  const currentMaterial = getCurrentMaterial();
  const currentConsumed = consumedMaterials.find(m => m.sku === currentSku)?.consumedQty || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white p-4 sticky top-0 shadow-lg z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Flame className="w-6 h-6" />
            <h2>Material Consumption</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {!selectedWO ? (
          <>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-2">Select Work Order</div>
              <p className="text-gray-600">Scan work order number to start material consumption</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <BarcodeScanner onScan={handleWOScan} placeholder="Scan work order number" />
              <p className="text-gray-500 mt-3">Try: WO2024001 or WO2024002</p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                <div className="text-red-900">{error}</div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-gray-900 mb-1">{selectedWO.woNumber}</div>
                  <p className="text-gray-600">{selectedWO.productionLine}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedWO(null);
                    setConsumedMaterials([]);
                    setError('');
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <div className="text-blue-900">Production Details</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Product:</span>
                    <span className="text-blue-900">{selectedWO.product}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Quantity:</span>
                    <span className="text-blue-900">{selectedWO.productionQty} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Status:</span>
                    <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-sm">
                      {selectedWO.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900">Required Materials</div>
              </div>

              <div className="space-y-3">
                {selectedWO.requiredMaterials.map((material, index) => {
                  const consumed = consumedMaterials.find(m => m.sku === material.sku);
                  const consumedQty = consumed?.consumedQty || 0;
                  const isComplete = consumedQty >= material.totalRequired;
                  const progress = (consumedQty / material.totalRequired) * 100;

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 ${
                        isComplete
                          ? 'bg-green-50 border-green-200'
                          : consumedQty > 0
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1">{material.name}</div>
                          <p className="text-gray-600">{material.sku}</p>
                        </div>
                        {isComplete && <CheckCircle className="w-6 h-6 text-green-600" />}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Required:</span>
                          <span className="text-gray-900">{material.totalRequired} units</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Consumed:</span>
                          <span className={consumedQty > 0 ? 'text-blue-900' : 'text-gray-500'}>
                            {consumedQty} units
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Available:</span>
                          <span className="text-gray-900">{material.availableQty} units</span>
                        </div>
                        
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isComplete ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {currentMaterial && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-5">
                <div className="text-blue-900 mb-3">Scanned Material</div>
                <div className="text-gray-900 mb-1">{currentMaterial.name}</div>
                <p className="text-gray-600 mb-1">{currentMaterial.sku}</p>
                
                {currentConsumed > 0 && (
                  <p className="text-blue-700 mb-3">
                    Already consumed: {currentConsumed} units
                  </p>
                )}

                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter consumed quantity"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <button
                  onClick={handleConfirmQty}
                  disabled={!quantity}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  Confirm Consumption
                </button>
              </div>
            )}

            {consumedMaterials.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-5">
                <button
                  onClick={handleFinalConfirm}
                  className="w-full bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white py-4 rounded-xl hover:shadow-lg transition-shadow"
                >
                  Complete Consumption Record
                </button>
              </div>
            )}

            {showConfirmation && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="text-green-900 mb-1">Consumption Recorded!</div>
                    <p className="text-green-700">
                      Material consumption has been successfully recorded for {selectedWO.woNumber}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      {selectedWO && !currentMaterial && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
          <div className="max-w-md mx-auto">
            <BarcodeScanner onScan={handleMaterialScan} placeholder="Scan material barcode" autoFocus />
            {error && (
              <p className="text-red-600 mt-2 text-center">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
