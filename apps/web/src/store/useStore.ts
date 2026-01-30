import { create } from 'zustand';

interface AppState {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    // storedBookmarks will be loaded from DB, but UI state lives here
}

export const useStore = create<AppState>((set) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
}));
