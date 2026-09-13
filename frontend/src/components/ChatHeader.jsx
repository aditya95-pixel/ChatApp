import { useState } from "react";
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import UserProfileModal from "./UserProfileModal";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, isTyping } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isOnline = onlineUsers.includes(selectedUser?._id);

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          {/* Clickable user profile trigger */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsProfileOpen(true)}
          >
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              </div>
            </div>

            <div>
              <h3 className="font-medium">{selectedUser.fullName}</h3>
              <p className="text-xs">
                {isTyping ? (
                  <span className="text-primary font-medium animate-pulse">typing...</span>
                ) : isOnline ? (
                  <span className="text-emerald-500">Online</span>
                ) : (
                  <span className="text-base-content/70">Offline</span>
                )}
              </p>
            </div>
          </div>

          <button onClick={() => setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>

      {/* Read-only profile modal */}
      {isProfileOpen && (
        <UserProfileModal 
          user={selectedUser} 
          onClose={() => setIsProfileOpen(false)} 
        />
      )}
    </>
  );
};

export default ChatHeader;