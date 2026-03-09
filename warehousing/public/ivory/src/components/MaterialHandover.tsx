import { useState } from 'react';
import { ArrowLeft, HandCoins, CheckCircle, Package, User, ClipboardCheck, XCircle } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface MaterialHandoverProps {
  onBack: () => void;
}

interface PickedMaterial {
  orderId: string;
  pickedBy: string;
  pickedDate: string;
  productionLine: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    location: string;
    scanned: boolean;
  }>;
  handedOver: boolean;
}

// This would come from the MaterialPicking component in a real app
const mockPickedMaterials: PickedMaterial[] = [
  {
    orderId: 'PICK2024001',
    pickedBy: 'John Doe',
    pickedDate: '2024-11-25 09:30',
    productionLine: 'Assembly Line A',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 50, location: 'RACK001', scanned: false },
      { sku: 'SKU67890', name: 'Washers 10mm', quantity: 100, location: 'RACK001', scanned: false },
      { sku: 'SKU11111', name: 'Nuts M8', quantity: 50, location: 'RACK002', scanned: false },
    ],
    handedOver: false,
  },
  {
    orderId: 'PICK2024002',
    pickedBy: 'Jane Smith',
    pickedDate: '2024-11-25 10:15',
    productionLine: 'Assembly Line B',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 30, location: 'RACK001', scanned: false },
    ],
    handedOver: false,
  },
];

export function MaterialHandover({ onBack }: MaterialHandoverProps) {
  const [materials, setMaterials] = useState<PickedMaterial[]>(mockPickedMaterials);
  const [selectedOrder, setSelectedOrder] = useState<PickedMaterial | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');

  const handleItemScan = (code: string) => {
    if (!selectedOrder) return;

    const itemIndex = selectedOrder.items.findIndex(item => item.sku === code && !item.scanned);
    
    if (itemIndex !== -1) {
      const updatedMaterials = materials.map(material => {
        if (material.orderId === selectedOrder.orderId) {
          const updatedItems = material.items.map((item, idx) => {
            if (idx === itemIndex) {
              return { ...item, scanned: true };
            }
            return item;
          });
          return { ...material, items: updatedItems };
        }
        return material;
      });

      setMaterials(updatedMaterials);
      setSelectedOrder(updatedMaterials.find(m => m.orderId === selectedOrder.orderId) || null);
      setError('');
    } else {
      const alreadyScanned = selectedOrder.items.find(item => item.sku === code && item.scanned);
      if (alreadyScanned) {
        setError('This item has already been scanned');
      } else {
        setError('Item not found in this picking order');
      }
    }
  };

  const handleConfirmHandover = () => {
    if (!selectedOrder || !receiverName.trim()) return;

    const updatedMaterials = materials.map(material => {
      if (material.orderId === selectedOrder.orderId) {
        return { ...material, handedOver: true };
      }
      return material;
    });

    setMaterials(updatedMaterials);
    setShowConfirmation(true);

    setTimeout(() => {
      setSelectedOrder(null);
      setReceiverName('');
      setShowConfirmation(false);
    }, 2000);
  };

  const pendingMaterials = materials.filter(m => !m.handedOver);
  const allItemsScanned = selectedOrder?.items.every(item => item.scanned) ?? false;
  const scannedCount = selectedOrder?.items.filter(item => item.scanned).length ?? 0;
  const totalCount = selectedOrder?.items.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white p-4 sticky top-0 shadow-lg z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <HandCoins className="w-6 h-6" />
            <h2>Material Handover</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {!selectedOrder ? (
          <>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-2">Picked Materials</div>
              <p className="text-gray-600">Select an order to handover to production team</p>
            </div>

            {pendingMaterials.length === 0 ? (
              <div className="bg-gray-100 rounded-2xl p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-900 mb-1">No Pending Handovers</div>
                <p className="text-gray-600">All picked materials have been handed over</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMaterials.map((material) => (
                  <div
                    key={material.orderId}
                    onClick={() => {
                      setSelectedOrder(material);
                      setError('');
                    }}
                    className="bg-white rounded-2xl shadow-md p-5 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-gray-900 mb-1">{material.orderId}</div>
                        <p className="text-gray-600">{material.productionLine}</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                        {material.items.length} items
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>Picked by: {material.pickedBy}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>Date: {material.pickedDate}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-gray-700 mb-2">Items:</div>
                      {material.items.map((item, idx) => (
                        <div key={idx} className="text-gray-600 py-1">
                          • {item.name} (×{item.quantity})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-gray-900 mb-1">{selectedOrder.orderId}</div>
                  <p className="text-gray-600">{selectedOrder.productionLine}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setError('');
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Picked by:</span>
                  <span className="text-gray-900">{selectedOrder.pickedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="text-gray-900">{selectedOrder.pickedDate}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-blue-900">Scan Progress</span>
                  <span className="text-blue-900">{scannedCount} / {totalCount}</span>
                </div>
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${(scannedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900">Scan Each Item</div>
              </div>

              <div className="space-y-3">
                {selectedOrder.items.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      item.scanned
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-gray-900 mb-1">{item.name}</div>
                        <p className="text-gray-600">{item.sku}</p>
                      </div>
                      {item.scanned ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Quantity: {item.quantity}</span>
                      <span>From: {item.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {allItemsScanned && (
              <div className="bg-white rounded-2xl shadow-md p-5">
                <label className="block text-gray-700 mb-3">Production Team Member Name</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Enter receiver name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d5f73]"
                />

                <button
                  onClick={handleConfirmHandover}
                  disabled={!receiverName.trim()}
                  className="w-full mt-4 bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                >
                  Confirm Handover
                </button>
              </div>
            )}

            {showConfirmation && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="text-green-900 mb-1">Handover Complete!</div>
                    <p className="text-green-700">
                      Materials successfully handed over to {receiverName}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      {selectedOrder && !allItemsScanned && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
          <div className="max-w-md mx-auto">
            <BarcodeScanner onScan={handleItemScan} placeholder="Scan item barcode" autoFocus />
            {error && (
              <p className="text-red-600 mt-2 text-center">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
