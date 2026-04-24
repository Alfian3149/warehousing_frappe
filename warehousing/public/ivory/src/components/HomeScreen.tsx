import { Package, QrCode, Warehouse, ShoppingCart, Repeat, HandCoins, Undo2, LogOut, Flame } from 'lucide-react';
import type { Screen } from '../App';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  employeeName: string;
  onLogout: () => void;
}

export function HomeScreen({ onNavigate, employeeName, onLogout }: HomeScreenProps) {
  const menuItems = [
    {
      id: 'rack-check' as Screen,
      title: 'Rack Check',
      description: 'Scan and verify rack locations',
      icon: Warehouse,
      color: 'bg-blue-500',
    },
    {
      id: 'item-info' as Screen,
      title: 'Item Information',
      description: 'Check item details and stock',
      icon: QrCode,
      color: 'bg-green-500',
    },
    {
      id: 'incoming' as Screen,
      title: 'Material Incoming',
      description: 'Verify incoming materials',
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      id: 'transfer' as Screen,
      title: 'Material Putaway',
      description: 'Move between locations',
      icon: Repeat,
      color: 'bg-indigo-500',
    },
    {
      id: 'picking' as Screen,
      title: 'Material Picking',
      description: 'Pick items for production',
      icon: ShoppingCart,
      color: 'bg-orange-500',
    },
    {
      id: 'handover' as Screen,
      title: 'Material Handover',
      description: 'Transfer to production team',
      icon: HandCoins,
      color: 'bg-pink-500',
    },

    /* {
      id: 'consumption' as Screen,
      title: 'Material Consumption',
      description: 'Record production consumption',
      icon: Flame,
      color: 'bg-amber-500',
    },
    {
      id: 'return' as Screen,
      title: 'Material Return',
      description: 'Return items to supplier',
      icon: Undo2,
      color: 'bg-red-500',
    }, */
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a52] to-[#2d5f73] p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center pt-8 pb-6">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center bg-white rounded-2xl p-3 shadow-lg">
              <Warehouse className="w-12 h-12 text-[#2d5f73]" />
            </div>
          </div>
          <p className="text-white/90">Welcome, {employeeName}</p>
          <p className="text-white/80 mt-1">Select a function to continue</p>
        </div>

        <div className="space-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full bg-white rounded-2xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg transition-shadow"
              >
                <div className={`${item.color} rounded-xl p-3 flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-gray-900 mb-1">{item.title}</div>
                  <p className="text-gray-500">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-6 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-white/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}