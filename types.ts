import { User } from '@supabase/supabase-js';

export type AppUser = User;

// Based on your SQL Schema
// Note: enums are handled as string types here, validation will be on the backend/forms.

export interface Project {
  id: string; // uuid
  user_id: string; // uuid
  title: string; // text
  description?: string | null; // text
  status?: string | null; // text, e.g., 'active'
  priority?: string | null; // text, e.g., 'medium'
  due_date?: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  color?: string | null; // Custom field, not in your schema but kept from UI
}

export interface Task {
  id: string; // uuid
  user_id: string; // uuid
  project_id?: string | null; // uuid
  title: string; // text
  description?: string | null; // text
  status?: string | null; // text, e.g., 'todo', 'inprogress', 'done'
  priority?: string | null; // text, e.g., 'medium'
  due_date?: string | null; // timestamptz
  completed_at?: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  // FIX: Added tags to Task type as it's used in components.
  tags?: string[] | null;
}

export interface Note {
  id: string; // uuid
  user_id: string; // uuid
  title: string; // text
  content?: string | null; // text
  tags?: string[] | null; // text[]
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  project_id?: string | null; // Custom field for linking, not in your schema but kept
}

export interface Habit {
  id: string; // uuid
  user_id: string; // uuid
  // FIX: Renamed title to name to match usage in the app and AI service.
  name: string; // text
  description?: string | null; // text
  frequency?: string | null; // text, e.g., 'daily'
  target_count?: number | null; // integer
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  // FIX: Added completedDates to Habit type as it's heavily used in the UI.
  completedDates: string[];
}

// Join table types
export interface TaskNoteLink {
    id: string; // uuid
    task_id: string; // uuid
    note_id: string; // uuid
    created_at: string; // timestamptz
}

export interface NoteNoteLink {
    id: string; // uuid
    source_note_id: string; // uuid
    target_note_id: string; // uuid
    created_at: string; // timestamptz
}


// --- App Specific Types ---

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  relatedItems?: { type: 'task' | 'note' | 'project' | 'habit', id: string }[];
}

export enum Page {
  Dashboard = 'داشبورد',
  Tasks = 'کارها',
  Notes = 'یادداشت‌ها',
  Projects = 'پروژه‌ها',
  Chat = 'چت',
}

// Deprecated, will be removed soon.
export enum Priority {
  Low = 'کم',
  Medium = 'متوسط',
  High = 'زیاد',
}
