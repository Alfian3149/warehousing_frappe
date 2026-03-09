import { useState } from 'react';
import { ArrowLeft, ShoppingCart, MapPin, CheckCircle, Package, ClipboardList } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface MaterialPickingProps {
  onBack: () => void;
}

interface PickingOrder {
  orderId: string;
  productionLine: string;
  priority: 'High' | 'Medium' | 'Low';
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    location: string;
    rack: string;
    picked: boolean;
  }>;
}

const mockPickingOrders: Record<string, PickingOrder> = {
  'PICK2024001': {
    orderId: 'PICK2024001',
    productionLine: 'Assembly Line A',
    priority: 'High',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 50, location: 'A-1-01', rack: 'RACK001', picked: false },
      { sku: 'SKU67890', name: 'Washers 10mm', quantity: 100, location: 'A-1-01', rack: 'RACK001', picked: false },
      { sku: 'SKU11111', name: 'Nuts M8', quantity: 50, location: 'A-1-02', rack: 'RACK002', picked: false },
    ],
  },
  'PICK2024002': {
    orderId: 'PICK2024002',
    productionLine: 'Assembly Line B',
    priority: 'Medium',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 30, location: 'A-1-01', rack: 'RACK001', picked: false },
    ],
  },
};

export function MaterialPicking({ onBack }: MaterialPickingProps) {
  const [order, setOrder] = useState<PickingOrder | null>(null);
  const [error, setError] = useState('');

  const handleOrderScan = (code: string) => {
    const orderData = mockPickingOrders[code];
    if (orderData) {
      setOrder(orderData);
      setError('');
    } else {
      setOrder(null);
      setError('Picking order not found');
    }
  };

  const handleItemScan = (code: string) => {
    if (!order) return;

    const itemIndex = order.items.findIndex(item => item.sku === code && !item.picked);
    if (itemIndex !== -1) {
      const updatedOrder = { ...order };
      updatedOrder.items[itemIndex].picked = true;
      setOrder(updatedOrder);
      setError('');
    } else {
      setError('Item not found or already picked');
    }
  };

  const totalItems = order?.items.length ?? 0;
  const pickedItems = order?.items.filter(item => item.picked).length ?? 0;
  const allPicked = totalItems > 0 && pickedItems === totalItems;
  const progress = totalItems > 0 ? (pickedItems / totalItems) * 100 : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-amber-100 text-amber-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white p-4 sticky top-0 shadow-lg z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingCart className="w-6 h-6" />
            <h2>Material Picking</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {error && !order && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
            <div className="text-red-900">{error}</div>
          </div>
        )}

        {order && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-4">Picking Order Details</div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="text-gray-900">{order.orderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Production Line:</span>
                  <span className="text-gray-900">{order.productionLine}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Priority:</span>
                  <span className={`px-3 py-1 rounded-full ${getPriorityColor(order.priority)}`}>
                    {order.priority}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-900">{pickedItems} / {totalItems}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900">Picking List</div>
              </div>
              
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      item.picked 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-gray-900 mb-1">{item.name}</div>
                        <p className="text-gray-600">{item.sku}</p>
                      </div>
                      {item.picked ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">Qty: {item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">{item.rack} ({item.location})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {allPicked && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-green-900 mb-1">Picking Complete!</div>
                    <p className="text-green-700 mb-3">
                      All items have been picked. Ready to deliver to {order.productionLine}.
                    </p>
                    <button className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors">
                      Confirm & Deliver
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
        <div className="max-w-md mx-auto">
          {!order ? (
            <>
              <BarcodeScanner onScan={handleOrderScan} placeholder="Scan picking order (e.g., PICK2024001)" autoFocus />
              <p className="text-gray-500 mt-2 text-center">Try: PICK2024001 or PICK2024002</p>
            </>
          ) : (
            <>
              <BarcodeScanner onScan={handleItemScan} placeholder="Scan item barcode" autoFocus />
              {error && order && (
                <p className="text-red-600 mt-2 text-center">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}