import React, { useState, useEffect} from 'react';
import { ArrowLeft, HandCoins, CheckCircle, Package, ClipboardCheck, XCircle } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { postToFrappe } from '../services/frappeService';
interface MaterialHandoverProps {
  onBack: () => void;
}

interface HandoverItem {
  keyId: string;
  sku: string;
  um: string;
  name: string;
  lotSerial: string;
  quantity: number;
  location: string;
  handedOverQty?: number;
}

interface PickedMaterial {
  orderId: string;
  pickedBy: string;
  pickedDate: string;
  productionLine: string;
  items: HandoverItem[];
  handedOver: boolean;
}

// Mock data - in real app this would come from MaterialPicking
const mockPickedMaterials: PickedMaterial[] = [
  {
    orderId: 'PICK2024001',
    pickedBy: 'John Doe',
    pickedDate: '2024-11-25 09:30',
    productionLine: 'Assembly Line A',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 50, location: 'RACK001' },
      { sku: 'SKU67890', name: 'Washers 10mm', quantity: 100, location: 'RACK001' },
      { sku: 'SKU11111', name: 'Nuts M8', quantity: 50, location: 'RACK002' },
    ],
    handedOver: false,
  },
  {
    orderId: 'PICK2024002',
    pickedBy: 'Jane Smith',
    pickedDate: '2024-11-25 10:15',
    productionLine: 'Assembly Line B',
    items: [
      { sku: 'SKU12345', name: 'Steel Bolts M8', quantity: 30, location: 'RACK001' },
    ],
    handedOver: false,
  },
];

type ViewState = 'list' | 'scanning' | 'qty-confirm' | 'complete';

