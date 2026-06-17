import { create } from "zustand";
import type { Habit, Settings } from "@/types/database";

interface AppState {
  habit: Habit | null;
  settings: Settings | null;
  isUnlocked: boolean;
  setHabit: (habit: Habit | null) => void;
  setSettings: (settings: Settings | null) => void;
  setUnlocked: (unlocked: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  habit: null,
  settings: null,
  isUnlocked: false,
  setHabit: (habit) => set({ habit }),
  setSettings: (settings) => set({ settings }),
  setUnlocked: (isUnlocked) => set({ isUnlocked }),
}));
