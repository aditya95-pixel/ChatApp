import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Paperclip, Send, X, FileText, Music, Video } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = ({ replyingTo, setReplyingTo }) => {
  const [text, setText] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = file.type.split('/')[0];
    const finalType = type === 'video' ? 'video' : type === 'audio' ? 'audio' : type === 'image' ? 'image' : 'document';

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
      setFileType(finalType);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !filePreview) return;

    const loadingToastId = filePreview?.length > 5000000 ? toast.loading("Uploading massive file (this might take a bit)...") : null;

    try {
      let finalMessage = text;
      if (replyingTo) {
        const replyPreview = replyingTo.text
          ? replyingTo.text.length > 30
            ? replyingTo.text.substring(0, 30) + "..."
            : replyingTo.text
          : "Attachment";
        finalMessage = `Replying to: "${replyPreview}"\n\n${text}`;
      }

      await sendMessage({
        text: finalMessage,
        image: filePreview, 
      });

      setText("");
      removeFile();
      if (setReplyingTo) setReplyingTo(null);
      if (loadingToastId) toast.success("Upload complete!", { id: loadingToastId });
    } catch (error) {
      console.error("Failed to send message:", error);
      if (loadingToastId) toast.error("Upload failed.", { id: loadingToastId });
    }
  };

  return (
    <div className="p-4 w-full border-t border-base-300 bg-base-100">
      {filePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative p-2 bg-base-200 rounded-lg border border-zinc-700 flex items-center gap-2">
            {fileType === 'image' && <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />}
            {fileType === 'video' && <Video className="size-8 text-blue-400" />}
            {fileType === 'audio' && <Music className="size-8 text-purple-400" />}
            {fileType === 'document' && <FileText className="size-8 text-emerald-400" />}
            
            <div className="flex flex-col pr-6">
              <span className="text-xs font-semibold capitalize">{fileType} attached</span>
            </div>

            <button
              onClick={removeFile}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-base-300 flex items-center justify-center border border-zinc-600 hover:bg-zinc-700"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {replyingTo && (
        <div className="mb-2 p-3 bg-base-200 border-l-4 border-primary rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex flex-col overflow-hidden mr-4">
            <span className="text-xs font-bold text-primary mb-1">Replying to message</span>
            <span className="text-sm truncate opacity-70">
              {replyingTo.text || "Attachment"}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="btn btn-ghost btn-xs btn-circle"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md bg-base-200"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="*/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle btn-ghost ${filePreview ? "text-primary" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm sm:btn-md btn-circle btn-primary"
          disabled={!text.trim() && !filePreview}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;