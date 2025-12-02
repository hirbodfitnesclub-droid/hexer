import React from 'react';
import { create } from '../utils/zustandLite';

export interface AppNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (message: string, type?: 'success' | 'error', action?: AppNotification['action']) => void;
  removeNotification: (id: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (message, type = 'success', action) => {
    const id = Date.now();
    set(({ notifications }) => ({
      notifications: [...notifications.filter(n => n.message !== message), { id, message, type, action }]
    }));
    setTimeout(() => {
      set(({ notifications }) => ({ notifications: notifications.filter(n => n.id !== id) }));
    }, 5000);
  },
  removeNotification: (id) => set(({ notifications }) => ({ notifications: notifications.filter(n => n.id !== id) })),
}));

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

