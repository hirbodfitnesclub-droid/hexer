
import React, { useMemo, useState } from 'react';
import { Task, Note, Priority, Project, Habit } from '../types';
import { PlusIcon, ListChecksIcon, BriefcaseIcon, CheckIcon, FlameIcon, NotebookIcon, UserIcon, LogOutIcon, BellIcon, MoonIcon, ShieldIcon, XIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { User } from '@supabase/supabase-js';
import { formatPersianDate, toJalaali, persianMonths } from '../utils/dateUtils';

interface DashboardProps {
  tasks: Task[];
  notes: Note[];
  projects: Project[];
  habits: Habit[];
  toggleHabitCompletion: (habitId: string, date: string) => void;
  toggleTaskCompletion: (taskId: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'completed_at'>) => void;
  addNote: (note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

// --- Helper Functions ---
const getDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

// --- Generic Widget Wrapper ---
const Widget: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
  <div className={`bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/30 ${className}`}>
    {children}
  </div>
);

// --- Profile Modal ---
const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User | null; signOut: () => void }> = ({ isOpen, onClose, user, signOut }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-br from-indigo-900 to-purple-900 p-6 pt-10 text-center">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                    <div className="w-20 h-20 mx-auto bg-gray-950 rounded-full flex items-center justify-center border-4 border-gray-900 shadow-xl mb-3 relative group cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500 to-fuchsia-500 rounded-full opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <span className="text-3xl font-bold text-white relative z-10">
                            {user?.email?.[0].toUpperCase() || <UserIcon className="w-10 h-10"/>}
                        </span>
                    </div>
                    <h3 className="text-white font-bold text-lg truncate px-4">{user?.email}</h3>
                    <div className="inline-block mt-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-semibold text-sky-200 border border-white/10">
                        نسخه رایگان
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Dummy Info Section */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">نام و نام خانوادگی</label>
                            <input disabled type="text" placeholder="نام خود را وارد کنید" className="w-full bg-gray-800/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">شماره موبایل</label>
                            <input disabled type="text" placeholder="0912..." className="w-full bg-gray-800/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
                        </div>
                    </div>

                    <div className="h-px bg-white/5 my-2"></div>

                    {/* Settings Placeholders */}
                    <div className="space-y-1">
                        <button disabled className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-not-allowed opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:text-indigo-300">
                                    <ShieldIcon className="w-5 h-5" />
                                </div>
                                <span className="text-sm text-gray-300">امنیت حساب</span>
                            </div>
                        </button>
                        <button disabled className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-not-allowed opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400 group-hover:text-yellow-300">
                                    <BellIcon className="w-5 h-5" />
                                </div>
                                <span className="text-sm text-gray-300">اعلان‌ها</span>
                            </div>
                        </button>
                        <button disabled className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-not-allowed opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 group-hover:text-sky-300">
                                    <MoonIcon className="w-5 h-5" />
                                </div>
                                <span className="text-sm text-gray-300">ظاهر برنامه</span>
                            </div>
                        </button>
                    </div>

                    <button 
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 p-3 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all font-semibold text-sm"
                    >
                        <LogOutIcon className="w-4 h-4" />
                        <span>خروج از حساب</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Header ---
const DashboardHeader: React.FC<{ user: User | null; onOpenProfile: () => void }> = ({ user, onOpenProfile }) => (
    <header className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-white">داشبورد</h1>
            <p className="text-gray-400 mt-1 text-sm">مرکز فرماندهی هوشمند شما.</p>
        </div>
        <button 
            onClick={onOpenProfile}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform group"
            aria-label="پروفایل کاربری"
        >
            <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden relative">
                {user?.email?.[0].toUpperCase() || <UserIcon className="w-6 h-6"/>}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </button>
    </header>
);

// --- Calendar ---
const WeekCalendar: React.FC<{ selectedDate: Date; onDateChange: (date: Date) => void; }> = ({ selectedDate, onDateChange }) => {
    const weekDays = useMemo(() => {
        const days = [];
        const today = new Date();
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(startOfWeek.getDate() - 3);

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            days.push({
                date,
                isToday: isSameDay(date, today),
                isSelected: isSameDay(date, selectedDate),
                dayName: date.toLocaleDateString('fa-IR', { weekday: 'short' }),
                dayNumber: date.toLocaleDateString('fa-IR', { day: 'numeric' }),
            });
        }
        return days;
    }, [selectedDate]);

    const headerInfo = useMemo(() => {
        const j = toJalaali(selectedDate);
        return `${persianMonths[j.jm - 1]} ${j.jy}`;
    }, [selectedDate]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-center px-2">
                <span className="text-sm font-bold text-gray-400">{headerInfo}</span>
            </div>
            <div className="grid grid-cols-7 gap-2 md:gap-3">
                {weekDays.map(({ date, isSelected, dayNumber, dayName, isToday }) => (
                    <button
                        key={date.toISOString()}
                        onClick={() => onDateChange(date)}
                        className="relative flex flex-col justify-center items-center h-20 w-full rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-fuchsia-500"
                        aria-label={`انتخاب تاریخ ${formatPersianDate(date)}`}
                        aria-pressed={isSelected}
                    >
                        <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${isSelected ? 'bg-fuchsia-600/80 shadow-lg shadow-fuchsia-900/50' : `bg-gray-800/50 ${!isToday && 'hover:bg-gray-800/80'}`}`}></div>
                        {isToday && !isSelected && (
                            <div className="absolute inset-0 rounded-2xl border-2 border-sky-500/50 pointer-events-none"></div>
                        )}
                        <span className={`relative text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{dayName}</span>
                        <span className="relative text-xl font-bold mt-1 text-white">{dayNumber}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- New Dashboard Widgets ---

const TodaysPlan: React.FC<{
  tasks: Task[];
  selectedDate: Date;
  toggleTaskCompletion: (id: string) => void;
}> = ({ tasks, selectedDate, toggleTaskCompletion }) => {
    const todaysTasks = useMemo(() => {
        const selectedDateStr = getDateString(selectedDate);
        return tasks.filter(t => t.due_date && t.due_date.startsWith(selectedDateStr))
                    .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));
    }, [tasks, selectedDate]);

    return (
        <Widget>
            <h2 className="text-lg font-bold text-white mb-4">برنامه امروز</h2>
            {todaysTasks.length > 0 ? (
                <div className="max-h-64 overflow-y-auto pr-2 space-y-3">
                    {todaysTasks.map(task => (
                        <div key={task.id} className={`flex items-center gap-3 transition-opacity ${task.status === 'done' ? 'opacity-50' : ''}`}>
                            <button
                                onClick={() => toggleTaskCompletion(task.id)}
                                className={`w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${task.status === 'done' ? 'bg-sky-500 border-sky-400' : 'border-gray-600 hover:border-sky-500'}`}
                                aria-label={task.status === 'done' ? `لغو انجام ${task.title}` : `انجام ${task.title}`}
                            >
                                {task.status === 'done' && <CheckIcon className="w-3.5 h-3.5 text-white"/>}
                            </button>
                            <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{task.title}</span>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === Priority.High ? 'bg-red-400' : task.priority === Priority.Medium ? 'bg-yellow-400' : 'bg-sky-400'}`}></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500 text-sm">
                    <ListChecksIcon className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                    <p>در این تاریخ کاری ثبت نشده است.</p>
                </div>
            )}
        </Widget>
    );
};

const TodaysNotes: React.FC<{ notes: Note[]; selectedDate: Date }> = ({ notes, selectedDate }) => {
    const todaysNotes = useMemo(() => {
        return notes.filter(n => isSameDay(new Date(n.created_at), selectedDate));
    }, [notes, selectedDate]);

    return (
        <div className="bg-black/30 rounded-2xl p-4 shadow-inner ring-1 ring-black/20 flex gap-4 h-40">
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 text-center text-gray-400 border-l border-white/10 pr-2">
                <NotebookIcon className="w-10 h-10 mb-2" />
                <span className="text-xs font-semibold">یادداشت ها</span>
            </div>
            <div className="flex-1 overflow-hidden flex items-center">
                {todaysNotes.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 -mb-2 w-full">
                        {todaysNotes.map(note => (
                            <div key={note.id} className="w-48 h-28 flex-shrink-0 bg-gray-800/60 p-3 rounded-lg border border-white/5 flex flex-col">
                                <h4 className="font-semibold text-sm text-gray-200 truncate">{note.title}</h4>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-3 flex-1">{note.content}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center w-full">
                        <p className="text-gray-600 text-sm">امروز یادداشتی ثبت نشده.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const QuickCapture: React.FC<{
    onAddTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'completed_at'>) => void;
    onAddNote: (note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
    selectedDate: Date;
}> = ({ onAddTask, onAddNote, selectedDate }) => {
    const [input, setInput] = useState('');

    const handleAction = (type: 'task' | 'note') => {
        if (!input.trim()) return;
        if (type === 'task') {
            onAddTask({
                title: input,
                priority: Priority.Medium,
                tags: [],
                due_date: getDateString(selectedDate),
            });
        } else {
            onAddNote({
                title: `یادداشت سریع: ${input.substring(0, 20)}`,
                content: input,
                tags: ['سریع']
            });
        }
        setInput('');
    };

    return (
        <Widget>
            <h2 className="text-lg font-bold text-white mb-3">ثبت سریع</h2>
            <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="یک ایده، فکر یا وظیفه را سریع ثبت کن..."
                className="w-full bg-gray-800/70 p-3 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
            />
            <div className="grid grid-cols-2 gap-3 mt-3">
                <button onClick={() => handleAction('task')} disabled={!input.trim()} className="flex items-center justify-center gap-2 w-full p-2.5 bg-sky-600/80 rounded-lg text-white font-semibold hover:bg-sky-600 transition-colors disabled:bg-gray-600 disabled:opacity-50">
                    <ListChecksIcon className="w-5 h-5"/> <span>ثبت کار</span>
                </button>
                 <button onClick={() => handleAction('note')} disabled={!input.trim()} className="flex items-center justify-center gap-2 w-full p-2.5 bg-purple-600/80 rounded-lg text-white font-semibold hover:bg-purple-600 transition-colors disabled:bg-gray-600 disabled:opacity-50">
                    <NotebookIcon className="w-5 h-5"/> <span>ثبت یادداشت</span>
                </button>
            </div>
        </Widget>
    );
};

const StatsOverview: React.FC<{ tasks: Task[], projects: Project[] }> = ({ tasks, projects }) => {
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date).setHours(0,0,0,0) < today.getTime()).length;
        const highPriorityProjects = projects.filter(p => p.priority === Priority.High).length;
        const completedToday = tasks.filter(t => t.status === 'done' && t.due_date && isSameDay(new Date(t.due_date), new Date())).length;
        const inbox = tasks.filter(t => t.status !== 'done' && !t.due_date).length;
        return { overdue, highPriorityProjects, completedToday, inbox };
    }, [tasks, projects]);

    const StatCard: React.FC<{ icon: React.ReactNode; value: number; label: string; colorClass: string }> = ({ icon, value, label, colorClass }) => (
        <div className="bg-gray-800/70 p-4 rounded-xl flex items-center gap-4">
            <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg ${colorClass}`}>
                {icon}
            </div>
            <div>
                <span className="text-2xl font-bold text-white">{value}</span>
                <p className="text-xs text-gray-400">{label}</p>
            </div>
        </div>
    );
    
    return (
        <Widget>
            <h2 className="text-lg font-bold text-white mb-4">در یک نگاه</h2>
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<FlameIcon className="w-5 h-5"/>} value={stats.overdue} label="عقب افتاده" colorClass="bg-red-500/20 text-red-300"/>
                <StatCard icon={<BriefcaseIcon className="w-5 h-5"/>} value={stats.highPriorityProjects} label="پروژه مهم" colorClass="bg-yellow-500/20 text-yellow-300"/>
                <StatCard icon={<CheckIcon className="w-5 h-5"/>} value={stats.completedToday} label="انجام شده امروز" colorClass="bg-green-500/20 text-green-300"/>
                <StatCard icon={<PlusIcon className="w-5 h-5"/>} value={stats.inbox} label="بدون تاریخ" colorClass="bg-gray-500/20 text-gray-300"/>
            </div>
        </Widget>
    );
};

const HabitTracker: React.FC<{
    habits: Habit[];
    onToggle: (id: string, date: string) => void;
    selectedDate: Date;
}> = ({ habits, onToggle, selectedDate }) => {
    const selectedDateString = getDateString(selectedDate);
    if(habits.length === 0) return null;

    return (
         <Widget>
            <h2 className="text-lg font-bold text-white mb-4">رهگیر عادت‌ها</h2>
            <div className="space-y-2">
                {habits.map(habit => {
                    const isCompleted = habit.completedDates.includes(selectedDateString);
                    return (
                        <button key={habit.id} onClick={() => onToggle(habit.id, selectedDateString)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${isCompleted ? 'bg-green-500/20' : 'bg-gray-800/70 hover:bg-gray-800'}`}>
                            <div className={`w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-green-500 border-green-400' : 'border-gray-600'}`}>
                                {isCompleted && <CheckIcon className="w-4 h-4 text-white"/>}
                            </div>
                            <span className={`text-sm transition-colors duration-300 ${isCompleted ? 'text-green-300 line-through decoration-white/50' : 'text-gray-300'}`}>{habit.name}</span>
                        </button>
                    )
                })}
            </div>
        </Widget>
    );
};

const KeyProjects: React.FC<{ projects: Project[]; tasks: Task[] }> = ({ projects, tasks }) => {
    const highPriorityProjects = useMemo(() => {
        return projects
            .filter(p => p.priority === Priority.High)
            .map(p => {
                const projectTasks = tasks.filter(t => t.project_id === p.id);
                const completed = projectTasks.filter(t => t.status === 'done').length;
                const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
                return { ...p, progress, remaining: projectTasks.length - completed };
            })
            .slice(0, 3);
    }, [projects, tasks]);
    
    if (highPriorityProjects.length === 0) return null;

    return (
        <Widget>
            <h2 className="text-lg font-bold text-white mb-4">پروژه‌های کلیدی</h2>
            <div className="space-y-4">
                {highPriorityProjects.map(p => (
                    <div key={p.id}>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="font-semibold text-sm text-gray-200">{p.title}</span>
                            <span className="text-xs font-mono text-gray-400">{p.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-1.5">
                            <div className={`bg-${p.color}-500 h-1.5 rounded-full transition-all duration-500`} style={{ width: `${p.progress}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </Widget>
    );
};

// --- Main Dashboard Component ---
const Dashboard: React.FC<DashboardProps> = (props) => {
  const { tasks, notes, projects, habits, toggleHabitCompletion, toggleTaskCompletion, selectedDate, setSelectedDate, addTask, addNote } = props;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <DashboardHeader user={user} onOpenProfile={() => setIsProfileOpen(true)} />
      <WeekCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-3 space-y-6">
            <TodaysPlan tasks={tasks} selectedDate={selectedDate} toggleTaskCompletion={toggleTaskCompletion} />
            <TodaysNotes notes={notes} selectedDate={selectedDate} />
            <QuickCapture onAddTask={addTask} onAddNote={addNote} selectedDate={selectedDate} />
        </div>

        {/* Side Column */}
        <div className="lg:col-span-2 space-y-6">
            <StatsOverview tasks={tasks} projects={projects} />
            <HabitTracker habits={habits} onToggle={toggleHabitCompletion} selectedDate={selectedDate} />
            <KeyProjects projects={projects} tasks={tasks} />
        </div>
      </div>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
        signOut={signOut} 
      />
    </div>
  );
};

export default Dashboard;
