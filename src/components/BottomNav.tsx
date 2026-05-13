import { ScanLine, Clock, Package } from 'lucide-react';
import { cn } from '../lib/utils';

export type TabType = 'scan' | 'history' | 'inventory';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const tabs = [
    { id: 'scan' as TabType, label: 'Scan', icon: ScanLine },
    { id: 'history' as TabType, label: 'History', icon: Clock },
    { id: 'inventory' as TabType, label: 'Inventory', icon: Package },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-50 sm:absolute" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16 sm:h-14">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
              activeTab === id ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {activeTab === id && (
              <span className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full"></span>
            )}
            <Icon className="w-5 h-5" strokeWidth={activeTab === id ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
