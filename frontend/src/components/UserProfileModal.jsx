import { X, Mail, Phone, Info, Calendar } from "lucide-react";

const UserProfileModal = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-base-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-6">User Info</h2>

        {/* Avatar & Basic Info */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <img
            src={user.profilePic || "/avatar.png"}
            alt={user.fullName}
            className="size-28 rounded-full object-cover border-4 border-base-300"
          />
          <h3 className="text-lg font-semibold">{user.fullName}</h3>
        </div>

        {/* Details List (Read-Only) */}
        <div className="space-y-4">
          {/* About */}
          <div className="bg-base-200 p-3 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-400">About</p>
              <p className="text-sm font-medium">{user.about || "Hey there! I am using this app."}</p>
            </div>
          </div>

          {/* Email */}
          <div className="bg-base-200 p-3 rounded-lg flex items-center gap-3">
            <Mail className="w-5 h-5 text-zinc-400 shrink-0" />
            <div>
              <p className="text-xs text-zinc-400">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="bg-base-200 p-3 rounded-lg flex items-center gap-3">
            <Phone className="w-5 h-5 text-zinc-400 shrink-0" />
            <div>
              <p className="text-xs text-zinc-400">Phone</p>
              <p className="text-sm font-medium">{user.phoneNumber || "Not provided"}</p>
            </div>
          </div>

          {/* Joined Date */}
          {user.createdAt && (
            <div className="bg-base-200 p-3 rounded-lg flex items-center gap-3">
              <Calendar className="w-5 h-5 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Member Since</p>
                <p className="text-sm font-medium">{user.createdAt.split("T")[0]}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;