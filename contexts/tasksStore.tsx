import React, { useEffect } from 'react';
import { create } from '../utils/zustandLite';
import { Task } from '../types';
import * as taskService from '../services/taskService';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'completed_at'>) => Promise<Task | void>;
  updateTask: (task: Task | Partial<Task>) => Promise<Task | void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  hydrateFromRealtime: (payload: any) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  fetchTasks: async () => {
    set({ loading: true });
    try {
      const data = await taskService.getTasks();
      set({ tasks: data });
    } finally {
      set({ loading: false });
    }
  },
  addTask: async (task) => {
    const newTask = await taskService.createTask(task);
    set(({ tasks }) => ({ tasks: tasks.some(t => t.id === newTask.id) ? tasks : [newTask, ...tasks] }));
    return newTask;
  },
  updateTask: async (task) => {
    if (!task.id) return;
    const updated = await taskService.updateTask(task.id, task);
    set(({ tasks }) => ({ tasks: tasks.map(t => t.id === updated.id ? updated : t) }));
    return updated;
  },
  deleteTask: async (id) => {
    await taskService.deleteTask(id);
    set(({ tasks }) => ({ tasks: tasks.filter(t => t.id !== id) }));
  },
  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const completed_at = newStatus === 'done' ? new Date().toISOString() : null;
    const updatedTask = await taskService.updateTask(id, { status: newStatus, completed_at });
    set(({ tasks }) => ({ tasks: tasks.map(t => t.id === id ? updatedTask : t) }));
  },
  hydrateFromRealtime: (payload) => {
    const { eventType, new: newRow, old } = payload;
    set(({ tasks }) => {
      if (eventType === 'INSERT') {
        if (tasks.some(t => t.id === newRow.id)) return { tasks };
        return { tasks: [newRow as Task, ...tasks] };
      }
      if (eventType === 'UPDATE') {
        return { tasks: tasks.map(t => t.id === newRow.id ? newRow as Task : t) };
      }
      if (eventType === 'DELETE') {
        return { tasks: tasks.filter(t => t.id !== old.id) };
      }
      return { tasks };
    });
  }
}));

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { fetchTasks, hydrateFromRealtime } = useTaskStore;

  useEffect(() => {
    if (!user) return;
    fetchTasks();

    const subscription = supabase
      .channel('tasks-store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, hydrateFromRealtime)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, fetchTasks, hydrateFromRealtime]);

  return <>{children}</>;
};

