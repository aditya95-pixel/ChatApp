import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const usePersonaStore = create((set, get) => ({
  personas: [],
  isUploading: false,
  lastResult: null,

  uploadChatLog: async ({ file, friendName, mode }) => {
    set({ isUploading: true, lastResult: null });
    try {
      const formData = new FormData();
      formData.append("chatLog", file);
      formData.append("friendName", friendName);
      formData.append("mode", mode);

      const res = await axiosInstance.post("/persona/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      set({ lastResult: res.data });
      toast.success("Chat log processed successfully");
      get().getPersonas();
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to process chat log");
      throw error;
    } finally {
      set({ isUploading: false });
    }
  },

  getPersonas: async () => {
    try {
      const res = await axiosInstance.get("/persona");
      set({ personas: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load personas");
    }
  },

  downloadDataset: async (personaId, friendName) => {
    try {
      const res = await axiosInstance.get(`/persona/${personaId}/dataset`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${friendName}-finetune.jsonl`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download dataset");
    }
  },

  sendAiMessage: async (text, personaId) => {
    try {
      const res = await axiosInstance.post("/aimessage/send", { text, personaId });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send message");
      throw error;
    }
  },

  deletePersona: async (id) => {
    try {
      await axiosInstance.delete(`/persona/${id}`);
      set((state) => ({
        personas: state.personas.filter((p) => p._id !== id),
      }));
      toast.success("Persona deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete persona");
      throw error;
    }
  },
}));