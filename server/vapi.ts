import { VapiClient } from "@vapi-ai/server-sdk";
import { storage } from "./storage";
import fs from "fs";

// Initialize the Vapi client with the API key
// The VapiClient expects the key in the constructor directly, not as an options object
const vapiClient = new VapiClient(process.env.VAPI_API_KEY as string);

// Create a interview assistant based on project research objectives and materials
export async function createInterviewAssistant(projectId: number) {
  try {
    // Get the project data
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Get project's research materials for context
    const materials = await storage.getResearchMaterials(projectId);
    
    // Extract content from text files to use as context
    let contextContent = "";
    for (const material of materials) {
      try {
        if (material.fileType.startsWith('text/')) {
          const content = fs.readFileSync(material.filePath, 'utf8');
          contextContent += `\n\n${material.fileName}:\n${content}`;
        }
      } catch (error) {
        console.error(`Error reading file ${material.fileName}:`, error);
      }
    }

    // Construct the assistant prompt
    let assistantPrompt = project.interviewPrompt || "You are an interviewer. Ask questions to understand the user better.";
    
    // If we have research objective but no interview prompt, use the objective
    if (!project.interviewPrompt && project.researchObjective) {
      assistantPrompt = `You are a user researcher conducting an interview. Your research objective is: ${project.researchObjective}. 
      Ask open-ended questions to understand the user's perspective on this topic.`;
    }

    // If we have additional context from research materials, add it
    if (contextContent) {
      assistantPrompt += `\n\nAdditional context from research materials:${contextContent}\n\nUse this context to inform your questions, but do not directly reference these documents to the user.`;
    }

    // Create a new assistant for this project
    const assistant = await vapiClient.assistants.create({
      name: `${project.name} Interview Assistant`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
      },
      // The prompt should be sent as instructions property
      instructions: assistantPrompt,
    });

    // For voice calls we need to create a Vapi call
    const call = await vapiClient.calls.create({
      assistant_id: assistant.id, // Use assistant.id instead of assistantId
      options: {
        // Add metadata as part of options
        metadata: {
          projectId: projectId.toString(),
        }
      }
    });

    return { 
      callId: call.id, // Use call.id instead of callId
      assistantId: assistant.id // Use assistant.id instead of assistantId
    };
  } catch (error) {
    console.error("Error creating Vapi interview assistant:", error);
    throw new Error("Failed to create interview assistant");
  }
}

// Get call details
export async function getCall(callId: string) {
  try {
    const call = await vapiClient.calls.get(callId);
    return call;
  } catch (error) {
    console.error("Error getting call:", error);
    throw new Error("Failed to get call details");
  }
}

// Generate a shareable interview link
export async function generateShareableLink(projectId: number) {
  try {
    const { callId } = await createInterviewAssistant(projectId);
    return { callId };
  } catch (error) {
    console.error("Error generating shareable link:", error);
    throw new Error("Failed to generate shareable link");
  }
}