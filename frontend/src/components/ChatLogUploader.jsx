import { useRef, useState } from "react";
import { Upload, FileText, Download, Loader2 } from "lucide-react";
import { usePersonaStore } from "../store/usePersonaStore";

const ChatLogUploader = () => {
  const [file, setFile] = useState(null);
  const [friendName, setFriendName] = useState("");
  const [mode, setMode] = useState("short_term");
  const fileInputRef = useRef(null);
  const { uploadChatLog, isUploading, lastResult, downloadDataset } = usePersonaStore();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !friendName.trim()) return;

    try {
      await uploadChatLog({ file, friendName: friendName.trim(), mode });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div className="p-6 bg-base-100 rounded-lg border border-base-300 max-w-xl">
      <h2 className="text-lg font-semibold mb-4">Simulate a Friend's Texting Style</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">Friend's Name</label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. Alex"
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Log Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                className="radio radio-sm"
                checked={mode === "short_term"}
                onChange={() => setMode("short_term")}
              />
              <span className="text-sm">Short-term (1-2 days)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                className="radio radio-sm"
                checked={mode === "long_term"}
                onChange={() => setMode("long_term")}
              />
              <span className="text-sm">Long-term (6+ months)</span>
            </label>
          </div>
        </div>

        <div>
          <input
            type="file"
            accept=".txt"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn btn-outline w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            {file ? file.name : "Choose .txt chat export"}
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-primary gap-2"
          disabled={!file || !friendName.trim() || isUploading}
        >
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
          {isUploading ? "Processing..." : "Process Chat Log"}
        </button>
      </form>

      {lastResult && (
        <div className="mt-4 p-3 bg-base-200 rounded-lg text-sm">
          <p>Parsed {lastResult.messageCount} messages for {lastResult.friendName}.</p>
          {lastResult.datasetReady && (
            <button
              className="btn btn-sm btn-outline mt-2 gap-2"
              onClick={() => downloadDataset(lastResult.id, lastResult.friendName)}
            >
              <Download size={16} />
              Download Fine-tune Dataset
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatLogUploader;