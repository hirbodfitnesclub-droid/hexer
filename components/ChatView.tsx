
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatMode, Citation, Task, Note, ActionResult } from '../types';
import { BotIcon, UserIcon, SendIcon, SparklesIcon, TargetIcon, LightbulbIcon, PencilIcon, NotebookIcon, ListChecksIcon, LinkIcon, CheckIcon } from './icons';
import { supabase } from '../services/supabaseClient';


interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  tasks: Task[];
  notes: Note[];
  onEditTask: (task: Task) => void;
  onEditNote: (note: Note) => void;
}

const CitationCard: React.FC<{ citation: Citation, onClick: () => void }> = ({ citation, onClick }) => (
    <button onClick={onClick} className="flex items-center gap-2 bg-gray-900/50 border border-white/5 rounded-lg p-2 text-xs text-gray-400 hover:bg-gray-800 hover:text-white hover:border-sky-500/30 transition-all cursor-pointer">
        {citation.type === 'task' ? <ListChecksIcon className="w-3.5 h-3.5 text-sky-400" /> : <NotebookIcon className="w-3.5 h-3.5 text-purple-400" />}
        <span className="truncate max-w-[150px]">{citation.title}</span>
    </button>
);

const ActionResultCard: React.FC<{ result: ActionResult, onClick: () => void }> = ({ result, onClick }) => {
    const isTask = result.type === 'task';
    const title = result.data.title;
    const isCreate = result.operation === 'create';

    return (
        <button onClick={onClick} className="w-full mt-2 bg-gray-900/40 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 hover:bg-gray-900/80 transition-all text-right group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCreate ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {isTask ? <ListChecksIcon className="w-5 h-5"/> : <NotebookIcon className="w-5 h-5"/>}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
                    {isCreate ? <span className="text-green-400 font-semibold">ساخته شد</span> : <span className="text-blue-400 font-semibold">بروزرسانی شد</span>}
                    <span>•</span>
                    <span>{isTask ? 'تسک' : 'یادداشت'}</span>
                </div>
                <h4 className="font-semibold text-gray-200 truncate group-hover:text-white transition-colors">{title}</h4>
            </div>
            <div className="p-1.5 bg-gray-800 rounded-lg text-gray-500 group-hover:bg-sky-600 group-hover:text-white transition-all">
                <PencilIcon className="w-4 h-4" />
            </div>
        </button>
    )
}

const ChatView: React.FC<ChatViewProps> = ({ messages, setMessages, tasks, notes, onEditTask, onEditNote }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = { id: `msg-${Date.now()}`, sender: 'user', text: input, mode: mode };
    const currentHistory = [...messages, userMessage];
    setMessages(currentHistory);
    
    const messageToSend = input;
    const currentMode = mode;
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { message: messageToSend, history: currentHistory, mode: currentMode },
      });

      if (error) {
        throw new Error(error.message);
      }

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: data.reply || "پاسخی دریافت نشد. لطفاً دوباره تلاش کنید.",
        mode: currentMode,
        citations: data.citations, // Capture citations from backend
        actionResult: data.actionResult // Capture action result
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai-error`,
        sender: 'ai',
        text: `متاسفانه مشکلی در ارتباط با دستیار پیش آمد: ${err.message}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = (citation: Citation) => {
      if (citation.type === 'task') {
          const task = tasks.find(t => t.id === citation.id);
          if (task) onEditTask(task);
      } else {
          const note = notes.find(n => n.id === citation.id);
          if (note) onEditNote(note);
      }
  };

  const handleActionResultClick = (result: ActionResult) => {
      // Use the returned data from AI directly, but fallback to searching current state to ensure we have latest
      if (result.type === 'task') {
          const task = tasks.find(t => t.id === result.data.id) || result.data;
          onEditTask(task);
      } else if (result.type === 'note') {
           const note = notes.find(n => n.id === result.data.id) || result.data;
           onEditNote(note);
      }
  };

  const ModeChip: React.FC<{ m: ChatMode, label: string, icon: React.ReactNode }> = ({ m, label, icon }) => (
      <button 
        onClick={() => setMode(m)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
            mode === m 
            ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20' 
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
        }`}
      >
          {icon}
          <span>{label}</span>
      </button>
  );
  
  return (
    <div className="flex flex-col h-full bg-gray-950">
        <header className="flex-shrink-0 p-4 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-md">
            <h1 className="text-xl font-bold text-white mb-3">چت با دستیار هوشمند</h1>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <ModeChip m="auto" label="خودکار" icon={<SparklesIcon className="w-3.5 h-3.5" />} />
                <ModeChip m="action" label="دستور (ساخت/ویرایش)" icon={<PencilIcon className="w-3.5 h-3.5" />} />
                <ModeChip m="memory" label="حافظه (جستجو/تحلیل)" icon={<LightbulbIcon className="w-3.5 h-3.5" />} />
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300 flex-shrink-0"><BotIcon className="w-5 h-5" /></div>}
                <div className={`flex flex-col gap-2 max-w-md lg:max-w-lg ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-fuchsia-600 text-white rounded-br-none' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'}`}>
                    {msg.sender === 'ai' && msg.mode === 'memory' && (
                        <div className="flex items-center gap-1 text-xs text-sky-300 mb-2 border-b border-white/10 pb-1">
                            <LightbulbIcon className="w-3 h-3" />
                            <span>پاسخ بر اساس حافظه</span>
                        </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    
                     {/* Action Result Card */}
                     {msg.actionResult && (
                         <ActionResultCard result={msg.actionResult} onClick={() => handleActionResultClick(msg.actionResult!)} />
                     )}
                    </div>
                    
                    {/* Render Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1 px-1">
                            {msg.citations.map(citation => (
                                <CitationCard key={citation.id} citation={citation} onClick={() => handleCitationClick(citation)} />
                            ))}
                        </div>
                    )}
                </div>
                {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 flex-shrink-0"><UserIcon className="w-5 h-5"/></div>}
            </div>
            ))}
            
            {isLoading && (
                 <div className="flex items-start gap-3 justify-start">
                     <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300 flex-shrink-0"><SparklesIcon className="w-5 h-5 animate-pulse" /></div>
                     <div className="max-w-xs md:max-w-md px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                           {mode === 'memory' ? (
                               <span className="text-xs animate-pulse">در حال جستجو در حافظه...</span>
                           ) : mode === 'action' ? (
                               <span className="text-xs animate-pulse">در حال پردازش دستور...</span>
                           ) : (
                               <div className="flex gap-1">
                                   <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></div>
                                   <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce delay-100"></div>
                                   <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce delay-200"></div>
                               </div>
                           )}
                        </div>
                     </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 p-4 border-t border-gray-700/50 bg-gray-950">
            <div className="flex items-center bg-gray-800 rounded-2xl p-1 border border-gray-700 focus-within:border-sky-500/50 transition-colors">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={
                        mode === 'action' ? 'مثال: تسک خرید نان را بساز...' :
                        mode === 'memory' ? 'مثال: آیا قبلا ایده‌ای درباره سفر داشتم؟...' :
                        'پیام خود را بنویسید...'
                    }
                    className="w-full bg-transparent p-3 text-white placeholder-gray-500 focus:outline-none"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || input.trim() === ''}
                    className="p-3 bg-sky-500 rounded-xl text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
  );
};

export default ChatView;
