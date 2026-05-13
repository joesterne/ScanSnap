import { useState } from 'react';
import { BottomNav, type TabType } from './components/BottomNav';
import { ScanView } from './views/ScanView';
import { HistoryView } from './views/HistoryView';
import { InventoryView } from './views/InventoryView';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scan');

  return (
    <div className="fixed inset-0 flex flex-col bg-white text-gray-900 font-sans overflow-hidden sm:max-w-md sm:mx-auto sm:border-x sm:border-gray-200">
      {/* Dynamic View container */}
      <div className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
        {activeTab === 'scan' && <ScanView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'inventory' && <InventoryView />}
      </div>

      {/* Navigation */}
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
