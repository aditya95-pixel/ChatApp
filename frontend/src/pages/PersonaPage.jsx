import { useEffect, useState } from "react";
import ChatLogUploader from "../components/ChatLogUploader";
import { usePersonaStore } from "../store/usePersonaStore";

const PersonaPage = () => {
  const { personas, getPersonas, sendAiMessage, deletePersona } = usePersonaStore();
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    getPersonas();
  }, [getPersonas]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedPersona) return;

    const userMsg = { sender: "Me", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const aiResponse = await sendAiMessage(userMsg.text, selectedPersona._id);
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = (e, personaId) => {
    e.stopPropagation(); // Prevents the outer div's onClick from firing
    deletePersona(personaId);
    
    // If the deleted persona is currently open, clear the chat screen
    if (selectedPersona?._id === personaId) {
      setSelectedPersona(null);
      setMessages([]);
    }
  };

  return (
    <div className="h-screen bg-base-200 pt-20 px-4 flex gap-4 pb-4">
      <div className="w-1/3 flex flex-col gap-4">
        <ChatLogUploader />
        <div className="bg-base-100 p-4 rounded-lg border border-base-300 flex-1 overflow-y-auto">
          <h3 className="font-semibold mb-2">Your Personas</h3>
          {personas.map((p) => (
            <div
              key={p._id}
              onClick={() => {
                setSelectedPersona(p);
                setMessages([]);
              }}
              className={`flex justify-between items-center w-full text-left p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                selectedPersona?._id === p._id
                  ? "bg-primary text-primary-content"
                  : "bg-base-200 hover:bg-base-300"
              }`}
            >
              <span>
                {p.friendName} ({p.mode})
              </span>
              <button
                onClick={(e) => handleDelete(e, p._id)}
                className={`p-1 rounded-md transition-colors ${
                  selectedPersona?._id === p._id 
                    ? "hover:bg-black/20 text-white/80 hover:text-white" 
                    : "hover:bg-error/20 text-error"
                }`}
                title="Delete Persona"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-base-100 rounded-lg border border-base-300 flex flex-col">
        {selectedPersona ? (
          <>
            <div className="p-4 border-b border-base-300 font-semibold">
              Chatting with {selectedPersona.friendName}
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
              {messages.map((m, i) => (
                <div key={i} className={`chat ${m.sender === "Me" ? "chat-end" : "chat-start"}`}>
                  <div className={`chat-bubble ${m.sender === "Me" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSend} className="p-4 border-t border-base-300 flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${selectedPersona.friendName}...`}
              />
              <button type="submit" className="btn btn-primary">Send</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-base-content/50">
            Select a persona to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonaPage;