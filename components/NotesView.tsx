import React, { useState, useMemo } from 'react';
import { Note, Project, Task } from '../types';
import { TrashIcon, NotebookIcon, SearchIcon, PlusIcon, PencilIcon, LightbulbIcon, PinIcon, BookmarkIcon, TagIcon, LinkIcon } from './icons';
import NoteEditorModal from './NoteEditorModal';

// --- Helper Data & Functions ---
const projectColorText: { [key: string]: string } = {
    sky: 'text-sky-300', red: 'text-red-300', green: 'text-green-300',
    yellow: 'text-yellow-300', purple: 'text-purple-300', gray: 'text-gray-300',
};
const projectColorBg: { [key: string]: string } = {
    sky: 'bg-sky-500/10', red: 'bg-red-500/10', green: 'bg-green-500/10',
    yellow: 'bg-yellow-500/10', purple: 'bg-purple-500/10', gray: 'bg-gray-500/10',
};

const predefinedTags = [
    { name: 'ایده', icon: <LightbulbIcon className="w-4 h-4 text-yellow-300"/>, color: 'bg-yellow-500/10 text-yellow-300' },
    { name: 'مهم', icon: <PinIcon className="w-4 h-4 text-red-300"/>, color: 'bg-red-500/10 text-red-300' },
    { name: 'برای بعد', icon: <BookmarkIcon className="w-4 h-4 text-sky-300"/>, color: 'bg-sky-500/10 text-sky-300' },
];

const getTagStyle = (tagName: string) => {
    const predefined = predefinedTags.find(t => t.name === tagName);
    if (predefined) return { icon: predefined.icon, color: predefined.color };
    return { icon: <TagIcon className="w-4 h-4 text-gray-300"/>, color: 'bg-gray-500/10 text-gray-300' };
};

// --- NoteCard Component ---
const NoteCard: React.FC<{
    note: Note;
    project?: Project;
    onDelete: (id: string) => void;
    onEdit: (note: Note) => void;
}> = ({ note, project, onDelete, onEdit }) => {
    return (
        <div 
            onClick={() => onEdit(note)}
            className="group mb-4 break-inside-avoid rounded-2xl bg-gray-800/50 border border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 flex flex-col cursor-pointer"
        >
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start gap-2 mb-3">
                    <h3 className="font-bold text-gray-100 break-words">{note.title}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(note); }} className="p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-sky-400">
                            <PencilIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="p-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-red-400">
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-4">{note.content}</p>
            </div>
            
            <div className="border-t border-white/10 mt-auto px-4 py-3 space-y-3">
                 {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {note.tags.map(tag => {
                            const { icon, color } = getTagStyle(tag);
                            return (
                                <div key={tag} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
                                    {icon}
                                    <span>{tag}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                 <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        {project && (
                            <div className={`px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5 ${projectColorBg[project.color]} ${projectColorText[project.color]}`}>
                                <div className={`w-1.5 h-1.5 rounded-full bg-current`}></div>
                                {project.title}
                            </div>
                        )}
                    </div>
                    <span>{new Date(note.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
            </div>
        </div>
    );
};

// --- Main NotesView Component ---
const NotesView: React.FC<{
  notes: Note[];
  projects: Project[];
  tasks: Task[];
  deleteNote: (id: string) => void;
  addNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => void;
  updateNote: (note: Note) => void;
}> = ({ notes, projects, tasks, addNote, updateNote, deleteNote }) => {
    const [currentNote, setCurrentNote] = useState<Note | Partial<Note> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

    const openModalForNew = () => {
        setCurrentNote({ title: '', content: '', tags: [], project_id: undefined });
    };

    const openModalForEdit = (note: Note) => {
        setCurrentNote(note);
    };
    
    const closeModal = () => {
        setCurrentNote(null);
    };
    
    const handleSave = (noteToSave: Note | Partial<Note>) => {
        if (!noteToSave || (!noteToSave.title?.trim() && !noteToSave.content?.trim())) {
             if (noteToSave && 'id' in noteToSave && noteToSave.id) {
                // Do not delete if it was an existing note that became empty, user might have made a mistake.
             } else {
                 closeModal();
                 return;
             }
        }
        
        if ('id' in noteToSave && noteToSave.id) { // Editing existing note
            updateNote(noteToSave as Note);
        } else { // Adding new note
            addNote(noteToSave as Omit<Note, 'id' | 'created_at' | 'updated_at' | 'user_id'>);
        }
        closeModal();
    };

    const filteredNotes = useMemo(() => {
        if (!searchQuery) return notes;
        const lowercasedQuery = searchQuery.toLowerCase();
        return notes.filter(note => 
            note.title.toLowerCase().includes(lowercasedQuery) ||
            (note.content && note.content.toLowerCase().includes(lowercasedQuery)) ||
            (projectMap.get(note.project_id || '')?.title.toLowerCase().includes(lowercasedQuery)) ||
            (note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowercasedQuery)))
        );
    }, [notes, searchQuery, projectMap]);

  return (
    <div className="p-4 pt-8 pb-28">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-white">یادداشت‌ها</h1>
        <div className="relative w-full sm:w-auto sm:max-w-xs">
            <input 
                type="text"
                placeholder="جستجو در یادداشت‌ها..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800/70 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                <SearchIcon className="w-5 h-5" />
            </div>
        </div>
      </header>

      {filteredNotes.length > 0 ? (
        <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-4">
            {filteredNotes.map(note => (
                <NoteCard 
                    key={note.id} 
                    note={note} 
                    project={note.project_id ? projectMap.get(note.project_id) : undefined}
                    onDelete={deleteNote} 
                    onEdit={openModalForEdit}
                />
            ))}
        </div>
      ) : (
        <div className="text-center py-20 flex flex-col items-center">
            <NotebookIcon className="w-16 h-16 text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">
                {searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز یادداشتی ثبت نکرده‌اید'}
            </h3>
            <p className="text-gray-500 mt-1">
                {searchQuery ? 'عبارت جستجوی خود را تغییر دهید.' : 'برای شروع، دکمه + را بزنید.'}
            </p>
        </div>
      )}
      
       <button onClick={openModalForNew} className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:scale-110 transition-transform duration-300 z-30" aria-label="یادداشت جدید">
            <PlusIcon className="w-8 h-8"/>
       </button>
      
       {currentNote && (
            <NoteEditorModal
                note={currentNote}
                isOpen={!!currentNote}
                onClose={closeModal}
                onSave={handleSave}
                onDelete={deleteNote}
                projects={projects}
                tasks={tasks}
                allNotes={notes}
            />
        )}
    </div>
  );
};

export default NotesView;
