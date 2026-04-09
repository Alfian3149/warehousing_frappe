import { MapPin, Package, Clock } from "lucide-react";
import type { WarehouseBin } from "../data/warehouse-data";

interface BinCardProps {
  bin: WarehouseBin;
}

export function BinCard({ bin }: BinCardProps) {
  const usagePercent = (bin.currentStock / bin.capacity) * 100;

  const statusColors = {
    available: "border-green-500 bg-green-50",
    reserved: "border-yellow-500 bg-yellow-50",
    occupied: "border-red-500 bg-red-50",
  };

  const statusBadgeColors = {
    available: "bg-green-100 text-green-800",
    reserved: "bg-yellow-100 text-yellow-800",
    occupied: "bg-red-100 text-red-800",
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border-l-4 p-6 ${statusColors[bin.status as keyof typeof statusColors]}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{bin.location}</h3>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="size-4 text-gray-400" />
            <span className="text-sm text-gray-600">{bin.zone}</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeColors[bin.status as keyof typeof statusBadgeColors]}`}>
          {bin.status.charAt(0).toUpperCase() + bin.status.slice(1)}
        </span>
      </div>

      {/* Capacity Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 flex items-center gap-1">
            <Package className="size-4" />
            Capacity
          </span>
          <span className="font-medium text-gray-900">
            {bin.currentStock} / {bin.capacity}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              usagePercent >= 90
                ? "bg-red-500"
                : usagePercent >= 70
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
        <div className="text-right text-xs text-gray-500 mt-1">
          {usagePercent.toFixed(1)}% utilized
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        {bin.reservedFor && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Reserved For:</span>
            <span className="font-medium text-gray-900">{bin.reservedFor}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-1">
            <Clock className="size-4" />
            Last Updated:
          </span>
          <span className="text-gray-900">{bin.lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}
