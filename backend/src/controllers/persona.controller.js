import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Persona from "../models/persona.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { buildFineTuneDataset } from "../lib/chatLogParser.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_DIR = path.join(__dirname, "..", "uploads", "datasets");

if (!fs.existsSync(DATASET_DIR)) {
  fs.mkdirSync(DATASET_DIR, { recursive: true });
}

export const connectAndTrainPersona = async (req, res) => {
  try {
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { personaConnected: true },
      { new: true }
    ).select("-password");

    res.status(200).json({
      user: updatedUser,
      message: "Permission to clone persona granted.",
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const trainSpecificFriend = async (req, res) => {
  try {
    const myId = req.user._id;
    const myName = req.user.fullName;
    const { friendId } = req.body; 

    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ error: "Friend not found" });

    if (!friend.personaConnected) {
      return res.status(403).json({ error: `${friend.fullName} has not allowed AI cloning yet.` });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: friendId },
        { senderId: friendId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    if (messages.length === 0) {
      return res.status(400).json({ error: "No chat history found with this friend." });
    }

    const formattedMessages = messages.map((msg) => {
      const isMe = msg.senderId.toString() === myId.toString();
      return {
        sender: isMe ? myName : friend.fullName,
        text: msg.text || (msg.image ? "[Image Attached]" : ""),
      };
    });

    const dataset = buildFineTuneDataset(formattedMessages, friend.fullName);
    const filename = `${myId}-${friendId}-${Date.now()}.jsonl`;
    const filePath = path.join(DATASET_DIR, filename);
    
    const jsonlContent = dataset.map((row) => JSON.stringify(row)).join("\n");
    fs.writeFileSync(filePath, jsonlContent, "utf-8");

    const personaData = {
      userId: myId,
      friendName: friend.fullName,
      mode: "long_term",
      sourceFilename: "MonkeyChat Database",
      messageCount: formattedMessages.length,
      datasetFilePath: filename,
    };

    const persona = await Persona.create(personaData);

    res.status(201).json(persona);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const pingFriendForPermission = async (req, res) => {
  try {
    const myId = req.user._id;
    const myName = req.user.fullName;
    const { friendId } = req.body;

    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ error: "Friend not found" });

    const text = `🤖 System Notification: ${myName} wants to talk to your AI Persona when you are busy! Please enable AI Cloning when you next log in to MonkeyChat.`;

    const newMessage = new Message({
      senderId: myId,
      receiverId: friendId,
      text,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(friendId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(200).json({ message: "Notification sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const downloadDataset = async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.id);

    if (!persona || persona.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: "Not found" });
    }
    if (persona.mode !== "long_term" || !persona.datasetFilePath) {
      return res.status(400).json({ error: "No dataset available for this persona" });
    }

    const filePath = path.join(DATASET_DIR, persona.datasetFilePath);
    res.download(filePath, `${persona.friendName}-finetune.jsonl`);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPersonas = async (req, res) => {
  try {
    const personas = await Persona.find({ userId: req.user._id }).select("-datasetFilePath");
    res.status(200).json(personas);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePersona = async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.id);

    if (!persona || persona.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: "Persona not found" });
    }

    if (persona.datasetFilePath) {
      const filePath = path.join(DATASET_DIR, persona.datasetFilePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Persona.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Persona deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};