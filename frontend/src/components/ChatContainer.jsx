import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  CheckCheck,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  MoreVertical,
  Trash2,
  Ban,
} from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Modal / Selected message state for deletion
  const [selectedDeleteMsg, setSelectedDeleteMsg] = useState(null);

  // Store refs for matching message DOM nodes
  const messageRefs = useRef({});

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages && !showSearch) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showSearch]);

  // Search Logic
  const matchingMessages = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return messages.filter((m) =>
      m.text?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  useEffect(() => {
    if (matchingMessages.length > 0) {
      const activeId = matchingMessages[currentMatchIndex]?._id;
      if (activeId && messageRefs.current[activeId]) {
        messageRefs.current[activeId].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentMatchIndex, matchingMessages]);

  const handleNextMatch = () => {
    if (matchingMessages.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchingMessages.length);
  };

  const handlePrevMatch = () => {
    if (matchingMessages.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev === 0 ? matchingMessages.length - 1 : prev - 1
    );
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchTerm("");
    setCurrentMatchIndex(0);
  };

  const renderHighlightedText = (text, query) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleConfirmDelete = (type) => {
    if (selectedDeleteMsg) {
      deleteMessage(selectedDeleteMsg._id, type);
      setSelectedDeleteMsg(null);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />

      {/* Search Toggle Icon */}
      {!showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="absolute top-4 right-4 z-10 p-2 bg-base-200 rounded-full hover:bg-base-300 transition-colors"
          title="Search messages"
        >
          <Search className="size-4" />
        </button>
      )}

      {/* Search Header Bar */}
      {showSearch && (
        <div className="bg-base-200 border-b p-2 flex items-center justify-between gap-2 z-20 shadow-md">
          <div className="flex items-center gap-2 flex-1 bg-base-100 rounded-md px-3 py-1">
            <Search className="size-4 opacity-50" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentMatchIndex(0);
              }}
              className="bg-transparent border-none outline-none text-sm w-full"
              autoFocus
            />
          </div>

          {searchTerm && (
            <span className="text-xs opacity-70 whitespace-nowrap">
              {matchingMessages.length > 0
                ? `${currentMatchIndex + 1} of ${matchingMessages.length}`
                : "No matches"}
            </span>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMatch}
              disabled={matchingMessages.length === 0}
              className="btn btn-ghost btn-xs btn-square"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matchingMessages.length === 0}
              className="btn btn-ghost btn-xs btn-square"
            >
              <ChevronDown className="size-4" />
            </button>
            <button onClick={closeSearch} className="btn btn-ghost btn-xs btn-square">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isSentByMe = message.senderId === authUser._id;
          const isCurrentMatch =
            matchingMessages[currentMatchIndex]?._id === message._id;

          return (
            <div
              key={message._id}
              ref={(el) => (messageRefs.current[message._id] = el)}
              className={`chat group relative ${isSentByMe ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isSentByMe
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              <div className="chat-header mb-1 flex items-center gap-1">
                <time className="text-xs opacity-50">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              <div
                className={`chat-bubble flex flex-col relative transition-all duration-300 ${
                  isCurrentMatch ? "ring-2 ring-yellow-400 ring-offset-2" : ""
                } ${message.isDeletedForEveryone ? "italic opacity-60 bg-base-300 text-base-content" : ""}`}
              >
                {/* Delete Trigger Options Dropdown */}
                {!message.isDeletedForEveryone && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedDeleteMsg(message)}
                      className="p-1 hover:bg-black/10 rounded-full"
                    >
                      <Trash2 className="size-3.5 text-red-400" />
                    </button>
                  </div>
                )}

                {message.isDeletedForEveryone ? (
                  <div className="flex items-center gap-2 py-1">
                    <Ban className="size-4 shrink-0" />
                    <span>This message was deleted</span>
                  </div>
                ) : (
                  <>
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="sm:max-w-[200px] rounded-md mb-2"
                      />
                    )}

                    <div className="flex items-end justify-between gap-2 pr-4">
                      {message.text && (
                        <p>{renderHighlightedText(message.text, searchTerm)}</p>
                      )}

                      {isSentByMe && (
                        <CheckCheck
                          className={`size-4 shrink-0 transition-colors ${
                            message.isRead ? "text-sky-400" : "text-gray-400"
                          }`}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messageEndRef} />
      </div>

      {/* Delete Confirmation Modal */}
      {selectedDeleteMsg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg">Delete message?</h3>
            <p className="text-sm opacity-70">
              Choose how you would like to delete this message.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              {selectedDeleteMsg.senderId === authUser._id && (
                <button
                  onClick={() => handleConfirmDelete("everyone")}
                  className="btn btn-error btn-sm w-full"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={() => handleConfirmDelete("forMe")}
                className="btn btn-outline btn-sm w-full"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setSelectedDeleteMsg(null)}
                className="btn btn-ghost btn-sm w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <MessageInput />
    </div>
  );
};

export default ChatContainer;