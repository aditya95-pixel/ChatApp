import dotenv from "dotenv";

dotenv.config();

const checkModels = async () => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    console.log("\nAVAILABLE MODELS FOR YOUR KEY:");
    data.models.forEach(model => {
      if (model.supportedGenerationMethods.includes("generateContent")) {
        console.log(model.name.replace('models/', ''));
      }
    });
    console.log("\n");
  } catch (error) {
    console.log(error);
  }
};

checkModels();