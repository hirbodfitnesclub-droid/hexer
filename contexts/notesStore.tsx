import React, { useEffect } from 'react';
import { create } from '../utils/zustandLite';
import { Note } from '../types';
import * as noteService from '../services/noteService';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface NoteState {
  notes: Note[];
  loading: boolean;
  fetchNotes: () => Promise<void>;
  addNote: (note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateNote: (note: Note | Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  hydrateFromRealtime: (payload: any) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  loading: false,
  fetchNotes: async () => {
    set({ loading: true });
    try {
      const data = await noteService.getNotes();
      set({ notes: data });
    } finally {
      set({ loading: false });
    }
  },
  addNote: async (note) => {
    const newNote = await noteService.createNote(note);
    set(({ notes }) => ({ notes: notes.some(n => n.id === newNote.id) ? notes : [newNote, ...notes] }));
  },
  updateNote: async (note) => {
    if (!note.id) return;
    const updated = await noteService.updateNote(note.id, note);
    set(({ notes }) => ({ notes: notes.map(n => n.id === updated.id ? updated : n) }));
  },
  deleteNote: async (id) => {
    await noteService.deleteNote(id);
    set(({ notes }) => ({ notes: notes.filter(n => n.id !== id) }));
  },
  hydrateFromRealtime: (payload) => {
    const { eventType, new: newRow, old } = payload;
    set(({ notes }) => {
      if (eventType === 'INSERT') {
        if (notes.some(n => n.id === newRow.id)) return { notes };
        return { notes: [newRow as Note, ...notes] };
      }
      if (eventType === 'UPDATE') {
        return { notes: notes.map(n => n.id === newRow.id ? newRow as Note : n) };
      }
      if (eventType === 'DELETE') {
        return { notes: notes.filter(n => n.id !== old.id) };
      }
      return { notes };
    });
  }
}));

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { fetchNotes, hydrateFromRealtime } = useNoteStore;

  useEffect(() => {
    if (!user) return;
    fetchNotes();

    const subscription = supabase
      .channel('notes-store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, hydrateFromRealtime)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user, fetchNotes, hydrateFromRealtime]);

  return <>{children}</>;
};

