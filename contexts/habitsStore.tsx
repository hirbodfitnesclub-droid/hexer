import React, { useEffect } from 'react';
import { create } from '../utils/zustandLite';
import { Habit } from '../types';
import * as habitService from '../services/habitService';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface HabitState {
  habits: Habit[];
  loading: boolean;
  fetchHabits: () => Promise<void>;
  addHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completedDates'>) => Promise<void>;
  updateHabit: (habit: Habit | Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (habitId: string, date: string) => Promise<void>;
  hydrateFromRealtime: () => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  loading: false,
  fetchHabits: async () => {
    set({ loading: true });
    try {
      const data = await habitService.getHabits();
      set({ habits: data });
    } finally {
      set({ loading: false });
    }
  },
  addHabit: async (habit) => {
    const newHabit = await habitService.createHabit(habit);
    set(({ habits }) => ({ habits: habits.some(h => h.id === newHabit.id) ? habits : [newHabit, ...habits] }));
  },
  updateHabit: async (habit) => {
    if (!habit.id) return;
    const updated = await habitService.updateHabit(habit.id, habit);
    set(({ habits }) => ({ habits: habits.map(h => h.id === updated.id ? { ...updated, completedDates: h.completedDates } : h) }));
  },
  deleteHabit: async (id) => {
    await habitService.deleteHabit(id);
    set(({ habits }) => ({ habits: habits.filter(h => h.id !== id) }));
  },
  toggleHabit: async (habitId, date) => {
    const original = get().habits;
    set(({ habits }) => ({
      habits: habits.map(h => h.id === habitId ? {
        ...h,
        completedDates: h.completedDates.includes(date)
          ? h.completedDates.filter(d => d !== date)
          : [...h.completedDates, date]
      } : h)
    }));

    try {
      await habitService.toggleHabitCompletion(habitId, date);
    } catch (error) {
      set({ habits: original });
      throw error;
    }
  },
  hydrateFromRealtime: async () => {
    const data = await habitService.getHabits();
    set({ habits: data });
  }
}));

export const HabitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { fetchHabits, hydrateFromRealtime } = useHabitStore;

  useEffect(() => {
    if (!user) return;
    fetchHabits();

    const habitsChannel = supabase
      .channel('habits-store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, hydrateFromRealtime)
      .subscribe();

    const completionChannel = supabase
      .channel('habit-completions-store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, hydrateFromRealtime)
      .subscribe();

    return () => {
      supabase.removeChannel(habitsChannel);
      supabase.removeChannel(completionChannel);
    };
  }, [user, fetchHabits, hydrateFromRealtime]);

  return <>{children}</>;
};

