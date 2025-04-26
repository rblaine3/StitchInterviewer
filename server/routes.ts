import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertResearchMaterialSchema, updateProjectSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import { ZodError, z } from "zod";
import { fromZodError } from 'zod-validation-error';
import multer from "multer";
import path from "path";
import fs from "fs";
import { enhancePrompt } from "./openai";
import { createInterviewAssistant, getCall, generateShareableLink } from "./vapi";

// Setup multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Project routes
  app.post("/api/projects", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      // Validate project data
      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      // Create project
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: `Failed to create project: ${error instanceof Error ? error.message : String(error)}` });
    }
  });

  app.get("/api/projects", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projects = await storage.getProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: `Failed to fetch projects: ${error instanceof Error ? error.message : String(error)}` });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if project belongs to the authenticated user
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if project belongs to the authenticated user
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update project
      const updatedProject = await storage.updateProject(projectId, {
        name: req.body.name,
        description: req.body.description,
      });
      
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if project belongs to the authenticated user
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete project
      const deleted = await storage.deleteProject(projectId);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete project" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Research Material Routes
  app.post("/api/upload-research-materials", upload.array('files'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.body.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      const savedMaterials = [];
      for (const file of files) {
        const material = await storage.createResearchMaterial({
          projectId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
        });
        savedMaterials.push(material);
      }
      
      res.status(201).json(savedMaterials);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload research materials" });
    }
  });
  
  app.get("/api/projects/:id/research-materials", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const materials = await storage.getResearchMaterials(projectId);
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research materials" });
    }
  });
  
  app.delete("/api/research-materials/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const materialId = parseInt(req.params.id);
      if (isNaN(materialId)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }
      
      // Delete material - would need additional validation in production
      const deleted = await storage.deleteResearchMaterial(materialId);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete research material" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete research material" });
    }
  });
  
  // Research Objective and Prompt Routes
  app.patch("/api/projects/:id/research-objective", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const schema = z.object({ objective: z.string() });
      try {
        const { objective } = schema.parse(req.body);
        const updatedProject = await storage.updateResearchObjective(projectId, objective);
        res.json(updatedProject);
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          return res.status(400).json({ message: validationError.message });
        }
        throw error;
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update research objective" });
    }
  });
  
  app.post("/api/enhance-prompt", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const schema = z.object({ 
        projectId: z.number(),
        objective: z.string(),
        useKnowledgeBase: z.boolean().optional(),
      });
      
      let projectId, objective, useKnowledgeBase;
      try {
        const parsed = schema.parse(req.body);
        projectId = parsed.projectId;
        objective = parsed.objective;
        useKnowledgeBase = parsed.useKnowledgeBase || false;
      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          return res.status(400).json({ message: validationError.message });
        }
        throw error;
      }
      
      console.log(`Enhancing prompt for project ${projectId}, useKnowledgeBase: ${useKnowledgeBase}`);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // First, save the objective immediately so we don't lose it even if enhancing fails
      await storage.updateResearchObjective(projectId, objective);
      console.log(`Updated research objective for project ${projectId}`);
      
      // If using knowledge base, get the file contents
      let fileContents: string[] = [];
      if (useKnowledgeBase) {
        const materials = await storage.getResearchMaterials(projectId);
        console.log(`Found ${materials.length} research materials for project ${projectId}`);
        
        // Extract content from text files
        for (const material of materials) {
          try {
            if (material.fileType.startsWith('text/')) {
              const content = fs.readFileSync(material.filePath, 'utf8');
              // Limit to first 1000 chars to avoid token limits
              const excerpt = content.substring(0, 1000) + (content.length > 1000 ? '...(truncated)' : '');
              fileContents.push(`File: ${material.fileName}\n${excerpt}`);
            }
          } catch (e) {
            console.error(`Error reading file ${material.fileName}:`, e);
          }
        }
      }
      
      // Call OpenAI to enhance the prompt
      console.log(`Calling OpenAI to enhance prompt with ${fileContents.length} documents`);
      const enhancedPrompt = await enhancePrompt(objective, fileContents.length > 0 ? fileContents : undefined);
      
      // Update the project with the new prompt
      await storage.updateInterviewPrompt(projectId, enhancedPrompt);
      console.log(`Updated interview prompt for project ${projectId}`);
      
      res.json({ prompt: enhancedPrompt });
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      res.status(500).json({ message: "Failed to enhance prompt" });
    }
  });

  // Vapi Interview Routes
  // Create a new interview assistant for test interview
  app.post("/api/projects/:id/create-interview", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const result = await createInterviewAssistant(projectId);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating interview:", error);
      res.status(500).json({ message: "Failed to create interview" });
    }
  });

  // Get call details (for both test interview and shared interviews)
  app.get("/api/calls/:callId", async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const call = await getCall(callId);
      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ message: "Failed to fetch call details" });
    }
  });

  // Generate a shareable interview link
  app.post("/api/projects/:id/share", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const result = await generateShareableLink(projectId);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error generating shareable link:", error);
      res.status(500).json({ message: "Failed to generate shareable link" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