export function MaterialHandover({ onBack }: MaterialHandoverProps) {
  const [view, setView] = useState<ViewState>('list');
  const [materials, setMaterials] = useState<PickedMaterial[]>(mockPickedMaterials);
  const [selectedOrder, setSelectedOrder] = useState<PickedMaterial | null>(null);
  const [handedOverItems, setHandedOverItems] = useState<HandoverItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [currentQty, setCurrentQty] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    const fetchTask = async () => {
      const getFrappe = () => (window as any).frappe;
      const user = getFrappe()?.session?.user;
      const res = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_task.warehouse_task.get_handover_outstanding_tasks?user=${user}`);
      const data = await res.json();
      
      setMaterials(data.message || []);
      console.log(data.message);
    };
    fetchTask();
  }, []); 

  const handleSelectOrder = (order: PickedMaterial) => {
    setSelectedOrder(order);
    setView('scanning');
    setHandedOverItems([]);
    setCurrentItemIndex(null);
    setError('');
  };

  const handleItemScan =  (code: string) => {
    if (!selectedOrder) return;
    const parts = code.split('#');
    if (parts.length !== 2) {
      setError('Invalid barcode format. Expected: ITEM#LOTSERIAL');
      return;
    }
    const [itemCode, lotSerial] = parts;
    const itemIndex = selectedOrder.items.findIndex(item =>  item.sku === itemCode && item.lotSerial === lotSerial);
    
    if (itemIndex !== -1) {
      // Check if already handed over
      const alreadyHandedOver = handedOverItems.some(item => item.sku === itemCode && item.lotSerial === lotSerial);
      if (alreadyHandedOver) {
        setError('Item already handed over');
        return;
      }

      setLoading(false);
      setCurrentItemIndex(itemIndex);
      setView('qty-confirm');
      setError('');
    } else {
      setError('Item not found in this picking order');
    }
  };

  const handleQuantityConfirm =  () => {
    if (currentItemIndex === null || !selectedOrder) return;
    
    const qty = parseFloat(currentQty);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (qty > selectedOrder.items[currentItemIndex].quantity) {
      setError(`Quantity exceeds picked amount (${selectedOrder.items[currentItemIndex].quantity})`);
      return;
    }
      
    const item = selectedOrder.items[currentItemIndex];
    const handedOverItem: HandoverItem = {
      ...item,
      handedOverQty: qty,
    };

    const updatedHandedOverItems = [...handedOverItems, handedOverItem];
    setHandedOverItems(updatedHandedOverItems);

    // Reset current state
    setCurrentItemIndex(null);
    setCurrentQty('');
    setError('');

    // Check if all items are handed over
    if (updatedHandedOverItems.length >= selectedOrder.items.length) {
      setView('complete');
    } else {
      setView('scanning');
    }
  };

  const handleCompleteHandover = async () => {
    if (!selectedOrder) return;
    setLoading(true);

    console.log(selectedOrder.items);
    try{
        await postToFrappe('warehousing.warehousing.doctype.warehouse_task.warehouse_task.handover_confirm', selectedOrder.items);
        /* const updatedMaterials = materials.map(material => {
          if (material.orderId === selectedOrder.orderId) {
            return { ...material, handedOver: true };
          }
          return material;
        });
        setMaterials(updatedMaterials); */
        const getFrappe = () => (window as any).frappe;
        const user = getFrappe()?.session?.user;
        const res = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_task.warehouse_task.get_handover_outstanding_tasks?user=${user}`);
        const data = await res.json();
        
        setMaterials(data.message || []);

        
    } 
    catch (err) {
      console.error(err);
      setError(err);
    } 
    
    setView('list');
    setSelectedOrder(null);
    setHandedOverItems([]);
    setCurrentItemIndex(null);
    setError('');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedOrder(null);
    setHandedOverItems([]);
    setCurrentItemIndex(null);
    setCurrentQty('');
    setError('');
  };

  const handleCancelInput = () => {
    setView('scanning');
    setCurrentItemIndex(null);
    setCurrentQty('');
    setError('');
  };

  const pendingMaterials = materials.filter(m => !m.handedOver);
  const totalItems = selectedOrder?.items.length ?? 0;
  const progress = totalItems > 0 ? (handedOverItems.length / totalItems) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white p-4 sticky top-0 shadow-lg z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={view === 'list' ? onBack : handleBackToList} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <HandCoins className="w-6 h-6" />
            <h2>Material Handover</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {view === 'list' ? (
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
                  <button
                    key={material.orderId}
                    onClick={() => handleSelectOrder(material)}
                    className="w-full bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-all text-left border-2 border-transparent hover:border-blue-500"
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

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>Picked by: {material.pickedBy}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
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
                  </button>
                ))}
              </div>
            )}
          </>
        ) : view === 'scanning' && selectedOrder ? (
          <>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                <div className="text-red-900">{error}</div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 font-medium mb-4">Handover Details</div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Picklist Number:</span>
                  <span className="text-gray-900 font-medium">{selectedOrder.orderId}</span>
                </div>
                {/* <div className="flex justify-between items-center">
                  <span className="text-gray-600">Production Line:</span>
                  <span className="text-gray-900 font-medium">{selectedOrder.productionLine}</span>
                </div> */}
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900 font-medium">{handedOverItems.length} / {totalItems}</span>
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
                <ClipboardCheck className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900 font-medium">Scan Each Item</div>
              </div>

              <div className="space-y-3">
                {selectedOrder.items.map((item, index) => {
                  const isHandedOver = handedOverItems.some(i => i.sku === item.sku);
                  const handedOverItem = handedOverItems.find(i => i.sku === item.sku);
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isHandedOver
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1">{item.name}</div>
                          <p className="text-gray-600 text-sm">Item : {item.sku}</p>
                          <p className="text-gray-600 text-sm">Lot/Serial : {item.lotSerial}</p>
                        </div>
                      
                        {isHandedOver ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-gray-300" />
                        )}
                        
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Picked Qty: {item.quantity.toLocaleString('id-ID')} {item.um}</span>
                        <span>In Location: {item.location}</span>
                      </div>
                      {isHandedOver && handedOverItem && (
                        <div className="mt-2 pt-2 border-t border-green-300">
                          <div className="text-sm text-green-700">
                            Handed Over: {handedOverItem.handedOverQty} {handedOverItem.um}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : view === 'qty-confirm' && currentItemIndex !== null && selectedOrder ? (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-5">
            <div className="text-blue-900 font-medium mb-3">Confirm Handover Quantity</div>
            <div className="text-gray-900 font-medium mb-1">{selectedOrder.items[currentItemIndex].name}</div>
            <p className="text-gray-600 text-sm mb-3">SKU: {selectedOrder.items[currentItemIndex].sku}</p>
            
            <div className="mb-4 p-3 bg-white rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Picked Quantity</div>
              <div className="text-gray-900 font-medium">{selectedOrder.items[currentItemIndex].quantity.toLocaleString('id-ID')} {selectedOrder.items[currentItemIndex].um}</div>
            </div>
            
            <input
              type="number"
              value={currentQty}
              onChange={(e) => setCurrentQty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuantityConfirm()}
              placeholder="Enter handover quantity"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            
            {error && (
              <p className="text-red-600 mb-3 text-sm">{error}</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelInput}
                className="flex-1 bg-gray-500 text-white py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuantityConfirm}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        ) : view === 'complete' && selectedOrder ? (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <div className="text-green-900 font-medium mb-1">All Items Scanned!</div>
                <p className="text-green-700">Review the handover summary below</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 mb-4 space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">Order Number</div>
                <div className="text-gray-900 font-medium">{selectedOrder.orderId}</div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-1">In location</div>
                <div className="text-gray-900 font-medium">{currentItemIndex !== null ? selectedOrder.items[currentItemIndex]?.location : '-'}</div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Items Handed Over</div>
                <div className="space-y-2">
                  {handedOverItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-900">{item.name}</span>
                      <span className="text-gray-600">{item.handedOverQty?.toLocaleString('id-ID')} {item.um}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
           {/*  <button
              onClick={handleCompleteHandover}
              className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition-colors font-medium"
            >
              Complete Handover
            </button> */}

              <button
              onClick={handleCompleteHandover}
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
              ) : 'Complete Handover'}
            </button>

          </div>
        ) : null}
      </div>

      {/* Fixed Scanner at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
        <div className="max-w-md mx-auto">
          {view === 'scanning' && selectedOrder ? (
            <>
              <BarcodeScanner onScan={handleItemScan} placeholder="Scan item barcode" autoFocus />
              {/* <p className="text-gray-500 mt-2 text-center text-sm">Scan items from the list above</p> */}
            </>
          ) : view === 'list' ? (
            <div className="text-center text-gray-500 py-3">
              Select a handover order above to begin
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
