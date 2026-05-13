import { useAppStore } from '../store';
import { MapPin, Box, ArrowRight, Trash2, Share } from 'lucide-react';
import { motion } from 'motion/react';

export function HistoryView() {
  const { history, clearHistory, removeScan } = useAppStore();

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const handleShare = async () => {
    if (history.length === 0) return;

    const summary = history.map(record => {
      return `- ${record.product.name} (UPC: ${record.product.upc}) - ${formatDate(record.timestamp)}`;
    }).join('\n');

    const shareText = `My Scan History:\n\n${summary}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Scan History',
          text: shareText,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('History copied to clipboard!');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto bg-gray-50 pb-32">
      <div className="sticky top-0 bg-gray-50/80 backdrop-blur-xl z-10 px-4 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Scan History</h1>
          <p className="text-sm text-gray-500 mt-1">{history.length} items scanned</p>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-1">
            <button 
              onClick={handleShare}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition"
              aria-label="Share history"
            >
              <Share className="w-5 h-5" />
            </button>
            <button 
              onClick={clearHistory}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
              aria-label="Clear history"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400 mt-10">
          <Box className="w-12 h-12 mb-4 opacity-20" />
          <p>No items scanned yet.</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {history.map((record) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={record.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4 items-center"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                {record.product.imageUrl ? (
                  <img src={record.product.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <Box className="w-5 h-5 text-gray-300" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {record.product.name}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 font-medium">
                  <span className="font-mono bg-gray-100 px-1 rounded">{record.product.upc}</span>
                  <span>{formatDate(record.timestamp)}</span>
                </div>
                {record.location && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-500 font-medium bg-indigo-50 px-1.5 py-0.5 rounded w-max">
                    <MapPin className="w-3 h-3" />
                    Geo-tagged
                  </div>
                )}
              </div>
              <button 
                onClick={() => removeScan(record.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0 ml-1"
                aria-label="Remove record"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
