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

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Prevent attaching duplicate event listeners
    socket.off("newMessage");
    socket.off("messagesRead");

    // 1. Listen for incoming messages
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;

      if (isMessageSentFromSelectedUser) {
        // Appends to chat view and marks read immediately in DB
        set({
          messages: [...get().messages, { ...newMessage, isRead: true }],
        });

        axiosInstance.put(`/messages/mark-as-read/${selectedUser._id}`).then(() => {
          // Notify the sender over socket that we read their message
          socket.emit("messagesRead", { senderId: selectedUser._id });
        }).catch((err) => {
          console.error("Failed to mark message as read:", err);
        });
      } else {
        // Increments unread badge count for non-selected users
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

    // 2. Listen for read receipts (when the selected user reads YOUR messages)
    socket.on("messagesRead", ({ readerId }) => {
      const { selectedUser } = get();
      
      // If the person who read the message is currently selected, update double checkmarks to blue
      if (selectedUser && selectedUser._id === readerId) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            !msg.isRead ? { ...msg, isRead: true } : msg
          ),
        }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messagesRead");
    }
  },

  setSelectedUser: async (selectedUser) => {
    set({ selectedUser });

    if (!selectedUser) return;

    // 1. Immediately reset unread count in state for selected user
    set({
      users: get().users.map((user) =>
        user._id === selectedUser._id ? { ...user, unreadCount: 0 } : user
      ),
    });

    // 2. Sync unread state in backend database and notify socket
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