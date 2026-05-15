import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scanner } from '../components/Scanner';
import { lookupUPC } from '../lib/api';
import { useAppStore, ProductData, LocationData } from '../store';
import { Loader2, MapPin, PackagePlus, Info, ChevronDown, ChevronUp, CheckCircle2, Search } from 'lucide-react';

export function ScanView() {
  const [isScanning, setIsScanning] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ProductData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualUPC, setManualUPC] = useState('');
  
  const addScan = useAppStore((state) => state.addScan);
  const addToInventory = useAppStore((state) => state.addToInventory);

  const getGeoLocation = (): Promise<LocationData | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(undefined), // Silently fail on location denied for now to keep scan fast
        { timeout: 5000 }
      );
    });
  };

  const handleScan = async (decodedText: string) => {
    // Prevent multiple scans
    if (!isScanning || isLookingUp || scannedCode !== null) return;
    
    setScannedCode(decodedText);
    
    // Wait for 1.5 seconds to show the number code on the camera screen
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsScanning(false);
    setIsLookingUp(true);

    try {
      // 1. Get location (if permitted)
      const location = await getGeoLocation();
      
      // 2. Lookup UPC
      const product = await lookupUPC(decodedText);
      setScannedProduct(product);

      // 3. Save to history
      addScan({
        timestamp: Date.now(),
        product,
        location,
      });

    } catch (error) {
      console.error(error);
    } finally {
      setIsLookingUp(false);
      setScannedCode(null);
    }
  };

  const handleReset = () => {
    setScannedProduct(null);
    setScannedCode(null);
    setManualUPC('');
    setShowDetails(false);
    setIsScanning(true);
  };

  return (
    <div className="flex-1 flex flex-col pt-6 px-4 pb-32 max-w-lg mx-auto w-full">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Scan Barcode</h1>
        <p className="text-sm text-gray-500 mt-1">Point your camera at a UPC to look it up</p>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {isScanning ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6">
            <div className="relative">
              <Scanner onScan={handleScan} isScanning={isScanning} />
              <AnimatePresence>
                {scannedCode && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl"
                  >
                    <div className="bg-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      <span className="text-2xl font-bold font-mono tracking-wider text-gray-900">{scannedCode}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <label htmlFor="manual-upc" className="block text-sm font-medium text-gray-700 mb-2">Or enter UPC manually</label>
              <div className="flex gap-2">
                <input
                  id="manual-upc"
                  type="text"
                  placeholder="e.g. 012345678905"
                  value={manualUPC}
                  onChange={(e) => setManualUPC(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualUPC.trim()) {
                      handleScan(manualUPC.trim());
                    }
                  }}
                  className="flex-1 block w-full rounded-xl border border-gray-200 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow font-mono"
                />
                <button
                  onClick={() => handleScan(manualUPC.trim())}
                  disabled={!manualUPC.trim() || isLookingUp}
                  className="bg-indigo-600 text-white px-5 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {isLookingUp && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-8 text-indigo-600"
          >
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-medium">Looking up product...</p>
          </motion.div>
        )}

        <AnimatePresence>
          {scannedProduct && !isLookingUp && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mt-4"
            >
              {scannedProduct.imageUrl ? (
                <div className="h-48 w-full bg-gray-50 flex items-center justify-center border-b border-gray-100 overflow-hidden">
                  <img src={scannedProduct.imageUrl} alt={scannedProduct.name} className="h-full object-contain mix-blend-multiply p-4" />
                </div>
              ) : (
                <div className="h-24 w-full bg-indigo-50 flex items-center justify-center border-b border-indigo-100 text-indigo-300">
                  <Info className="w-8 h-8" />
                </div>
              )}
              
              <div className="p-5">
                <div className="mb-4">
                  <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mb-2">
                    {scannedProduct.upc}
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                    {scannedProduct.name}
                  </h2>
                  {scannedProduct.brand && (
                    <p className="text-sm text-gray-600 mt-1">{scannedProduct.brand}</p>
                  )}
                  {scannedProduct.category && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-1">{scannedProduct.category}</p>
                  )}
                </div>

                <div className="space-y-3 mt-6">
                  <button
                    onClick={() => {
                      addToInventory(scannedProduct);
                      handleReset();
                    }}
                    className="w-full relative flex items-center justify-center gap-2 bg-indigo-600 text-white font-medium px-4 py-3 rounded-xl hover:bg-indigo-700 transition"
                  >
                    <PackagePlus className="w-5 h-5" />
                    Save to Inventory
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center bg-gray-100 text-gray-700 font-medium px-4 py-3 rounded-xl hover:bg-gray-200 transition"
                  >
                    Scan Another
                  </button>
                </div>

                {(scannedProduct.description || scannedProduct.ingredients || scannedProduct.nutritionInfo) && (
                  <div className="mt-6 border-t border-gray-100 pt-4">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-indigo-600 transition"
                    >
                      <span>View More Details</span>
                      {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    <AnimatePresence>
                      {showDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 space-y-4 text-sm text-gray-600">
                            {scannedProduct.description && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                                <p className="leading-relaxed">{scannedProduct.description}</p>
                              </div>
                            )}
                            {scannedProduct.ingredients && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Ingredients</h4>
                                <p className="leading-relaxed text-xs">{scannedProduct.ingredients}</p>
                              </div>
                            )}
                            {scannedProduct.nutritionInfo && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Nutrition Info</h4>
                                <p className="leading-relaxed text-xs whitespace-pre-line">{scannedProduct.nutritionInfo}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
