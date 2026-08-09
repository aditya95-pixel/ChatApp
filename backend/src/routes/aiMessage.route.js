import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { sendAiMessage } from "../controllers/aiMessage.controller.js";

const router = express.Router();

router.post("/send", protectRoute, sendAiMessage);

export default router;