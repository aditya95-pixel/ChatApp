import { useAuthStore } from "../store/useAuthStore";
import { useState } from "react";

const PersonaModal = () => {
  const { authUser, connectToPersona } = useAuthStore();
  const [isVisible, setIsVisible] = useState(true);

  if (!authUser || authUser.personaConnected || !isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Allow AI Cloning?</h2>
        <p className="mb-6 text-sm text-base-content/70">
          Do you want to allow your friends to create an AI replica of you using your chat history, so they can talk to you when you are busy?
        </p>
        <div className="flex justify-end gap-3">
          <button 
            className="btn btn-ghost" 
            onClick={() => setIsVisible(false)}
          >
            Not Now
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              connectToPersona();
              setIsVisible(false);
            }}
          >
            Yes, Allow Friends
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaModal;