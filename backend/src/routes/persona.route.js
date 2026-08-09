import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadChatLog } from "../lib/multer.js";
import {
  uploadChatLog as processChatLog,
  downloadDataset,
  getPersonas,
  deletePersona
} from "../controllers/persona.controller.js";

const router = express.Router();

router.post("/upload", protectRoute, uploadChatLog.single("chatLog"), processChatLog);
router.get("/", protectRoute, getPersonas);
router.get("/:id/dataset", protectRoute, downloadDataset);
router.delete("/:id", protectRoute, deletePersona);

export default router;