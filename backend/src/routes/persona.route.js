import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  downloadDataset,
  getPersonas,
  deletePersona,
  connectAndTrainPersona,
  trainSpecificFriend,
  pingFriendForPermission
} from "../controllers/persona.controller.js";

const router = express.Router();

router.post("/connect", protectRoute, connectAndTrainPersona);
router.post("/train-friend", protectRoute, trainSpecificFriend);
router.post("/ping", protectRoute, pingFriendForPermission);
router.get("/", protectRoute, getPersonas);
router.get("/:id/dataset", protectRoute, downloadDataset);
router.delete("/:id", protectRoute, deletePersona);

export default router;