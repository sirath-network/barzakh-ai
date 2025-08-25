"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

// Tentukan jenis halaman pengaturan yang bisa ditampilkan
export type SettingsPageType = 'account' | 'password' | 'email' | 'billing' | 'archived';
type ViewType = 'chat' | SettingsPageType;

// Tentukan tipe untuk context kita
interface ViewContextType {
  view: ViewType;
  setView: (view: ViewType) => void;
}

// Buat context
const ViewContext = createContext<ViewContextType | undefined>(undefined);

// Buat Provider untuk membungkus aplikasi
export function ViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('chat');

  return (
    <ViewContext.Provider value={{ view: currentView, setView: setCurrentView }}>
      {children}
    </ViewContext.Provider>
  );
}

// Buat custom hook untuk mempermudah penggunaan
export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}