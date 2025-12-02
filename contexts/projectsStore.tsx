import React, { useEffect } from 'react';
import { create } from '../utils/zustandLite';
import { Project } from '../types';
import * as projectService from '../services/projectService';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProject: (project: Project | Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  hydrateFromRealtime: (payload: any) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  fetchProjects: async () => {
    set({ loading: true });
    try {
      const data = await projectService.getProjects();
      set({ projects: data });
    } finally {
      set({ loading: false });
    }
  },
  addProject: async (project) => {
    const newProject = await projectService.createProject(project);
    set(({ projects }) => ({ projects: projects.some(p => p.id === newProject.id) ? projects : [newProject, ...projects] }));
  },
  updateProject: async (project) => {
    if (!project.id) return;
    const updated = await projectService.updateProject(project.id, project);
    set(({ projects }) => ({ projects: projects.map(p => p.id === updated.id ? updated : p) }));
  },
  deleteProject: async (id) => {
    await projectService.deleteProject(id);
    set(({ projects }) => ({ projects: projects.filter(p => p.id !== id) }));
  },
  hydrateFromRealtime: (payload) => {
    const { eventType, new: newRow, old } = payload;
    set(({ projects }) => {
      if (eventType === 'INSERT') {
        if (projects.some(p => p.id === newRow.id)) return { projects };
        return { projects: [newRow as Project, ...projects] };
      }
      if (eventType === 'UPDATE') {
        return { projects: projects.map(p => p.id === newRow.id ? newRow as Project : p) };
      }
      if (eventType === 'DELETE') {
        return { projects: projects.filter(p => p.id !== old.id) };
      }
      return { projects };
    });
  }
}));

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { fetchProjects, hydrateFromRealtime } = useProjectStore;

  useEffect(() => {
    if (!user) return;
    fetchProjects();

    const subscription = supabase
      .channel('projects-store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, hydrateFromRealtime)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user, fetchProjects, hydrateFromRealtime]);

  return <>{children}</>;
};

