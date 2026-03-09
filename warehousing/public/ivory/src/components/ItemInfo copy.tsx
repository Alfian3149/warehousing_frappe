import { useState } from 'react';
import { ArrowLeft, QrCode, Package, MapPin, Radiation , AlertTriangle } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface ItemInfoProps {
  onBack: () => void;
}

interface ItemData {
  sku: string;
  name: string;
  category: string;
  totalStock: number;
  minStock: number;
  locations: Array<{ rack: string; location: string; quantity: number }>;
  unitPrice: number;
}



export function ItemInfo({ onBack }: ItemInfoProps) {
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleScan = async (code: string) => {
    setLoading(true);
    setError(false);
    
    try {
      const response = await fetch(`/api/method/warehousing.warehousing.doctype.part_master.part_master.get_item_stock_details?item_code=${code}`);
      const data = await response.json();

      if (response.ok && data.message) {
        const actualData = Object.values(data.message)[0] as ItemData;
        setItemData(actualData);
        setError(false);
      } else {
        setItemData(null);
        setError(true);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(true);
      setItemData(null);
    } finally {
      setLoading(false);
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
            <QrCode className="w-6 h-6" />
            <h2>Item Information</h2>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-red-900">Item Not Found</div>
              <p className="text-red-700">The scanned item code is not in the system.</p>
            </div>
          </div>
        )}

        {itemData && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-gray-900 mb-1">{itemData.name}</div>
                  <p className="text-gray-500">{itemData.sku}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  {itemData.drawing_location}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-gray-600" />
                    <p className="text-gray-500">Total Stock</p>
                  </div>
                  <div className="text-gray-900">{itemData.totalStock} {itemData.um}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Radiation className="w-4 h-4 text-gray-600" />
                    <p className="text-gray-500">Allocated</p>
                  </div>
                  <div className="text-gray-900">{itemData.reservedStock}</div>
                </div>
              </div>

             {/*  {itemData.totalStock < itemData.minStock && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <div className="text-amber-900">Low Stock Warning</div>
                    <p className="text-amber-700">Below minimum stock level of {itemData.minStock} units</p>
                  </div>
                </div>
              )} */}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-600" />
                <div className="text-gray-900">Stock Locations</div>
              </div>
              
              <div className="space-y-3">
                {itemData.locations.map((loc, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-gray-900">{loc.location}</div>
                        <p className="text-gray-600">{loc.lot_serial}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-900">{loc.quantity}</div>
                        <p className="text-gray-500">{itemData.um}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${(loc.quantity / itemData.totalStock) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Scanner at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg p-4 z-20">
        <div className="max-w-md mx-auto">
          <BarcodeScanner onScan={handleScan} placeholder="Scan item barcode (e.g., SKU12345)" autoFocus />
          
        </div>
      </div>
    </div>
  );
}