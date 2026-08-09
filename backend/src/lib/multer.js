import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [".txt", ".json"];
  const ext = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .txt or .json chat export files are supported"));
  }
};

export const uploadChatLog = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});