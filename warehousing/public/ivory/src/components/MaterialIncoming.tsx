import { useState } from 'react';
import { ArrowLeft, Package, CheckCircle, XCircle, AlertCircle, ClipboardCheck, FileText, Calendar, Building2, MessageSquare } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import React, { useEffect } from 'react';
import { postToFrappe } from '../services/frappeService';

interface MaterialIncomingProps {
  onBack: () => void;
}

interface IncomingItem {
  keyId: string;
  sku: string;
  um?: string;
  name: string;
  lotSerial?: string;
  expectedQty: number;
  receivedQty: number;
  fromLocation: string;
  toLocation: string;
  verified: boolean;
  discrepancyReason?: string;
  discrepancyReasonDesc?: string;
}

interface LotDetails {
  name: string;
  item: string;
  um: string;
  description: string;
  lotSerial: string;
  expectedQty: number;
  receivedQty: number;
  fromLocation: string;
  toLocation: string;
  verified: boolean;
}

interface IncomingOrder {
  keyId: string;
  orderId: string;
  supplier: string;
  supplier_name: string;
  expectedDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  //lotSerials: LotDetails[];
  items: IncomingItem[];
}

interface Reason{
  name : string;
  reason : string;
}

export function MaterialIncoming({ onBack }: MaterialIncomingProps) {
  const [view, setView] = useState<'list' | 'verify'>('list');
  const [order, setOrder] = useState<IncomingOrder | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [KeyIdActive, setKeyIdActive] = useState('');
  const [error, setError] = useState('');
  const [showReasonSelection, setShowReasonSelection] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [mockOrders, setMockOrders] = useState<IncomingOrder[]>([]);
  const [discrepancyReasons, setdiscrepancyReasons] = useState<Reason | null>(null);
  const [scanInfo, setScanInfo] = useState('Select a purchase order above to begin verification'); 

  useEffect(() => {
    const getFrappe = () => (window as any).frappe;
    const user = getFrappe()?.session?.user;
    const fetchTask = async () => {
      const res = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_task.warehouse_task.get_outstanding_physical_verification_tasks?user=${user}`);
      const data = await res.json();
      setMockOrders(data.message || []);
    };
    fetchTask();
  }, []);

    useEffect(() => {
      const params = new URLSearchParams({
            fields: JSON.stringify(["name","reason"]),
            filters: JSON.stringify([["key_name", "=", "TASKING_REASON"]]),
            order_by: "creation desc",
            limit_page_length: 10
      });

      const fetchReason = async () => {
        const res = await fetch(`/api/resource/Reason Master?${params}`);
        const data = await res.json();
        const reason = data.data;
        setdiscrepancyReasons(data.data || []);
        console.log(reason);
      };
      fetchReason();
    }, []);

  useEffect(() => {
    // Jika order belum ada atau statusnya sudah completed, jangan lakukan apa-apa
    if (!order || order.status === 'completed') return;
    console.log("Efect status");
    // Cek apakah semua item sudah verified
    const allVerified = order.items.length > 0 && order.items.every(item => item.verified);

    if (allVerified) {
      setOrder(prevOrder => ({
        ...prevOrder!,
        status: 'completed'
      }));
      
      // Opsional: Jika ingin memberi notifikasi atau otomatis balik ke list
      console.log("Order Completed!");
    }
  }, [order]); // Akan berjalan setiap kali state 'order' berubah

  const handleSelectOrder = (selectedOrder: IncomingOrder) => {
    setOrder(selectedOrder);
    console.log(selectedOrder);    
    setKeyIdActive(selectedOrder.keyId);
    setView('verify');
    setCurrentItemIndex(null);
    setError('');
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

    const itemIndex = order.items.findIndex(item => 
    item.sku === itemCode && item.lotSerial === lotSerial
    );
    
    if (itemIndex !== -1) {
      // Store lot/serial number with the item
      const updatedOrder = { ...order };

      
      if (updatedOrder.items[itemIndex].verified === true){
        setError('This label already scanned!');
      }
      else {
        setQuantity(updatedOrder.items[itemIndex].expectedQty);
        updatedOrder.items[itemIndex].lotSerial = lotSerial;
        setOrder(updatedOrder);
        setCurrentItemIndex(itemIndex);
        setView('');
        setScanInfo('Confirm Quantity and choose reason if any');
        setError('');
      }
    } else {
      setError(`Item ${itemCode} and Lot/Serial ${lotSerial} not found in this purchase order`);
    }
  };

  const handleVerify = async () => {
    if (currentItemIndex === null || !order) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
  
    const expectedQty = order.items[currentItemIndex].expectedQty;
    
    if (qty > expectedQty) {
      setError('Quantity cannot greater than expected');
      return;
    }
  
    // If quantity doesn't match expected, show reason selection
    if (qty !== expectedQty) {
      setShowReasonSelection(true);
      setError('');
      return;
    }

    // If quantity matches, proceed directly
    const updatedOrder = { ...order };
    updatedOrder.items[currentItemIndex].receivedQty = qty;
    updatedOrder.items[currentItemIndex].verified = true;
    //console.log("respon:", updatedOrder.items[currentItemIndex]);
    setOrder(updatedOrder);
    setQuantity('');
    setCurrentItemIndex(null);
    setView('list');

    try {
      await postToFrappe('warehousing.warehousing.doctype.warehouse_task.warehouse_task.physical_verified_item', 
        updatedOrder.items[currentItemIndex]
      );
      
      const isFinished = updatedOrder.items.every(i => i.verified);
      if (isFinished) {
        updateOrderStatusInList(order.keyId);
        handleBackToList(); // Ini akan mereset view dan memicu filter di list
      } else {
        setView('verify');
      }
    } catch (err) {
      console.error(err);
      setError(err);
    }
   
  };

  const handleConfirmWithReason = async () => {
    if (!selectedReason) {
      setError('Please select a reason for the discrepancy');
      return;
    }

    if (currentItemIndex === null || !order) return;

      const qty = parseInt(quantity);
      const updatedOrder = { ...order };
      updatedOrder.items[currentItemIndex].receivedQty = qty;
      updatedOrder.items[currentItemIndex].verified = true;
      updatedOrder.items[currentItemIndex].discrepancyReason = selectedReason;
      updatedOrder.items[currentItemIndex].discrepancyReasonDesc = discrepancyReasons.find(r => r.name === selectedReason)?.reason;
      setOrder(updatedOrder);
      setQuantity('');
      setCurrentItemIndex(null);
      setError('');
      setShowReasonSelection(false);
      setSelectedReason('');
      setView('list');
      console.log(updatedOrder.items[currentItemIndex]);
      try {
          await postToFrappe('warehousing.warehousing.doctype.warehouse_task.warehouse_task.physical_verified_item', 
          updatedOrder.items[currentItemIndex]
          );
          
          const isFinished = updatedOrder.items.every(i => i.verified);
          if (isFinished) {
            updateOrderStatusInList(order.keyId);
            handleBackToList(); // Ini akan mereset view dan memicu filter di list
          } else {
            setView('verify');
          }
        } catch (err) {
          console.error(err);
          setError(err);
      }
  };

  const updateOrderStatusInList = (keyId: string) => {
  setMockOrders(prevOrders => {
      return prevOrders.map(po => {
        if (po.keyId === keyId) {
          // Cek apakah semua item sudah verified
          return { 
            ...po, 
            status: 'completed'
          };
        }
        return po;
      });
    });
  };


  const handleCancelReason = () => {
    setShowReasonSelection(false);
    setSelectedReason('');
    setError('');
  };

  const handleBackToList = () => {
    setScanInfo('Select a purchase order above to begin verification'); 
    setKeyIdActive('');
    setView('list');
    setOrder(null);
    setCurrentItemIndex(null);
    setQuantity('');
    setError('');
    setShowReasonSelection(false);
    setSelectedReason('');
  };

  const allItemsVerified = order?.items.every(item => item.verified) ?? false;
  const hasDiscrepancy = order?.items.some(item => item.verified && item.receivedQty !== item.expectedQty) ?? false;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white p-4 sticky top-0 shadow-lg z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={view === 'list' ? onBack : handleBackToList} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Package className="w-6 h-6" />
            <h2>Material Incoming</h2>
          </div>
        </div>
      </div>
 
      <div className="max-w-md mx-auto p-4 space-y-6">
        {view === 'list' ? (
          <>
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-blue-900 font-medium">Select Purchase Order</div>
                  <p className="text-blue-700 text-sm">Choose a PO to start verification</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {mockOrders.filter((po) => po.status !== 'completed').map((po, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectOrder(po)}
                  className="w-full bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-all text-left border-2 border-transparent hover:border-blue-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium text-lg mb-1">PO: {po.orderId}</div>
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">{po.supplier_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{po.expectedDate}</span>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {po.items.length} item{po.items.length > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600">Items:</div>
                    <div className="mt-2 space-y-1">
                      {po.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="text-sm text-gray-700 flex justify-between">
                          <span>• Item: {item.sku}, Lotserial: {item.lotSerial}</span>
                          <span className="text-gray-500">{item.expectedQty} {item.um}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {error && currentItemIndex === null && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-red-900">Error</div>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {order && (
              <div className="space-y-4">
                {currentItemIndex !== null && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-5">
                    <div className="text-blue-900 mb-3">Verify Item Quantity</div>
                    <div className="text-gray-900 mb-1">{order.items[currentItemIndex].name}</div>
                    <p className="text-gray-600 mb-3">{order.items[currentItemIndex].sku}</p>
                    
                    {order.items[currentItemIndex].lotSerial && (
                      <div className="mb-3 p-3 bg-white rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Lot/Serial Number</div>
                        <div className="text-gray-900 font-medium">{order.items[currentItemIndex].lotSerial}</div>
                      </div>
                    )}
                    
                    <div className="mb-4 p-3 bg-white rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Expected Quantity</div>
                      <div className="text-gray-900 font-medium">{order.items[currentItemIndex].expectedQty} {order.items[currentItemIndex].um}</div>
                    </div>
                    
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter received quantity"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    autoFocus />
                    
                    {error && (
                      <p className="text-red-600 mb-3">{error}</p>
                    )}
                    
                    <button
                      onClick={handleVerify}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Verify & Confirm
                    </button>
                  </div>
                )}

                {showReasonSelection && currentItemIndex !== null && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-5 h-5 text-amber-600" />
                      <div className="text-amber-900 font-medium">Select Reason for Discrepancy</div>
                    </div>
                    
                    
                    {error && (
                      <p className="text-red-600 mb-3">{error}</p>
                    )}
                    
                    <div className="mb-3">
                      <div className="text-sm text-gray-700 mb-2 font-medium">Select reason:</div>
                      <div className="space-y-2">
                        {discrepancyReasons.map((reason, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedReason(reason.name)}
                            className={`w-full px-4 py-3 text-left rounded-xl transition-all ${
                              selectedReason === reason.name
                                ? 'bg-blue-600 text-white border-2 border-blue-600' 
                                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {reason.reason}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelReason}
                        className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-red-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmWithReason}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-md p-5">
                  <div className="text-gray-900 mb-4">Items Verification Status</div>
                  
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-xl border-2 ${
                          Boolean(item.verified) 
                            ? item.receivedQty === item.expectedQty
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                           
                            <p className="text-gray-600 text-sm">{item.name}</p>
                            {item.lotSerial && (
                              /*{ <p className="text-gray-600 text-sm mt-1">Item: {item.sku }, Lot/Serial: {item.lotSerial}</p> }*/
                              <p className="text-gray-600 text-sm mt-1">{item.sku }#{item.lotSerial}</p>
                            )}
                          </div>
                          {Boolean(item.verified) ? (
                            item.receivedQty === item.expectedQty ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-amber-600" />
                            )
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Expected: {item.expectedQty}</span>
                          {Boolean(item.verified) && (
                            <span className={
                              item.receivedQty === item.expectedQty 
                                ? 'text-green-700' 
                                : 'text-amber-700'
                            }>
                              Received: {item.receivedQty}
                            </span>
                          )}
                        </div>
                        
                        {Boolean(item.verified) && item.discrepancyReason && (
                          <div className="mt-2 pt-2 border-t border-amber-300">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-amber-800 text-xs font-medium">Reason:</p>
                                <p className="text-amber-700 text-sm">{item.discrepancyReasonDesc}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* {allItemsVerified && (
                  <div className={`${hasDiscrepancy ? 'bg-amber-50 border-amber-500' : 'bg-green-50 border-green-500'} border-l-4 rounded-xl p-5`}>
                    <div className="flex items-start gap-3">
                      {hasDiscrepancy ? (
                        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                      ) : (
                        <ClipboardCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className={hasDiscrepancy ? 'text-amber-900' : 'text-green-900'}>
                          {hasDiscrepancy ? 'Verification Complete with Discrepancies' : 'Verification Complete'}
                        </div>
                        <p className={hasDiscrepancy ? 'text-amber-700' : 'text-green-700'}>
                          {hasDiscrepancy 
                            ? 'Some items have quantity discrepancies. Please review before confirming.'
                            : 'All items verified successfully. Ready to receive into inventory.'
                          }
                        </p>
                        <button className={`mt-3 w-full ${hasDiscrepancy ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white py-3 rounded-xl transition-colors`}>
                          {hasDiscrepancy ? 'Report & Confirm' : 'Confirm Receipt'}
                        </button>
                      </div>
                    </div>
                  </div>
                )} */}

              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
        <div className="max-w-md mx-auto">
          {view === 'verify' && order ? (
            <>
              <BarcodeScanner onScan={handleItemScan} placeholder="Scan item barcode (ITEM#LOTSERIAL)" autoFocus />

            </>
          ) : (
            <div className="text-center text-gray-500 py-3">
              {scanInfo}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}