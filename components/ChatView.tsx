import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { BotIcon, UserIcon, SendIcon, SparklesIcon } from './icons';
import { supabase } from '../services/supabaseClient';


interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatView: React.FC<ChatViewProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = { id: `msg-${Date.now()}`, sender: 'user', text: input };
    const currentHistory = [...messages, userMessage];
    setMessages(currentHistory);
    
    const messageToSend = input;
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { message: messageToSend, history: currentHistory },
      });

      if (error) {
        throw new Error(error.message);
      }

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: data.reply || "پاسخی دریافت نشد. لطفاً دوباره تلاش کنید.",
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
  
  return (
    <div className="flex flex-col h-full bg-gray-950">
        <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-gray-700/50">
            <h1 className="text-xl font-bold text-white">چت با دستیار هوشمند</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300 flex-shrink-0"><BotIcon className="w-5 h-5" /></div>}
                <div className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-fuchsia-600 text-white rounded-br-none' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'}`}>
                   <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 flex-shrink-0"><UserIcon className="w-5 h-5"/></div>}
            </div>
            ))}
            {isLoading && (
                 <div className="flex items-start gap-3 justify-start">
                     <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300 flex-shrink-0"><SparklesIcon className="w-5 h-5 animate-pulse" /></div>
                     <div className="max-w-xs md:max-w-md px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                           <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
                           <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse delay-150"></div>
                           <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse delay-300"></div>
                        </div>
                     </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 p-4 border-t border-gray-700/50 bg-gray-950">
            <div className="flex items-center bg-gray-800 rounded-2xl p-1 border border-gray-700">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="پیام خود را بنویسید..."
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