import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import Persona from "../models/persona.model.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

export const getSmartReplies = async (req, res) => {
  try {
    const { incomingMessage, previousMessages = [] } = req.body;

    const userStyleContext = previousMessages.length > 0 
      ? `Here are examples of how the user usually replies: "${previousMessages.join('", "')}". Match this exact tone, casing, slang, and brevity.` 
      : `Keep responses casual, concise, and natural.`;

    const prompt = `
      You are a smart reply assistant.
      The other person said: "${incomingMessage}"
      ${userStyleContext}
      Generate exactly 3 distinct, short quick-reply options (1-5 words each).
      Return ONLY a JSON array of 3 strings. Example format: ["yeah sure", "cant rn", "maybe later"]
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai/gpt-oss-120b"
    });

    let responseText = chatCompletion.choices[0]?.message?.content || "[]";
    
    responseText = responseText.replace(/```json/gi, "").replace(/```/gi, "").trim();
    
    const suggestions = JSON.parse(responseText);

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("\n❌ Groq Smart Reply Error:", error.message, "\n");
    res.status(500).json({ error: "Failed to generate suggestions", details: error.message });
  }
};