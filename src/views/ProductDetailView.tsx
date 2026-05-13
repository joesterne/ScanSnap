import { InventoryItem } from '../store';
import { ArrowLeft, Box, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductDetailViewProps {
  item: InventoryItem;
  onBack: () => void;
}

export function ProductDetailView({ item, onBack }: ProductDetailViewProps) {
  const { product } = item;

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-gray-50 pb-32 h-full flex flex-col">
      <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-20 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-gray-900 truncate">
          Product Details
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="h-48 w-full bg-gray-50 flex items-center justify-center border-b border-gray-100 p-4">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full object-contain mix-blend-multiply" />
            ) : (
              <Box className="w-12 h-12 text-gray-300" />
            )}
          </div>
          <div className="p-5">
            <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mb-2">
              {product.upc}
            </span>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h2>
            {product.brand && (
              <p className="text-sm font-medium text-indigo-600 mt-1">{product.brand}</p>
            )}
            {product.category && (
              <p className="text-xs text-gray-500 mt-2">{product.category}</p>
            )}
          </div>
        </motion.div>

        {/* Detailed Information */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5"
        >
          <div className="flex items-center gap-2 text-gray-900 border-b border-gray-100 pb-3">
             <Info className="w-5 h-5 text-indigo-600" />
             <h3 className="font-semibold">Additional Information</h3>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-1 text-xs uppercase tracking-wider">Description</h4>
              <p className="text-gray-600 leading-relaxed">
                {product.description || 'No description available for this product.'}
              </p>
            </div>
            
            {product.ingredients && (
              <div className="pt-2 border-t border-gray-50">
                <h4 className="font-medium text-gray-900 mb-1 text-xs uppercase tracking-wider">Ingredients</h4>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {product.ingredients}
                </p>
              </div>
            )}
            
            {product.nutritionInfo && (
              <div className="pt-2 border-t border-gray-50">
                <h4 className="font-medium text-gray-900 mb-1 text-xs uppercase tracking-wider">Nutrition Information</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-600 text-sm whitespace-pre-line border border-gray-100">
                  {product.nutritionInfo}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
