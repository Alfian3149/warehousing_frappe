import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, MapPin, CheckCircle, Package, ClipboardList, TrendingUp, Calendar } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { postToFrappe } from '../services/frappeService';
interface MaterialPickingProps {
  onBack: () => void;
}

interface PickingItem {
  keyId: string;
  sku: string;
  name: string;
  um: string;
  lotSerial: string;
  quantity: number;
  receivedQty: number;
  sourceLocation: string;
  sourceRack: string;
  toLocation: string;
}

interface PickedItemDetail {
  keyId: string;
  sku: string;
  name: string;
  lotSerial: string;
  pickedQty: number;
  sourceLocation: string;
  sourceLevel: string;
  destinationRack: string;
  destinationLevel: string;
}

interface PickingOrder {
  orderId: string;
  productionLine: string;
  destination: string;
  status: string;
  neededDate: Date;
  priority: 'High' | 'Medium' | 'Low';
  items: PickingItem[];
}

/* const mockPickingOrders: PickingOrder[] = [
  {
    orderId: 'PICK2024001',
    productionLine: 'Assembly Line A',
    neededDate: new Date(),
    priority: 'High',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 50, sourceLocation: 'A-1-01', sourceRack: 'RACK001' },
      { sku: 'SKU67890', name: 'Washers 10mm', quantity: 100, sourceLocation: 'A-1-01', sourceRack: 'RACK001' },
      { sku: 'SKU11111', name: 'Nuts M8', quantity: 50, sourceLocation: 'A-1-02', sourceRack: 'RACK002' },
    ],
  },
  {
    orderId: 'PICK2024002',
    productionLine: 'Assembly Line B',
    priority: 'Medium',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 30, sourceLocation: 'A-1-01', sourceRack: 'RACK001' },
      { sku: 'SKU22222', name: 'Screws M6', quantity: 75, sourceLocation: 'B-2-03', sourceRack: 'RACK005' },
    ],
  },
  {
    orderId: 'PICK2024003',
    productionLine: 'Assembly Line C',
    priority: 'Low',
    items: [
      { sku: 'SKU33333', name: 'Anchors 8mm', quantity: 120, sourceLocation: 'C-3-01', sourceRack: 'RACK010' },
    ],
  },
];
 */
type ViewState = 'list' | 'picking' | 'qty-input' | 'rack-input' | 'level-input' | 'summary';

