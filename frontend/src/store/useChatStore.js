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

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageDeleted");

    // 1. Listen for incoming messages
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;

      if (isMessageSentFromSelectedUser) {
        set({
          messages: [...get().messages, { ...newMessage, isRead: true }],
        });

        axiosInstance.put(`/messages/mark-as-read/${selectedUser._id}`).then(() => {
          socket.emit("messagesRead", { senderId: selectedUser._id });
        }).catch((err) => {
          console.error("Failed to mark message as read:", err);
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

    // 2. Listen for read receipts
    socket.on("messagesRead", ({ readerId }) => {
  set((state) => ({
    messages: state.messages.map((msg) =>
      msg.senderId === useAuthStore.getState().authUser._id
        ? { ...msg, isRead: true }
        : msg
    ),
  }));
});

    // 3. Listen for message deletion ("Delete for everyone")
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
      socket.off("messagesRead");
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
      console.error("Failed to mark messages as read:", error);
    }
  },
}));