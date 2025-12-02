import React from 'react';
import { create } from '../utils/zustandLite';
import { Page, Task, Note, Project, Habit } from '../types';

interface UIState {
  currentPage: Page;
  selectedDate: Date;
  editingTask: Task | Partial<Task> | null;
  editingNote: Note | Partial<Note> | null;
  editingProject: Partial<Project> | null;
  editingHabit: Habit | Partial<Habit> | null;
  setPage: (page: Page) => void;
  setSelectedDate: (date: Date) => void;
  setEditingTask: (task: Task | Partial<Task> | null) => void;
  setEditingNote: (note: Note | Partial<Note> | null) => void;
  setEditingProject: (project: Partial<Project> | null) => void;
  setEditingHabit: (habit: Habit | Partial<Habit> | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: Page.Dashboard,
  selectedDate: new Date(),
  editingTask: null,
  editingNote: null,
  editingProject: null,
  editingHabit: null,
  setPage: (currentPage) => set({ currentPage }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setEditingTask: (editingTask) => set({ editingTask }),
  setEditingNote: (editingNote) => set({ editingNote }),
  setEditingProject: (editingProject) => set({ editingProject }),
  setEditingHabit: (editingHabit) => set({ editingHabit })
}));

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

