import { supabase } from './supabaseClient';
import { Project } from '../types';

type ProjectInsert = Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type ProjectUpdate = Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

interface ProjectQueryOptions {
  limit?: number;
  offset?: number;
  userId?: string;
}

export const getProjects = async ({ limit = 20, offset = 0, userId }: ProjectQueryOptions = {}) => {
  const query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) query.eq('user_id', userId);

  const { data, error } = await query.range(offset, offset + limit);

  if (error) throw error;

  const items = (data as Project[]) || [];
  return {
    items: items.slice(0, limit),
    hasMore: items.length > limit
  };
};

export const createProject = async (project: ProjectInsert) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('projects')
    .insert([{ ...project, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const updateProject = async (id: string, updates: ProjectUpdate) => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const deleteProject = async (id: string) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