export function MaterialPicking({ onBack }: MaterialPickingProps) {
  const [view, setView] = useState<ViewState>('list');
  const [order, setOrder] = useState<PickingOrder | null>(null);
  const [mockOrders, setMockOrders] = useState<PickingOrder[]>([]);
  const [pickedItems, setPickedItems] = useState<PickedItemDetail[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPick, setCurrentPick] = useState<{
    qty: string;
    rack: string;
    level: string;
  }>({ qty: '', rack: '', level: '' });
  const [error, setError] = useState('');

  useEffect(() => {

    const fetchTask = async () => {
      const getFrappe = () => (window as any).frappe;
      const user = getFrappe()?.session?.user;
      const res = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_task.warehouse_task.get_picklist_outstanding_tasks?user=${user}`);
      const data = await res.json();
      
      setMockOrders(data.message || []);
      console.log(data.message);
    };
    fetchTask();
  }, []);

  const handleSelectOrder = (selectedOrder: PickingOrder) => {
    setOrder(selectedOrder);
    setView('picking');
    setPickedItems([]);
    setCurrentItemIndex(null);
    setError('');

    console.log(pickedItems);
  };

  const handleItemScan = (code: string) => {
    if (!order) return;

    // Parse barcode format: ITEM#LOTSERIAL
    const parts = code.split('#');
    if (parts.length !== 2) {
      setError('Invalid barcode format. Expected: ITEM#LOTSERIAL');
      return;
    }
    
    const [itemCode, lotSerial] = parts;

  const itemIndex = order.items.findIndex(item =>  item.sku === itemCode && item.lotSerial === lotSerial);
    if (itemIndex !== -1) {
      // Check if already picked
      const alreadyPicked = pickedItems.some(p => p.sku === code);
      if (alreadyPicked) {
        setError('Item already picked');
        return;
      }

      setCurrentItemIndex(itemIndex);
      setView('qty-input');
      setError('');
    } else {
      setError('Item not found in picking list');
    }
  };

  const handleQuantitySubmit = () => {
    if (currentItemIndex === null || !order) return;
    ;
    const qty = parseFloat(currentPick.qty);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (qty > order.items[currentItemIndex].quantity) {
      setError(`Quantity exceeds required amount (${order.items[currentItemIndex].quantity})`);
      return;
    }
    setView('summary');
    //setView('rack-input');
    setError('');
  };

  const handleRackSubmit = () => {
    if (!currentPick.rack.trim()) {
      setError('Please enter rack position');
      return;
    }

    setView('level-input');
    setError('');
  };

  const handleLevelSubmit = () => {
    if (!currentPick.level.trim()) {
      setError('Please enter rack level');
      return;
    }

    setView('summary');
    setError('');
  };

  const handleConfirmPick = async () => {
    if (currentItemIndex === null || !order) return;

    setLoading(true);
    const item = order.items[currentItemIndex];
    const newPickedItem: PickedItemDetail = {
      keyId: item.keyId,
      sku: item.sku,
      name: item.name,
      lotSerial: item.lotSerial,
      sourceLocation: currentPick.rack,
      sourceLevel: currentPick.level,
      pickedQty: parseFloat(currentPick.qty),
      destinationRack: item.toLocation,
      destinationLevel: '', // Assuming destination level is not provided in the current flow
    };

    try {
      // 1. Kirim ke server
      await postToFrappe('warehousing.warehousing.doctype.warehouse_task.warehouse_task.picked_confirm', newPickedItem);

      // 2. Update local state segera
      const updatedPickedItems = [...pickedItems, newPickedItem];
      setPickedItems(updatedPickedItems);

      // Reset current pick
      setCurrentPick({ qty: '', rack: '', level: '' });
      setCurrentItemIndex(null);

      // 3. Cek apakah ini item terakhir
      if (updatedPickedItems.length >= order.items.length) {
        // Ambil ulang data dari server agar list di halaman depan (ViewState 'list') terupdate
        const getFrappe = () => (window as any).frappe;
        const user = getFrappe()?.session?.user;
        const res = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_task.warehouse_task.get_picklist_outstanding_tasks?user=${user}`);
        const data = await res.json();
        setMockOrders(data.message || []);
        // ----------------------------

        // All items picked, go back to order list
        setView('list');
        setOrder(null);
        setPickedItems([]);
      } else {
        // More items to pick, go back to picking list
        setView('picking');
      }
    } 
    catch (err) {
      console.error(err);
      setError(err);
    }

  };

  const handleBackToList = () => {
    setView('list');
    setOrder(null);
    setPickedItems([]);
    setCurrentItemIndex(null);
    setCurrentPick({ qty: '', rack: '', level: '' });
    setError('');
  };

  const handleCancelInput = () => {
    setView('picking');
    setCurrentItemIndex(null);
    setCurrentPick({ qty: '', rack: '', level: '' });
    setError('');
  };

  const totalItems = order?.items.length ?? 0;
  const progress = totalItems > 0 ? (pickedItems.length / totalItems) * 100 : 0;

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
          <button onClick={view === 'list' ? onBack : handleBackToList} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingCart className="w-6 h-6" />
            <h2>Material Picking</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {view === 'list' ? (
          <>
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-blue-900 font-medium">Select Picking Order</div>
                  <p className="text-blue-700 text-sm">Choose a pick list to start picking</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {mockOrders.map((po, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectOrder(po)}
                  className="w-full bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-all text-left border-2 border-transparent hover:border-blue-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium text-lg mb-1">{po.orderId}</div>
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Need Date : {po.neededDate}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(po.priority)}`}>
                        {po.priority}
                      </div>
                      <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {po.items.length} item{po.items.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600">Items:</div>
                    <div className="mt-2 space-y-1">
                      {po.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="text-sm text-gray-700 flex justify-between">
                          <span>• {item.name}</span>
                          <span className="text-gray-500">{item.quantity} {item.um}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : view === 'picking' && order ? (
          <>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                <div className="text-red-900">{error}</div>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 font-medium mb-4">Picking Progress</div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Number:</span>
                  <span className="text-gray-900 font-medium">{order.orderId}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900 font-medium">{pickedItems.length} / {totalItems}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900 font-medium">Picking List</div>
              </div>
              
              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const isPicked = pickedItems.some(p => p.sku === item.sku && p.lotSerial === item.lotSerial);
                  return (
                    <div 
                      key={index}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isPicked 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="text-gray-900 font-medium mb-1">{item.name}</div>
                          <p className="text-gray-600 text-sm">Item : {item.sku}</p>
                          <p className="text-gray-600 text-sm">Lot/Serial : {item.lotSerial}</p>
                        </div>
                        {isPicked ? (
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
                          <span className="text-gray-600">{item.sourceRack} ({item.sourceLocation})</span>
                        </div>
                      </div>

                      {isPicked && (
                        <div className="mt-3 pt-3 border-t border-green-300">
                          <div className="text-sm text-green-700">
                            Destination: {pickedItems.find(p => p.sku === item.sku && p.lotSerial === item.lotSerial)?.destinationRack} {pickedItems.find(p => p.sku === item.sku && p.lotSerial === item.lotSerial)?.destinationLevel}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : view === 'qty-input' && currentItemIndex !== null && order ? (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-5">
            <div className="text-blue-900 font-medium mb-3">Enter Quantity</div>
            <div className="text-gray-900 font-medium mb-1">{order.items[currentItemIndex].name}</div>
            <p className="text-gray-600 text-sm mb-3">Item : {order.items[currentItemIndex].sku}</p>
            <p className="text-gray-600 text-sm mb-3">Lot/Serial : {order.items[currentItemIndex].lotSerial}</p>
            
            <div className="mb-4 p-3 bg-white rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Required Quantity</div>
              <div className="text-gray-900 font-medium">{order.items[currentItemIndex].quantity.toLocaleString('id-ID')} {order.items[currentItemIndex].um}</div>
            </div>
            
            <input
              type="number"
              value={currentPick.qty}
              onChange={(e) => setCurrentPick({ ...currentPick, qty: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleQuantitySubmit()}
              placeholder="Enter picked quantity"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            
            {error && (
              <p className="text-red-600 mb-3 text-sm">{error}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelInput}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuantitySubmit}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        ) : view === 'rack-input' && currentItemIndex !== null && order ? (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-5">
            <div className="text-blue-900 font-medium mb-3">Enter Destination Rack Position</div>
            <div className="text-gray-900 font-medium mb-1">{order.items[currentItemIndex].name}</div>
            <p className="text-gray-600 text-sm mb-3">Item: {order.items[currentItemIndex].sku}</p>
            <p className="text-gray-600 text-sm mb-3">Lot/Serial: {order.items[currentItemIndex].lotSerial}</p>
            <p className="text-gray-600 text-sm mb-3">From Location: {order.items[currentItemIndex].sourceLocation}</p>
            
            <div className="mb-4 p-3 bg-white rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Picked Quantity</div>
              <div className="text-gray-900 font-medium">{parseFloat(currentPick.qty).toLocaleString('id-ID')} {order.items[currentItemIndex].um}</div>
            </div>
            
            <input
              type="text"
              value={currentPick.rack}
              onChange={(e) => setCurrentPick({ ...currentPick, rack: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleRackSubmit()}
              placeholder="Enter picked location "
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            
            {error && (
              <p className="text-red-600 mb-3 text-sm">{error}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelInput}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRackSubmit}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        ) : view === 'level-input' && currentItemIndex !== null && order ? (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-5">
            <div className="text-blue-900 font-medium mb-3">Enter Rack Level</div>
            <div className="text-gray-900 font-medium mb-1">{order.items[currentItemIndex].name}</div>
            <p className="text-gray-600 text-sm mb-3">SKU: {order.items[currentItemIndex].sku}</p>
            
            <div className="mb-4 space-y-2">
              <div className="p-3 bg-white rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Picked Quantity</div>
                <div className="text-gray-900 font-medium">{parseFloat(currentPick.qty).toLocaleString('id-ID')} units</div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-sm text-gray-600 mb-1">From Rack</div>
                <div className="text-gray-900 font-medium">{currentPick.rack}</div>
              </div>
            </div>
            
            <input
              type="text"
              value={currentPick.level}
              onChange={(e) => setCurrentPick({ ...currentPick, level: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleLevelSubmit()}
              placeholder="Enter level (e.g., 01, 02, 03)"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            
            {error && (
              <p className="text-red-600 mb-3 text-sm">{error}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelInput}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLevelSubmit}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        ) : view === 'summary' && currentItemIndex !== null && order ? (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
            <div className="text-green-900 font-medium mb-3">Confirm Picking Details</div>
            
            <div className="bg-white rounded-xl p-4 mb-4 space-y-3">
              <div>
                {/* <div className="text-sm text-gray-600 mb-1">Item</div> */}
                <div className="text-gray-900 font-medium">{order.items[currentItemIndex].name}</div>
                <div className="text-gray-600 text-sm  grid grid-cols-2 gap-3">
                  <span>Item: {order.items[currentItemIndex].sku}</span> 
                  <span>Lot/Serial : {order.items[currentItemIndex].lotSerial}</span></div>
              </div>
              
              <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Picked Quantity</div>
                  <div className="text-gray-900 font-medium">{parseFloat(currentPick.qty).toLocaleString('id-ID')} {order.items[currentItemIndex].um}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Required Quantity</div>
                  <div className="text-gray-900 font-medium">{order.items[currentItemIndex].quantity.toLocaleString('id-ID')} {order.items[currentItemIndex].um}</div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-1">From Location</div>
                <div className="text-gray-900 font-medium"> {order.items[currentItemIndex].sourceLocation}</div>
              </div>
            </div>
            
            <button
              onClick={handleConfirmPick}
              disabled={loading} // Cegah klik jika sedang loading
              className={`w-full py-3 rounded-xl transition-colors font-medium ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' // Warna abu-abu jika loading
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : 'Confirm Pick'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Fixed Scanner at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
        <div className="max-w-md mx-auto">
          {view === 'picking' && order ? (
            <>
              <BarcodeScanner onScan={handleItemScan} placeholder="Scan item barcode" autoFocus />
              {/* <p className="text-gray-500 mt-2 text-center text-sm">Scan items from the picking list above</p> */}
            </>
          ) : view === 'list' ? (
            <div className="text-center text-gray-500 py-3">
              Select a picking order above to begin
            </div>
          ) : (
            <div className="text-center text-gray-500 py-3">
              Complete the form above to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
