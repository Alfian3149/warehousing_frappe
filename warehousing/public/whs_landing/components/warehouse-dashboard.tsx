import { useState } from "react";
import { Search, Filter, Package, Warehouse } from "lucide-react";
import { BinCard } from "./bin-card";
import { BinTable } from "./bin-table";
import { warehouseBins } from "../data/warehouse-data";

export function WarehouseDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const filteredBins = warehouseBins.filter((bin) => {
    const matchesSearch = bin.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || bin.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: warehouseBins.length,
    available: warehouseBins.filter(b => b.status === "available").length,
    reserved: warehouseBins.filter(b => b.status === "reserved").length,
    occupied: warehouseBins.filter(b => b.status === "occupied").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Warehouse className="size-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
              <p className="text-gray-500 mt-1">Monitor and manage bin locations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Bins</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Package className="size-10 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-semibold text-green-600 mt-1">{stats.available}</p>
              </div>
              <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                <div className="size-5 rounded-full bg-green-500"></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Reserved</p>
                <p className="text-2xl font-semibold text-yellow-600 mt-1">{stats.reserved}</p>
              </div>
              <div className="size-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="size-5 rounded-full bg-yellow-500"></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Occupied</p>
                <p className="text-2xl font-semibold text-red-600 mt-1">{stats.occupied}</p>
              </div>
              <div className="size-10 rounded-full bg-red-100 flex items-center justify-center">
                <div className="size-5 rounded-full bg-red-500"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bin location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="sm:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === "table"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {viewMode === "table" ? (
          <BinTable bins={filteredBins} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBins.map((bin) => (
              <BinCard key={bin.id} bin={bin} />
            ))}
          </div>
        )}

        {filteredBins.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package className="size-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bins found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
