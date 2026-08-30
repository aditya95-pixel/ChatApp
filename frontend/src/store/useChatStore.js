import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  smartReplies: [],
  isSmartRepliesLoading: false,

  setSmartReplies: (replies) => set({ smartReplies: replies }),

  getSmartReplies: async (incomingText) => {
    try {
      set({ isSmartRepliesLoading: true });
      const { messages } = get();
      const myMessages = messages
        .filter((m) => m.senderId === useAuthStore.getState().authUser._id && m.text)
        .slice(-2)
        .map((m) => m.text);

      const res = await axiosInstance.post("/messages/smart-replies", {
        incomingMessage: incomingText,
        previousMessages: myMessages,
      });

      set({ smartReplies: res.data, isSmartRepliesLoading: false });
    } catch (error) {
      set({ smartReplies: [], isSmartRepliesLoading: false });
    }
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  deleteMessage: async (messageId, type) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}?type=${type}`);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? type === "everyone"
              ? { ...msg, isDeletedForEveryone: true }
              : null
            : msg
        ).filter(Boolean)
      }));
    } catch (error) {
      console.error(error);
    }
  },

  isTyping: false,

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageDeleted");
    socket.off("typing");
    socket.off("stopTyping");

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;

      if (isMessageSentFromSelectedUser) {
        set({
          messages: [...get().messages, { ...newMessage, isRead: true }],
        });

        if (newMessage.text) {
          get().getSmartReplies(newMessage.text);
        }

        axiosInstance.put(`/messages/mark-as-read/${selectedUser._id}`).then(() => {
          socket.emit("messagesRead", { senderId: selectedUser._id });
        }).catch((err) => {
          console.error(err);
        });
      } else {
        set({
          users: get().users.map((user) => {
            if (user._id === newMessage.senderId) {
              return { ...user, unreadCount: (user.unreadCount || 0) + 1 };
            }
            return user;
          }),
        });
      }
    });

    socket.on("typing", ({ senderId }) => {
      const { selectedUser } = get();
      if (selectedUser && selectedUser._id === senderId) {
        set({ isTyping: true });
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      const { selectedUser } = get();
      if (selectedUser && selectedUser._id === senderId) {
        set({ isTyping: false });
      }
    });

    socket.on("messagesRead", ({ readerId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.senderId === useAuthStore.getState().authUser._id
            ? { ...msg, isRead: true }
            : msg
        ),
      }));
    });

    socket.on("messageDeleted", ({ messageId, updatedMessage }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? updatedMessage : msg
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messagesRead");
      socket.off("messageDeleted");
      socket.off("typing");
      socket.off("stopTyping");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageDeleted");

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;

      if (isMessageSentFromSelectedUser) {
        set({
          messages: [...get().messages, { ...newMessage, isRead: true }],
        });

        if (newMessage.text) {
          get().getSmartReplies(newMessage.text);
        }

        axiosInstance.put(`/messages/mark-as-read/${selectedUser._id}`).then(() => {
          socket.emit("messagesRead", { senderId: selectedUser._id });
        }).catch((err) => {
          console.error(err);
        });
      } else {
        set({
          users: get().users.map((user) => {
            if (user._id === newMessage.senderId) {
              return { ...user, unreadCount: (user.unreadCount || 0) + 1 };
            }
            return user;
          }),
        });
      }
    });

    socket.on("messagesRead", ({ readerId }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.senderId === useAuthStore.getState().authUser._id
            ? { ...msg, isRead: true }
            : msg
        ),
      }));
    });

    socket.on("messageDeleted", ({ messageId, updatedMessage }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? updatedMessage : msg
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messagesRead");
      socket.off("messageDeleted");
    }
  },

  setSelectedUser: async (selectedUser) => {
    set({ selectedUser });
    if (!selectedUser) return;

    set({
      users: get().users.map((user) =>
        user._id === selectedUser._id ? { ...user, unreadCount: 0 } : user
      ),
    });

    try {
      await axiosInstance.put(`/messages/mark-as-read/${selectedUser._id}`);
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("messagesRead", { senderId: selectedUser._id });
      }
    } catch (error) {
      console.error(error);
    }
  },
}));
