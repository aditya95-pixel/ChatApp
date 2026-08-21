import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCheck,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Trash2,
  Ban,
  Reply,
  FileText
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

  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [selectedDeleteMsg, setSelectedDeleteMsg] = useState(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);

  const messageRefs = useRef({});

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages && !showSearch) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showSearch, isOtherUserTyping]);

  useEffect(() => {
    if (!socket || !selectedUser) return;
    const handleTyping = (data) => {
      if (String(data.senderId) === String(selectedUser._id)) {
        setIsOtherUserTyping(true);
      }
    };
    const handleStopTyping = (data) => {
      if (String(data.senderId) === String(selectedUser._id)) {
        setIsOtherUserTyping(false);
      }
    };
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, selectedUser]);

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
    if (!text) return "";
    if (!query || !query.trim()) return text;
    const parts = String(text).split(new RegExp(`(${query})`, "gi"));
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
    if (selectedDeleteMsg?._id) {
      deleteMessage(selectedDeleteMsg._id, type);
      setSelectedDeleteMsg(null);
    }
  };

  const parseMessage = (text) => {
    if (!text) return { isReply: false, quoted: "", content: "" };
    const strText = String(text);
    const match = strText.match(/^Replying to: "(.*?)"\n\n([\s\S]*)$/);
    if (match) {
      return { isReply: true, quoted: match[1], content: match[2] };
    }
    return { isReply: false, quoted: "", content: strText };
  };

  const getFileType = (url) => {
    if (!url) return null;
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.startsWith('data:video/')) return 'video';
    if (lowerUrl.startsWith('data:audio/')) return 'audio';
    if (lowerUrl.startsWith('data:application/') || lowerUrl.startsWith('data:text/')) return 'document';
    
    if (lowerUrl.includes('/video/upload/')) {
      if (lowerUrl.match(/\.(mp3|wav|m4a|aac)(\?.*)?$/i)) return 'audio';
      return 'video';
    }
    if (lowerUrl.includes('/raw/upload/')) return 'document';
    
    if (lowerUrl.match(/\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i)) return 'video';
    if (lowerUrl.match(/\.(mp3|wav|m4a|aac)(\?.*)?$/i)) return 'audio';
    if (lowerUrl.match(/\.(pdf|doc|docx|txt|zip|csv|rar)(\?.*)?$/i)) return 'document';
    
    return 'image';
  };

