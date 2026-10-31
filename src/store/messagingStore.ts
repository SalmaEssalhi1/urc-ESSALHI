
import { create } from "zustand";
import type { PublicUser } from "../user/usersApi";

export interface Message {
    id?: string;
    senderId: number;
    senderUsername: string;
    content: string;
    createdAt: string;
    reactions?: Record<string, number[]>;
}

interface MessagingState {
    users: PublicUser[];
    selectedUser: PublicUser | null;
    messages: Message[];

    setUsers: (users: PublicUser[]) => void;
    selectUser: (user: PublicUser | null) => void;
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    clearMessages: () => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
    users: [],
    selectedUser: null,
    messages: [],

    setUsers: (users) => set({ users }),

    selectUser: (selectedUser) => set({ selectedUser, messages: [] }),

    setMessages: (messages) => set({ messages }),

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
        })),

    clearMessages: () => set({ messages: [] }),
}));
