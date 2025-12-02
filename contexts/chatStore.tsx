import React from 'react';
import { create } from '../utils/zustandLite';
import { ChatMessage } from '../types';

interface ChatState {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
}

const initialMessage: ChatMessage = {
  id: 'initial',
  sender: 'ai',
  text: 'سلام! خوش آمدید. چطور می‌توانم در مدیریت کارهایتان به شما کمک کنم؟'
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [initialMessage],
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set(({ messages }) => ({ messages: [...messages, message] }))
}));

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

