import { supabase } from './supabaseClient';
import { Task } from '../types';

type TaskInsert = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'completed_at'>;
type TaskUpdate = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;


export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Task[];
};

export const createTask = async (task: TaskInsert): Promise<Task> => {
  const rpcParams = {
    title: task.title,
    description: task.description || null,
    project_id: task.project_id || null,
    due_date: task.due_date || null,
    priority: task.priority || 'متوسط',
    tags: task.tags || []
  };

  const { data, error } = await supabase
    .rpc('create_task_with_tags', rpcParams)
    .single();

  if (error) throw error;
  // The RPC function returns the full task object, but we need to ensure the structure matches the client-side Type.
  // The returned object from this specific RPC is already correct.
  return data as Task;
};


export const updateTask = async (id: string, updates: TaskUpdate) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
};

export const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
};