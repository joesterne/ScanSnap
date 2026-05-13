import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface ProductData {
  upc: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  category?: string;
  description?: string;
  ingredients?: string;
  nutritionInfo?: string;
}

export interface ScanRecord {
  id: string;
  timestamp: number;
  product: ProductData;
  location?: LocationData;
}

export interface InventoryItem {
  id: string;
  product: ProductData;
  quantity: number;
  addedAt: number;
  lastUpdated: number;
}

interface AppState {
  history: ScanRecord[];
  inventory: InventoryItem[];
  addScan: (scan: Omit<ScanRecord, 'id'>) => void;
  clearHistory: () => void;
  removeScan: (id: string) => void;
  addToInventory: (product: ProductData) => void;
  updateInventoryQuantity: (id: string, delta: number) => void;
  removeFromInventory: (id: string) => void;
  removeMultipleFromInventory: (ids: string[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      history: [],
      inventory: [],
      addScan: (scan) =>
        set((state) => ({
          history: [
            { ...scan, id: crypto.randomUUID() },
            ...state.history,
          ],
        })),
      clearHistory: () => set({ history: [] }),
      removeScan: (id) =>
        set((state) => ({
          history: state.history.filter((record) => record.id !== id),
        })),
      addToInventory: (product) =>
        set((state) => {
          const existingItemIndex = state.inventory.findIndex(
            (item) => item.product.upc === product.upc
          );

          if (existingItemIndex >= 0) {
            const newInventory = [...state.inventory];
            newInventory[existingItemIndex].quantity += 1;
            newInventory[existingItemIndex].lastUpdated = Date.now();
            return { inventory: newInventory };
          }

          return {
            inventory: [
              ...state.inventory,
              {
                id: crypto.randomUUID(),
                product,
                quantity: 1,
                addedAt: Date.now(),
                lastUpdated: Date.now(),
              },
            ],
          };
        }),
      updateInventoryQuantity: (id, delta) =>
        set((state) => ({
          inventory: state.inventory.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                quantity: Math.max(0, item.quantity + delta),
                lastUpdated: Date.now(),
              };
            }
            return item;
          }),
        })),
      removeFromInventory: (id) =>
        set((state) => ({
          inventory: state.inventory.filter((item) => item.id !== id),
        })),
      removeMultipleFromInventory: (ids) =>
        set((state) => ({
          inventory: state.inventory.filter((item) => !ids.includes(item.id)),
        })),
    }),
    {
      name: 'scanory-storage',
    }
  )
);