const handleDirectDownload = (fileData) => {
    if (!fileData) return;
    
    if (fileData.startsWith("data:")) {
      const mimeType = fileData.split(";")[0].split(":")[1];
      let ext = "pdf";
      
      if (mimeType.includes("spreadsheetml") || mimeType.includes("excel")) ext = "xlsx";
      else if (mimeType.includes("wordprocessingml")) ext = "docx";
      else if (mimeType.includes("zip")) ext = "zip";
      else if (mimeType.includes("csv")) ext = "csv";
      else if (mimeType.includes("plain")) ext = "txt";

      const a = document.createElement("a");
      a.href = fileData;
      a.download = `MonkeChat_Document.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(fileData, "_blank");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />
      {!showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="absolute top-4 right-4 z-10 p-2 bg-base-200 rounded-full hover:bg-base-300 transition-colors"
          title="Search messages"
        >
          <Search className="size-4" />
        </button>
      )}
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
          <div className="flex items-center gap-1">
            <button onClick={handlePrevMatch} disabled={matchingMessages.length === 0} className="btn btn-ghost btn-xs btn-square"><ChevronUp className="size-4" /></button>
            <button onClick={handleNextMatch} disabled={matchingMessages.length === 0} className="btn btn-ghost btn-xs btn-square"><ChevronDown className="size-4" /></button>
            <button onClick={closeSearch} className="btn btn-ghost btn-xs btn-square"><X className="size-4" /></button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          if (!message) return null;
          const isSentByMe = message.senderId === authUser?._id;
          const isCurrentMatch = matchingMessages[currentMatchIndex]?._id === message._id;
          const { isReply, quoted, content } = parseMessage(message.text);
          const fileType = getFileType(message.image);

          return (
            <div
              key={message._id}
              ref={(el) => (messageRefs.current[message._id] = el)}
              className={`chat group relative ${isSentByMe ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={isSentByMe ? (authUser?.profilePic || "/avatar.png") : (selectedUser?.profilePic || "/avatar.png")}
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1 flex items-center gap-1">
                <time className="text-xs opacity-50">{message.createdAt ? formatMessageTime(message.createdAt) : ""}</time>
              </div>
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(e, info) => {
                  if (info.offset.x > 50 || info.offset.x < -50) setReplyingTo(message);
                }}
                className={`chat-bubble flex flex-col relative transition-all duration-300 ${
                  isCurrentMatch ? "ring-2 ring-yellow-400 ring-offset-2" : ""
                } ${message.isDeletedForEveryone ? "italic opacity-60 bg-base-300 text-base-content" : ""}`}
              >
                {!message.isDeletedForEveryone && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-black/40 backdrop-blur-md rounded-lg p-0.5 z-10">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setReplyingTo(message);
                      }} 
                      className="p-1 hover:bg-black/30 rounded-md transition-colors" 
                      title="Reply"
                    >
                      <Reply className="size-3.5 text-blue-300" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedDeleteMsg(message);
                      }} 
                      className="p-1 hover:bg-black/30 rounded-md transition-colors" 
                      title="Delete"
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
                      <div className="mb-2 w-full mt-1">
                        {fileType === 'image' && (
                          <img
                            src={message.image}
                            alt="Attachment"
                            className="sm:max-w-[250px] rounded-md cursor-zoom-in hover:opacity-80 transition-opacity"
                            onClick={() => setFullscreenImg(message.image)}
                          />
                        )}
                        {fileType === 'video' && (
                          <video src={message.image} controls className="sm:max-w-[250px] rounded-md border border-base-300" />
                        )}
                        {fileType === 'audio' && (
                          <audio src={message.image} controls className="w-full sm:w-[250px]" />
                        )}
                        {fileType === 'document' && (
                          <button 
                            onClick={() => handleDirectDownload(message.image)}
                            type="button"
                            className="flex items-center gap-3 p-3 bg-black/20 rounded-md hover:bg-black/30 transition-colors w-full sm:w-[250px] text-left cursor-pointer"
                          >
                            <FileText className="size-6 text-emerald-400 shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-medium underline truncate">Download Document</span>
                              <span className="text-xs opacity-60 uppercase">Click to save</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-end justify-between gap-2 pr-4 min-w-[120px]">
                      <div className="flex flex-col w-full">
                        {isReply && (
                          <div className="bg-black/20 border-l-4 border-primary rounded p-2 mb-2 text-left w-full mt-1">
                            <span className="text-xs font-bold text-primary block mb-0.5">Reply</span>
                            <p className="text-xs opacity-80 line-clamp-2">{quoted}</p>
                          </div>
                        )}
                        {content && (
                          <p className="whitespace-pre-wrap leading-relaxed">{renderHighlightedText(content, searchTerm)}</p>
                        )}
                      </div>
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
              </motion.div>
            </div>
          );
        })}
        {isOtherUserTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img src={selectedUser?.profilePic || "/avatar.png"} alt="profile pic" />
              </div>
            </div>
            <div className="chat-bubble bg-base-200 text-base-content opacity-50 flex items-center gap-2">
              Typing <span className="loading loading-dots loading-xs"></span>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      {selectedDeleteMsg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg">Delete message?</h3>
            <p className="text-sm opacity-70">Choose how you would like to delete this message.</p>
            <div className="flex flex-col gap-2 pt-2">
              {selectedDeleteMsg?.senderId === authUser?._id && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleConfirmDelete("everyone");
                  }} 
                  className="btn btn-error btn-sm w-full"
                >
                  Delete for Everyone
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDelete("forMe");
                }} 
                className="btn btn-outline btn-sm w-full"
              >
                Delete for Me
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedDeleteMsg(null);
                }} 
                className="btn btn-ghost btn-sm w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {fullscreenImg && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullscreenImg(null)}
        >
          <img
            src={fullscreenImg}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            alt="fullscreen"
          />
        </div>
      )}
      <MessageInput replyingTo={replyingTo} setReplyingTo={setReplyingTo} />
    </div>
  );
};

export default ChatContainer;