import React, { useState, useEffect } from 'react';
import { Task, Priority, Project, Note } from '../types';
import { XIcon, TrashIcon, CheckIcon, CalendarIcon, FlagIcon, BriefcaseIcon, NotebookIcon, ChevronDownIcon } from './icons';

interface TaskEditorModalProps {
  task: Task | Partial<Task>;
  isOpen: boolean;
  projects: Project[];
  notes: Note[];
  onClose: () => void;
  onSave: (task: Task | Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  [Priority.High]: { label: 'زیاد', color: 'red', text: 'text-red-300', bg: 'bg-red-500/20' },
  [Priority.Medium]: { label: 'متوسط', color: 'yellow', text: 'text-yellow-300', bg: 'bg-yellow-500/20' },
  [Priority.Low]: { label: 'کم', color: 'sky', text: 'text-sky-300', bg: 'bg-sky-500/20' },
};

const TaskEditorModal: React.FC<TaskEditorModalProps> = ({ task, isOpen, projects, notes, onClose, onSave, onDelete }) => {
    const [formState, setFormState] = useState<Task | Partial<Task>>(task);
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            setFormState(task);
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, task]);

    const handleClose = () => {
        if (formState.title?.trim()) {
            onSave(formState);
        }
        onClose();
    };

    const handleDelete = () => {
        if ('id' in formState && formState.id) {
            onDelete(formState.id);
        }
        onClose();
    };

    const PropertyRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode; }> = ({ icon, label, children }) => (
        <div className="flex items-center p-2 rounded-lg transition-colors min-h-[44px]">
            <div className="flex items-center gap-3 w-28 flex-shrink-0 text-sm text-slate-400">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex-1 text-sm text-slate-200 font-medium">
                {children}
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex justify-center items-center p-2 sm:p-4" role="dialog" aria-modal="true" onClick={handleClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`bg-slate-900/70 border border-slate-700/80 w-full max-w-xl rounded-2xl shadow-2xl transition-all duration-300 ease-out flex flex-col max-h-[90vh] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            >
                {/* Header & Main Inputs */}
                <div className="p-4 sm:p-6 flex-shrink-0">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => setFormState(s => ({ ...s, status: s.status === 'done' ? 'todo' : 'done', completed_at: s.completed_at ? null : new Date().toISOString() }))}
                            className={`mt-1.5 w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${formState.status === 'done' ? 'bg-sky-500 border-sky-400' : 'border-slate-600 hover:border-sky-500'}`}
                        >
                            {formState.status === 'done' && <CheckIcon className="w-4 h-4 text-white"/>}
                        </button>
                        <div className="flex-1">
                            <input
                                value={formState.title || ''}
                                onChange={e => setFormState(s => ({ ...s, title: e.target.value }))}
                                placeholder="عنوان کار"
                                className="w-full bg-transparent text-xl font-semibold text-slate-100 placeholder-slate-500 focus:outline-none"
                            />
                            <textarea
                                value={formState.description || ''}
                                onChange={e => setFormState(s => ({ ...s, description: e.target.value }))}
                                placeholder="توضیحات..."
                                className="w-full bg-transparent mt-2 text-sm text-slate-400 placeholder-slate-500 focus:outline-none resize-none min-h-[40px]"
                                rows={2}
                            />
                        </div>
                         <div className="flex items-center gap-1">
                            <button disabled={!task.id} onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="w-5 h-5"/></button>
                            <button onClick={handleClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><XIcon className="w-6 h-6"/></button>
                         </div>
                    </div>
                </div>

                {/* Properties Section */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-6 border-t border-slate-800/60 bg-slate-950/30 space-y-2">
                        <PropertyRow icon={<CalendarIcon className="w-5 h-5" />} label="تاریخ">
                             <input type="date" value={formState.due_date?.split('T')[0] || ''} onChange={e => setFormState(s => ({...s, due_date: e.target.value}))} className="bg-slate-800/60 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 w-full text-sm font-medium"/>
                        </PropertyRow>
                         <PropertyRow icon={<FlagIcon className="w-5 h-5" />} label="اولویت">
                            <div className="flex gap-2">
                                 {Object.values(Priority).map(p => (
                                    <button key={p} onClick={() => setFormState(s => ({...s, priority: p}))} className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${formState.priority === p ? `${priorityConfig[p].bg} ${priorityConfig[p].text} ring-1 ring-inset ring-current` : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>{p}</button>
                                ))}
                            </div>
                        </PropertyRow>
                        <PropertyRow icon={<BriefcaseIcon className="w-5 h-5" />} label="پروژه">
                            <div className="relative">
                                <select value={formState.project_id || ''} onChange={e => setFormState(s => ({...s, project_id: e.target.value || undefined}))} className="bg-slate-800/60 px-3 py-1.5 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 w-full text-sm font-medium appearance-none cursor-pointer">
                                    <option value="" className="bg-slate-900">بدون پروژه</option>
                                    {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.title}</option>)}
                                </select>
                                <ChevronDownIcon className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
                            </div>
                        </PropertyRow>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskEditorModal;
