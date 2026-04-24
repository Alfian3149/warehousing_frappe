import { useState } from 'react';
import { ArrowLeft, Repeat, MapPin, Package, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { postToFrappe } from '../services/frappeService';
interface MaterialTransferProps {
  onBack: () => void;
}

interface ItemData {
  keyId:string;
  sku: string;
  name: string;
  um: string;
  lotSerial: string;
  currentLocation: string;
  suggestLocation: string;
  currentRack?: string;
  availableQuantity: number;
  confirmLocation?:string;
  confirmQty?:number;
}

interface LocationData {
  rack: string;
  location: string;
  zone: string;
  availableSpace: number;
  capacity: number;
  slotUsed: number;
  itemKindCount: number;
  is_active: number;
}

/* const mockItems: Record<string, ItemData> = {
  'SKU12345': {
    keyId: '1',
    sku: 'SKU12345',
    name: 'Steel Bolts M8',
    um: 'Pc',
    lotSerial:'XXX',
    currentLocation: 'A-1-01',
    suggestLocation: 'GA001',
    currentRack: 'RACK001',
    availableQuantity: 50,
  }
};

const mockLocations: Record<string, LocationData> = {
  'RACK003': {
    rack: 'RACK003',
    location: 'A-1-03',
    zone: 'Zone A',
    availableSpace: 80,
  },
  'RACK004': {
    rack: 'RACK004',
    location: 'B-2-01',
    zone: 'Zone B',
    availableSpace: 100,
  },
};
 */

type Step = 'scan-item' | 'enter-quantity' | 'scan-destination' | 'confirm';

export function MaterialTransfer({ onBack }: MaterialTransferProps) {
  const [step, setStep] = useState<Step>('scan-item');
  const [item, setItem] = useState<ItemData | null>(null);
  const [quantity, setQuantity] = useState('');
  const [scanned, setScanned] = useState('');
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleItemScan = async (code: string) => {
    //const itemData = mockItems[code];
    setScanned(code);
    const parts = code.split('#');
    if (parts.length !== 2) {
      setError('Invalid barcode format. Expected: ITEM#LOTSERIAL');
      return;
    }
    const [itemCode, lotSerial] = parts;
    console.log(code);
    try {
        const response = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_task.warehouse_task.scan_item_putaway?item=${itemCode}&lotserial=${lotSerial}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();

        if (response.ok && data.message) {
          const actualData = Object.values(data.message)[0] as ItemData;
          if (data.message["result"] !== "failed"){
            const itemData = actualData;
            setQuantity(itemData.availableQuantity);
            setItem(actualData);
            
            setItem(itemData);
            setError('');
            setStep('enter-quantity');
          }
          else {
              setError('Item not found or already scanned');
          }

        } else {
          setError('Item not found or already scanned');
        }
    } catch (err) {
      setError('Item not found or already scanned');
      //setError(true);
    } finally {
      setLoading(false);
    }

  };

  const handleQuantitySubmit = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (item && qty > item.availableQuantity) {
      setError(`Only ${item.availableQuantity} units available at source location`);
      return;
    }
    const updatedItem = { ...item };
    updatedItem.confirmQty = qty;
    setItem(updatedItem);
    
    setError('');
    setStep('scan-destination');
  };

  const handleDestinationScan = async (code: string) => {
    console.log(item);
    //const locationData = mockLocations[code];
    if (code === item.currentLocation) {
      setError('Destination location cannot match with current location');
    }
    else {
      try {
          const response = await fetch(`/api/method/warehousing.warehousing.doctype.warehouse_location.warehouse_location.scan_rack_for_putaway?location=${code}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const data = await response.json();

          if (response.ok && data.message) {
            const actualData = Object.values(data.message)[0] as LocationData;
          
            const locationData = actualData;
            if (locationData) {
              /* const qty = parseInt(quantity);
              if (qty > locationData.availableSpace) {
                setError(`Destination has only ${locationData.availableSpace} units of space available`);
                return;
              } */
              const updatedItem = { ...item };
              updatedItem.confirmLocation = code;
              setItem(updatedItem);
              setDestination(locationData);
              setError('');
              setStep('confirm');
             
            } else {
              setError('Destination location not found');
            }

          } else {
            setError('Destination location not found');
          }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

  };

  const handleConfirmTransfer = async () => {
    try {
      await postToFrappe('warehousing.warehousing.doctype.warehouse_task.warehouse_task.putaway_transfer_confirm', item);
      setSuccess(true);
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err);
    }

 
  };

  const resetForm = () => {
    setStep('scan-item');
    setItem(null);
    setQuantity('');
    setDestination(null);
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
            <Repeat className="w-6 h-6" />
            <h2>Material Transfer</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'scan-item' ? 'text-[#ff3131]' : step !== 'scan-item' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'scan-item' ? 'bg-[#ff3131] text-white' : step !== 'scan-item' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm">Item</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step !== 'scan-item' ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${step === 'enter-quantity' ? 'text-[#ff3131]' : ['scan-destination', 'confirm'].includes(step) ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'enter-quantity' ? 'bg-[#ff3131] text-white' : ['scan-destination', 'confirm'].includes(step) ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm">Qty</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${['scan-destination', 'confirm'].includes(step) ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${step === 'scan-destination' ? 'text-[#ff3131]' : step === 'confirm' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'scan-destination' ? 'bg-[#ff3131] text-white' : step === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-sm">Dest</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step === 'confirm' ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-[#ff3131]' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirm' ? 'bg-[#ff3131] text-white' : 'bg-gray-200'}`}>
                4
              </div>
              <span className="text-sm">Done</span>
            </div>
          </div>
        </div>

        {/* Step 1: Scan Item */}
        {step === 'scan-item' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-3">Scan Item to Transfer</div>
              <p className="text-gray-500">Use the scanner below to scan item barcode</p>
            </div>
          </div>
        )}

        {/* Step 2: Enter Quantity */}
        {step === 'enter-quantity' && item && (
          <div className="space-y-4">


            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900">Current Location</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-900">{item.sku} : {item.name}</div>
                <p className="text-gray-600">{item.currentLocation}</p>
                <p className="text-gray-600 mt-2">Available: {item.availableQuantity} {item.um}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <label className="block text-gray-700 mb-3">Transfer Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError('');
                }}
                placeholder="Enter quantity to transfer"
                max={item.availableQuantity}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff3131] mb-4"
              />
              <button
                onClick={handleQuantitySubmit}
                disabled={!quantity}
                className="w-full bg-gradient-to-r from-[#ff3131] to-[#ff914d] text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Scan Destination */}
        {step === 'scan-destination' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-3">Transfer Summary</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="text-gray-900">{item?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lot/Serial:</span>
                  <span className="text-gray-900">{item?.lotSerial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="text-gray-900">{quantity} {item?.um}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="text-gray-900">{item?.currentLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suggestion To:</span>
                  <span className="text-gray-900">{item?.suggestLocation}</span>
                </div>
              </div>
            </div>

          {/*   <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-3">Scan Destination Location</div>
              <p className="text-gray-500">Use the scanner below to scan destination rack</p>
            </div> */}
          </div>
        )}

        {/* Step 4: Confirm Transfer */}
        {step === 'confirm' && destination && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="text-gray-900 mb-4">Confirm Transfer</div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-900">From: {item?.currentLocation}</span>
                    </div>
                    {/* <div className="text-gray-900">{item?.currentRack}</div>
                    <p className="text-gray-600">{item?.currentLocation}</p> */}
                  </div>

                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="text-green-900">To : {destination.rack} </span>
                    </div>
                   {/*  <div className="text-gray-900">{destination.rack}</div> */}
                    {/* <p className="text-gray-600">{destination.location}</p> */}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-gray-600" />
                    <div className="text-gray-900">Transfer Details</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Description: </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900"> {item?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Item:</span>
                      <span className="text-gray-900">{item?.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lot/Serial:</span>
                      <span className="text-gray-900">{item?.lotSerial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="text-gray-900">{quantity} {item?.um}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmTransfer}
                className="w-full mt-4 bg-gradient-to-r from-[#1e3a52] to-[#2d5f73] text-white py-4 rounded-xl hover:shadow-lg transition-shadow"
              >
                Confirm Transfer
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
                <div className="text-green-900 mb-1">Transfer Complete!</div>
                <p className="text-green-700">
                  {quantity} units of {item?.name} successfully transferred from {item?.currentRack} to {destination?.rack}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
        <div className="max-w-md mx-auto">
          {step === 'scan-item' && (
            <>
              <BarcodeScanner onScan={handleItemScan} placeholder="Scan item barcode" autoFocus />
            </>
          )}
          {step === 'scan-destination' && (
            <>
              <BarcodeScanner onScan={handleDestinationScan} placeholder="Scan destination rack" autoFocus />
            </>
          )}
        </div>
      </div>
    </div>
  );
}