import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function enhancePrompt(objective: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in creating effective interview prompts for user research. 
          Your task is to format a research objective into a comprehensive and effective interview prompt. 
          
          Format the prompt with the following sections:
          
          ## Identity
          [Who the bot should pretend to be, e.g. "You are an experienced UX researcher"]
          
          ## Style
          [The tone and communication style of the bot, e.g. "Speak in a conversational, friendly tone. Use simple language."]
          
          ## Response Guidelines
          [How the bot should structure their responses, e.g. "Keep responses concise. Ask one question at a time."]
          
          ## Task & Goals
          [The main objective of the interview, with 3-5 key areas to explore]
          
          ## Error Handling
          [How to gracefully handle off-topic responses or confusion]
          `
        },
        {
          role: "user",
          content: objective
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "Could not generate prompt";
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    throw new Error("Failed to enhance prompt with AI. Please try again.");
  }
}