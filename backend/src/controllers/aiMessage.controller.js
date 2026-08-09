import { GoogleGenerativeAI } from "@google/generative-ai";
import Persona from "../models/persona.model.js";

export const sendAiMessage = async (req, res) => {
  try {
    const { text, personaId } = req.body;
    const persona = await Persona.findById(personaId);

    if (!persona || persona.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: "Persona not found" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `${persona.shortTermContext}\n\nUser: ${text}\n${persona.friendName}:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.status(200).json({
      sender: persona.friendName,
      text: responseText.trim(),
    });
  } catch (error) {
    console.error("AI Error Details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};