import { useState } from 'react';
import { ArrowLeft, Undo2, Package, AlertCircle, CheckCircle, FileText, User } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface MaterialReturnProps {
  onBack: () => void;
}

interface ReceivedItem {
  orderId: string;
  sku: string;
  name: string;
  supplier: string;
  receivedDate: string;
  receivedQty: number;
  currentStock: number;
}

interface ReturnRequest {
  item: ReceivedItem;
  returnQty: number;
  reason: string;
  notes: string;
}

const mockReceivedItems: Record<string, ReceivedItem> = {
  'SKU12345': {
    orderId: 'PO2024001',
    sku: 'SKU12345',
    name: 'Steel Bolts M8',
    supplier: 'ABC Steel Supplies',
    receivedDate: '2024-11-20',
    receivedQty: 100,
    currentStock: 100,
  },
  'SKU67890': {
    orderId: 'PO2024001',
    sku: 'SKU67890',
    name: 'Washers 10mm',
    supplier: 'ABC Steel Supplies',
    receivedDate: '2024-11-20',
    receivedQty: 200,
    currentStock: 180,
  },
  'SKU11111': {
    orderId: 'PO2024002',
    sku: 'SKU11111',
    name: 'Nuts M8',
    supplier: 'XYZ Materials',
    receivedDate: '2024-11-22',
    receivedQty: 150,
    currentStock: 150,
  },
};

const returnReasons = [
  'Defective/Damaged',
  'Wrong Item',
  'Quality Issues',
  'Excess Quantity',
  'Not as Specified',
  'Other',
];

type Step = 'scan-item' | 'return-details' | 'confirm';

export function MaterialReturn({ onBack }: MaterialReturnProps) {
  const [step, setStep] = useState<Step>('scan-item');
  const [item, setItem] = useState<ReceivedItem | null>(null);
  const [returnQty, setReturnQty] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [returnedBy, setReturnedBy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleItemScan = (code: string) => {
    const itemData = mockReceivedItems[code];
    if (itemData) {
      if (itemData.currentStock === 0) {
        setError('No stock available for this item');
        return;
      }
      setItem(itemData);
      setError('');
      setStep('return-details');
    } else {
      setError('Item not found or not received from supplier');
    }
  };

  const handleNextStep = () => {
    const qty = parseInt(returnQty);
    
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    
    if (item && qty > item.currentStock) {
      setError(`Only ${item.currentStock} units available in stock`);
      return;
    }
    
    if (!selectedReason) {
      setError('Please select a return reason');
      return;
    }
    
    setError('');
    setStep('confirm');
  };

  const handleConfirmReturn = () => {
    if (!returnedBy.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setSuccess(true);
    setTimeout(() => {
      resetForm();
    }, 3000);
  };

  const resetForm = () => {
    setStep('scan-item');
    setItem(null);
    setReturnQty('');
    setSelectedReason('');
    setNotes('');
    setReturnedBy('');
    setError('');
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white p-4 sticky top-0 shadow-lg z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Undo2 className="w-6 h-6" />
            <h2>Material Return</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'scan-item' ? 'text-red-600' : step !== 'scan-item' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'scan-item' ? 'bg-red-600 text-white' : step !== 'scan-item' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm">Scan</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step !== 'scan-item' ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${step === 'return-details' ? 'text-red-600' : step === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'return-details' ? 'bg-red-600 text-white' : step === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm">Details</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step === 'confirm' ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-sm">Confirm</span>
            </div>
          </div>
        </div>

        {/* Step 1: Scan Item */}
        {step === 'scan-item' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-3">Scan Item to Return</div>
              <p className="text-gray-500">Use the scanner below to scan item barcode</p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-blue-900 mb-1">Return Policy</div>
                  <p className="text-blue-700">Items can only be returned within 30 days of receipt with valid reason.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Return Details */}
        {step === 'return-details' && item && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-4">Item Information</div>
              
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-gray-900 mb-1">{item.name}</div>
                  <p className="text-gray-600">{item.sku}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-600">Supplier</p>
                    <div className="text-gray-900">{item.supplier}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-600">PO Number</p>
                    <div className="text-gray-900">{item.orderId}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-600">Received Date</p>
                    <div className="text-gray-900">{item.receivedDate}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-600">Current Stock</p>
                    <div className="text-gray-900">{item.currentStock} units</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <label className="block text-gray-700 mb-3">Return Quantity</label>
              <input
                type="number"
                value={returnQty}
                onChange={(e) => {
                  setReturnQty(e.target.value);
                  setError('');
                }}
                placeholder="Enter quantity to return"
                max={item.currentStock}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />

              <label className="block text-gray-700 mb-3">Return Reason</label>
              <div className="space-y-2 mb-4">
                {returnReasons.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      setSelectedReason(reason);
                      setError('');
                    }}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      selectedReason === reason
                        ? 'bg-red-50 border-red-500 text-red-900'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <label className="block text-gray-700 mb-3">Additional Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any additional details..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />

              <button
                onClick={handleNextStep}
                disabled={!returnQty || !selectedReason}
                className="w-full bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && item && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900">Return Summary</div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <div className="text-gray-900 mb-1">{item.name}</div>
                  <p className="text-gray-600">{item.sku}</p>
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Return Quantity:</span>
                      <span className="text-red-900">{returnQty} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining Stock:</span>
                      <span className="text-gray-900">{item.currentStock - parseInt(returnQty)} units</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="mb-2">
                    <span className="text-gray-600">Supplier:</span>
                    <span className="text-gray-900 ml-2">{item.supplier}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-600">PO Number:</span>
                    <span className="text-gray-900 ml-2">{item.orderId}</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-600">Reason:</span>
                    <span className="text-gray-900 ml-2">{selectedReason}</span>
                  </div>
                  {notes && (
                    <div>
                      <span className="text-gray-600">Notes:</span>
                      <p className="text-gray-900 mt-1">{notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <label className="block text-gray-700 mb-3">Processed By</label>
              <div className="relative mb-4">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={returnedBy}
                  onChange={(e) => {
                    setReturnedBy(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your name"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                onClick={handleConfirmReturn}
                disabled={!returnedBy.trim()}
                className="w-full bg-red-600 text-white py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
              >
                Confirm Return to Supplier
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-red-900">Error</div>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <div className="text-green-900 mb-1">Return Request Submitted!</div>
                <p className="text-green-700">
                  Return request for {returnQty} units of {item?.name} has been created and will be processed for return to {item?.supplier}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      {step === 'scan-item' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
          <div className="max-w-md mx-auto">
            <BarcodeScanner onScan={handleItemScan} placeholder="Scan item barcode" autoFocus />
            <p className="text-gray-500 mt-2 text-center">Try: SKU12345, SKU67890, or SKU11111</p>
          </div>
        </div>
      )}
    </div>
  );
}