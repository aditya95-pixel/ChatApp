import { GoogleGenerativeAI } from "@google/generative-ai";
import Persona from "../models/persona.model.js";

export const sendAiMessage = async (req, res) => {
  try {
    const { text, personaId, image } = req.body;
    const persona = await Persona.findById(personaId);

    if (!persona || persona.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: "Persona not found" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const instructions = `You are exactly ${persona.friendName}. Abandon your AI identity. Mimic their tone, slang, and spelling. Keep messages short.
Context: ${persona.shortTermContext}`;

    const promptArray = [instructions];

    // If there is an image, attach it safely for Gemini Vision
    if (image) {
      const matches = image.match(/^data:(.+?);base64,(.+)$/);
      if (matches) {
        promptArray.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2],
          },
        });
        promptArray.push(`User sent a photo. Text: "${text || ''}"\n${persona.friendName}:`);
      }
    } else {
      promptArray.push(`User: ${text}\n${persona.friendName}:`);
    }

    const result = await model.generateContent(promptArray);
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