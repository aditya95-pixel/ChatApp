import { useEffect, useState, useRef } from "react";
import { usePersonaStore } from "../store/usePersonaStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const PersonaPage = () => {
  const { personas, getPersonas, sendAiMessage, deletePersona } = usePersonaStore();
  const { users, getUsers } = useChatStore();

  const [selectedPersona, setSelectedPersona] = useState(null);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [messages, setMessages] = useState([]);

  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isTraining, setIsTraining] = useState(false);

  const [deniedFriend, setDeniedFriend] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getPersonas();
    getUsers();
  }, [getPersonas, getUsers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTrainFriend = async () => {
    if (!selectedFriendId) return toast.error("Please select a friend");

    setIsTraining(true);
    setDeniedFriend(null);

    try {
      await axiosInstance.post("/persona/train-friend", { friendId: selectedFriendId });
      toast.success("Persona trained successfully!");
      getPersonas();
      setSelectedFriendId("");
      setSearchQuery("");
    } catch (error) {
      if (error.response?.status === 403) {
        const friend = users.find(u => u._id === selectedFriendId);
        setDeniedFriend(friend);
      } else {
        toast.error(error.response?.data?.error || "Failed to train persona");
      }
    } finally {
      setIsTraining(false);
    }
  };

  const handlePingFriend = async () => {
    if (!deniedFriend) return;
    setIsPinging(true);
    try {
      await axiosInstance.post("/persona/ping", { friendId: deniedFriend._id });
      toast.success(`Notification sent to ${deniedFriend.fullName}!`);
      setDeniedFriend(null);
      setSelectedFriendId("");
      setSearchQuery("");
    } catch (error) {
      toast.error("Failed to ping friend.");
    } finally {
      setIsPinging(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const base64String = reader.result;
      setImage(base64String);
    };

    reader.onerror = () => {
      toast.error("Failed to read the image file");
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !image) return;
    if (!selectedPersona) return;

    const userMsg = { sender: "Me", text: input, image: image };
    setMessages((prev) => [...prev, userMsg]);

    const textToSend = input;
    const imageToSend = image;

    setInput("");
    removeImage();

    try {
      const aiResponse = await sendAiMessage(textToSend, selectedPersona._id, imageToSend);
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = (e, personaId) => {
    e.stopPropagation();
    deletePersona(personaId);

    if (selectedPersona?._id === personaId) {
      setSelectedPersona(null);
      setMessages([]);
    }
  };

  const getFriendProfilePic = (friendName) => {
    const friend = users.find(u => u.fullName === friendName);
    return friend?.profilePic || "/avatar.png";
  };

  return (
    <div className="h-screen bg-base-200 pt-20 px-4 flex gap-4 pb-4">
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-base-200 p-4 rounded-lg border border-base-300">
          <h2 className="text-lg font-bold mb-4">Train Persona from MonkeyChat</h2>

          {deniedFriend ? (
            <div className="bg-base-100 p-4 rounded-lg border border-warning flex flex-col gap-3">
              <p className="text-sm font-semibold text-warning">
                {deniedFriend.fullName} hasn't allowed cloning yet.
              </p>
              <p className="text-xs opacity-70">
                They need to enable this feature in their MonkeyChat account before you can talk to their AI.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  className="btn btn-sm btn-ghost flex-1"
                  onClick={() => setDeniedFriend(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-primary flex-1"
                  onClick={handlePingFriend}
                  disabled={isPinging}
                >
                  {isPinging ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-control w-full mb-4" ref={dropdownRef}>
                <label className="label">
                  <span className="label-text">Select a Friend to Clone</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedFriendId("");
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />

                  {showSuggestions && filteredUsers.length > 0 && (
                    <ul className="absolute z-10 menu p-2 shadow bg-base-100 rounded-box w-full mt-1 max-h-48 overflow-y-auto border border-base-300">
                      {filteredUsers.map((user) => (
                        <li key={user._id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFriendId(user._id);
                              setSearchQuery(user.fullName);
                              setShowSuggestions(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="w-6 rounded-full">
                                  <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
                                </div>
                              </div>
                              {user.fullName}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handleTrainFriend}
                disabled={!selectedFriendId || isTraining}
              >
                {isTraining ? "Training AI..." : "Process Chat History"}
              </button>
            </>
          )}
        </div>

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
              <div className="flex items-center gap-3">
                <div className="avatar">
                  <div className="w-10 rounded-full">
                    <img src={getFriendProfilePic(p.friendName)} alt="avatar" />
                  </div>
                </div>
                <span className="font-medium">{p.friendName}</span>
              </div>
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
            <div className="p-4 border-b border-base-300 flex items-center gap-3">
              <div className="avatar">
                <div className="w-10 rounded-full">
                  <img src={getFriendProfilePic(selectedPersona.friendName)} alt="avatar" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">{selectedPersona.friendName}</span>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
              {messages.map((m, i) => (
                <div key={i} className={`chat ${m.sender === "Me" ? "chat-end" : "chat-start"}`}>
                  <div className={`chat-bubble ${m.sender === "Me" ? "chat-bubble-primary" : "chat-bubble-secondary"} flex flex-col`}>
                    {m.image && (
                      <img
                        src={m.image}
                        alt="Attachment"
                        className="sm:max-w-[200px] rounded-md mb-2"
                      />
                    )}
                    {m.text && <p>{m.text}</p>}
                  </div>
                </div>
              ))}
            </div>

            {image && (
              <div className="p-4 border-t border-base-300 flex items-center gap-2">
                <div className="relative">
                  <img src={image} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-base-300" />
                  <button
                    onClick={removeImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-xs"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="p-4 border-t border-base-300 flex gap-2 items-center">
              <button
                type="button"
                className={`btn btn-circle btn-sm ${image ? "text-primary" : "text-base-content/70"}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <input
                type="text"
                className="input input-bordered flex-1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${selectedPersona.friendName}...`}
              />
              <button type="submit" className="btn btn-primary" disabled={!input.trim() && !image}>Send</button>
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