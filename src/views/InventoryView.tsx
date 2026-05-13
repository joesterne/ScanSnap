import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Box, Plus, Minus, Trash2, Search, ArrowDownAZ, ArrowUpZA, Clock, CalendarDays, ArrowUpDown, CheckSquare, Square, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductDetailView } from './ProductDetailView';

type SortOption = 'name' | 'addedAt' | 'lastUpdated';

export function InventoryView() {
  const { inventory, updateInventoryQuantity, removeFromInventory, removeMultipleFromInventory } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('addedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set());

  const filteredAndSortedInventory = useMemo(() => {
    let result = [...inventory];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.product.name.toLowerCase().includes(query) ||
        item.product.category?.toLowerCase().includes(query) ||
        item.product.brand?.toLowerCase().includes(query) ||
        item.product.upc.includes(query)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.product.name.localeCompare(b.product.name);
      } else if (sortBy === 'addedAt') {
        comparison = a.addedAt - b.addedAt;
      } else if (sortBy === 'lastUpdated') {
        comparison = a.lastUpdated - b.lastUpdated;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [inventory, searchQuery, sortBy, sortOrder]);

  const selectedItem = useMemo(() => 
    inventory.find(i => i.id === selectedItemId), 
    [inventory, selectedItemId]
  );

  const toggleBulkSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedBulkIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBulkIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedBulkIds.size === filteredAndSortedInventory.length) {
      setSelectedBulkIds(new Set());
    } else {
      const allIds = filteredAndSortedInventory.map(item => item.id);
      setSelectedBulkIds(new Set(allIds));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedBulkIds.size > 0) {
      removeMultipleFromInventory(Array.from(selectedBulkIds));
      setSelectedBulkIds(new Set());
      setIsBulkEditMode(false);
    }
  };

  if (selectedItem) {
    return <ProductDetailView item={selectedItem} onBack={() => setSelectedItemId(null)} />;
  }

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-gray-50 pb-32">
      <div className="sticky top-0 bg-gray-50/80 backdrop-blur-xl z-10 px-4 pt-6 pb-4 border-b border-gray-100">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">{inventory.length} items saved</p>
          </div>
          {inventory.length > 0 && !isBulkEditMode && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsBulkEditMode(true)}
                className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
            </div>
          )}
          {isBulkEditMode && (
            <button
              onClick={() => {
                setIsBulkEditMode(false);
                setSelectedBulkIds(new Set());
              }}
              className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              Done
            </button>
          )}
        </div>

        {isBulkEditMode && inventory.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between py-2 border-t border-gray-100 mt-2"
          >
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {selectedBulkIds.size === filteredAndSortedInventory.length && filteredAndSortedInventory.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-indigo-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              Select All
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedBulkIds.size === 0}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                selectedBulkIds.size > 0 
                  ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
            >
              Delete ({selectedBulkIds.size})
            </button>
          </motion.div>
        )}

        <AnimatePresence>
          {showFilters && inventory.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pb-2 space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, category, brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
                  />
                </div>
                
                <div className="flex gap-2 text-sm overflow-x-auto no-scrollbar pb-1">
                  <div className="flex bg-white rounded-lg border border-gray-200 p-1 flex-shrink-0">
                    <button
                      onClick={() => setSortBy('name')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${sortBy === 'name' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <ArrowDownAZ className="w-4 h-4" /> Name
                    </button>
                    <button
                      onClick={() => setSortBy('addedAt')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${sortBy === 'addedAt' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <CalendarDays className="w-4 h-4" /> Added
                    </button>
                    <button
                      onClick={() => setSortBy('lastUpdated')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${sortBy === 'lastUpdated' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Clock className="w-4 h-4" /> Updated
                    </button>
                  </div>
                  
                  <div className="flex bg-white rounded-lg border border-gray-200 p-1 flex-shrink-0">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-1.5 rounded-md flex items-center gap-1.5 text-gray-600 hover:bg-gray-50 transition-colors bg-white font-medium shadow-sm border border-gray-100"
                    >
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {inventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400 mt-10">
          <Box className="w-12 h-12 mb-4 opacity-20" />
          <p>Your inventory is empty.</p>
          <p className="text-sm mt-1">Scan an item and save it here.</p>
        </div>
      ) : filteredAndSortedInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400 mt-10">
          <Search className="w-10 h-10 mb-4 opacity-20" />
          <p>No items match your search.</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="text-indigo-600 text-sm mt-2 font-medium"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          <AnimatePresence>
            {filteredAndSortedInventory.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div 
                  onClick={() => {
                    if (isBulkEditMode) {
                      const newSelected = new Set(selectedBulkIds);
                      if (newSelected.has(item.id)) {
                        newSelected.delete(item.id);
                      } else {
                        newSelected.add(item.id);
                      }
                      setSelectedBulkIds(newSelected);
                    } else {
                      setSelectedItemId(item.id);
                    }
                  }}
                  className="flex items-center gap-4 p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  {isBulkEditMode && (
                    <div className="flex-shrink-0 text-gray-400">
                      {selectedBulkIds.has(item.id) ? (
                         <CheckCircle2 className="w-6 h-6 text-indigo-600 fill-indigo-50" />
                      ) : (
                         <Circle className="w-6 h-6" />
                      )}
                    </div>
                  )}
                  <div className="w-16 h-16 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt="" className="w-full h-full object-contain p-2" />
                    ) : (
                      <Box className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {item.product.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-1.5 rounded">
                        {item.product.upc}
                      </span>
                      {item.product.category && (
                         <span className="text-xs text-gray-400 truncate">{item.product.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                {!isBulkEditMode && (
                  <div className="bg-gray-50/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <button
                        onClick={() => updateInventoryQuantity(item.id, -1)}
                        className="p-2 hover:bg-gray-50 text-gray-600 transition disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="w-10 text-center font-semibold text-sm text-gray-900 border-x border-gray-100 bg-gray-50/30">
                         {item.quantity}
                      </div>
                      <button
                        onClick={() => updateInventoryQuantity(item.id, 1)}
                        className="p-2 hover:bg-gray-50 text-gray-600 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromInventory(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
