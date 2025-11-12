import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Note, Project, Task } from '../types';
import { XIcon, TrashIcon, BriefcaseIcon, TagIcon, ListChecksIcon, PlusIcon, ChevronDownIcon, LightbulbIcon, PinIcon, BookmarkIcon } from './icons';

interface NoteEditorModalProps {
    note: Note | Partial<Note>;
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: Note | Partial<Note>) => void;
    onDelete: (id: string) => void;
    projects: Project[];
    tasks: Task[];
    allNotes: Note[];
}

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

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ note, isOpen, onClose, onSave, onDelete, projects, tasks, allNotes }) => {
    const [formState, setFormState] = useState<Note | Partial<Note>>(note);
    const [isVisible, setIsVisible] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFormState(note);
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, note]);

    const handleClose = () => {
        if (formState.title?.trim() || formState.content?.trim()) {
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
    
    const handleNoteChange = (field: keyof Note, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    // --- Tag Management Logic ---
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        allNotes.forEach(n => {
            if (n.tags) {
                n.tags.forEach(tag => tagSet.add(tag));
            }
        });
        predefinedTags.forEach(t => tagSet.add(t.name));
        return Array.from(tagSet);
    }, [allNotes]);

    const suggestedTags = useMemo(() => {
        if (!tagInput) return allTags.filter(t => !(formState.tags || []).includes(t));
        return allTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !(formState.tags || []).includes(t));
    }, [tagInput, allTags, formState.tags]);
    
    const addTag = (tagName: string) => {
        const trimmed = tagName.trim();
        if (trimmed && !(formState.tags || []).includes(trimmed)) {
            handleNoteChange('tags', [...(formState.tags || []), trimmed]);
        }
        setTagInput('');
    };

    const removeTag = (tagName: string) => {
        handleNoteChange('tags', (formState.tags || []).filter(t => t !== tagName));
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestedTags.length > 0 && tagInput) {
                addTag(suggestedTags[0]);
            } else {
                addTag(tagInput);
            }
        } else if (e.key === 'Backspace' && tagInput === '' && formState.tags && formState.tags.length > 0) {
            removeTag(formState.tags[formState.tags.length - 1]);
        }
    };
    
    // --- End Tag Logic ---

    const PropertyRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode; }> = ({ icon, label, children }) => (
        <div className="flex items-start p-2 rounded-lg min-h-[44px]">
            <div className="flex items-center gap-3 w-28 flex-shrink-0 text-sm text-slate-400 pt-1.5">
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
                className={`bg-slate-900/70 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            >
                {/* Header & Main Inputs */}
                <div className="p-4 sm:p-6 flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <input
                            value={formState.title || ''}
                            onChange={e => handleNoteChange('title', e.target.value)}
                            placeholder="عنوان یادداشت"
                            className="w-full bg-transparent text-xl font-semibold text-slate-100 placeholder-slate-500 focus:outline-none"
                        />
                        <div className="flex items-center gap-1">
                             <button disabled={!note.id} onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="w-5 h-5"/></button>
                             <button onClick={handleClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><XIcon className="w-6 h-6"/></button>
                        </div>
                    </div>
                     <textarea
                        value={formState.content || ''}
                        onChange={e => handleNoteChange('content', e.target.value)}
                        placeholder="ایده خود را اینجا بنویسید..."
                        className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-500 focus:outline-none resize-none min-h-[15vh] sm:min-h-[20vh]"
                    />
                </div>
                
                {/* Properties Section */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-6 border-t border-slate-800/60 bg-slate-950/30 space-y-2">
                        <PropertyRow icon={<BriefcaseIcon className="w-5 h-5" />} label="پروژه">
                             <div className="relative">
                                {/* // FIX: Property 'projectId' does not exist. Use 'project_id'. */}
                                <select value={formState.project_id || ''} onChange={e => handleNoteChange('project_id', e.target.value || undefined)} className="bg-slate-800/60 px-3 py-1.5 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-sm font-medium appearance-none cursor-pointer">
                                    <option value="" className="bg-slate-900">بدون پروژه</option>
                                    {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.title}</option>)}
                                </select>
                                <ChevronDownIcon className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"/>
                            </div>
                        </PropertyRow>
                        <PropertyRow icon={<TagIcon className="w-5 h-5" />} label="تگ‌ها">
                            <div className="relative">
                                <div 
                                    className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-800/60 focus-within:ring-2 focus-within:ring-purple-500 transition-shadow"
                                    onClick={() => tagInputRef.current?.focus()}
                                >
                                    {(formState.tags || []).map(tag => {
                                        const { icon, color } = getTagStyle(tag);
                                        return (
                                            <div key={tag} className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
                                                {icon}
                                                <span>{tag}</span>
                                                <button onClick={() => removeTag(tag)} className="text-current opacity-60 hover:opacity-100 transition-all"><XIcon className="w-3 h-3"/></button>
                                            </div>
                                        );
                                    })}
                                    <input 
                                        ref={tagInputRef}
                                        type="text" 
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagInputKeyDown}
                                        onFocus={() => setIsTagPopoverOpen(true)}
                                        onBlur={() => setTimeout(() => setIsTagPopoverOpen(false), 200)}
                                        placeholder={(formState.tags && formState.tags.length > 0) ? "تگ دیگر..." : "افزودن تگ..."}
                                        className="bg-transparent focus:outline-none flex-1 min-w-[80px] text-sm text-slate-200 placeholder-slate-500"
                                    />
                                </div>
                                {isTagPopoverOpen && (
                                    <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-fade-in-fast">
                                        {tagInput === '' && predefinedTags.filter(t => !(formState.tags || []).includes(t.name)).length > 0 && (
                                            <>
                                                <p className="px-3 pt-2 pb-1 text-xs text-slate-400 font-semibold">تگ‌های سریع</p>
                                                {predefinedTags.filter(t => !(formState.tags || []).includes(t.name)).map(tag => (
                                                     <button key={tag.name} onMouseDown={() => addTag(tag.name)} className="w-full text-right flex items-center gap-2 px-3 py-2 hover:bg-slate-700">
                                                       <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${tag.color}`}>
                                                            {tag.icon}
                                                            <span>{tag.name}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                                <div className="h-px bg-slate-700/50 my-1"></div>
                                            </>
                                        )}

                                        {suggestedTags.length > 0 && (
                                            <>
                                                <p className="px-3 pt-2 pb-1 text-xs text-slate-400 font-semibold">
                                                    {tagInput === '' ? 'همه تگ‌ها' : 'تگ‌های موجود'}
                                                </p>
                                                {suggestedTags.slice(0, 10).map(tag => (
                                                    <button key={tag} onMouseDown={() => addTag(tag)} className="w-full text-right px-3 py-2 hover:bg-slate-700 text-sm text-slate-200">{tag}</button>
                                                ))}
                                            </>
                                        )}

                                        {tagInput && !allTags.includes(tagInput) && (
                                            <>
                                                {suggestedTags.length > 0 && <div className="h-px bg-slate-700/50 my-1"></div>}
                                                <button onMouseDown={() => addTag(tagInput)} className="w-full text-right px-3 py-2 hover:bg-slate-700 text-sm text-slate-200">
                                                    ساختن تگ: <span className="font-semibold">{tagInput}</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </PropertyRow>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteEditorModal;
