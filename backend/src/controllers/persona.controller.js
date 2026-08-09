import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Persona from "../models/persona.model.js";
import {
  parseChatLog,
  buildShortTermContext,
  buildFineTuneDataset,
} from "../lib/chatLogParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_DIR = path.join(__dirname, "..", "uploads", "datasets");

if (!fs.existsSync(DATASET_DIR)) {
  fs.mkdirSync(DATASET_DIR, { recursive: true });
}

export const uploadChatLog = async (req, res) => {
  try {
    const { friendName, mode } = req.body;
    const myName = req.user.fullName;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!friendName || !mode) {
      return res.status(400).json({ error: "friendName and mode are required" });
    }
    if (!["short_term", "long_term"].includes(mode)) {
      return res.status(400).json({ error: "mode must be short_term or long_term" });
    }

    const rawText = req.file.buffer.toString("utf-8");
    const messages = parseChatLog(rawText, { myName, friendName });

    if (messages.length === 0) {
      return res.status(422).json({
        error: "Could not detect any messages. Check the file format and friend name.",
      });
    }

    const personaData = {
      userId: req.user._id,
      friendName,
      mode,
      sourceFilename: req.file.originalname,
      messageCount: messages.length,
    };

    if (mode === "short_term") {
      personaData.shortTermContext = buildShortTermContext(messages, friendName);
    } else {
      const dataset = buildFineTuneDataset(messages, friendName);
      const filename = `${req.user._id}-${Date.now()}.jsonl`;
      const filePath = path.join(DATASET_DIR, filename);
      const jsonlContent = dataset.map((row) => JSON.stringify(row)).join("\n");
      fs.writeFileSync(filePath, jsonlContent, "utf-8");

      personaData.datasetFilePath = filename;
    }

    const persona = await Persona.create(personaData);

    res.status(201).json({
      id: persona._id,
      mode: persona.mode,
      friendName: persona.friendName,
      messageCount: persona.messageCount,
      shortTermContext: persona.shortTermContext || null,
      datasetReady: mode === "long_term",
    });
  } catch (error) {
    console.error("Error in uploadChatLog controller:", error.message);
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
    console.error("Error in downloadDataset controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPersonas = async (req, res) => {
  try {
    const personas = await Persona.find({ userId: req.user._id }).select("-datasetFilePath");
    res.status(200).json(personas);
  } catch (error) {
    console.error("Error in getPersonas controller:", error.message);
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
    console.error("Error in deletePersona controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};