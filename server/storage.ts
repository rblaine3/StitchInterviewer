import { 
  users, type User, type InsertUser, 
  projects, type Project, type InsertProject, type UpdateProject,
  researchMaterials, type ResearchMaterial, type InsertResearchMaterial
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProjects(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  updateProject(id: number, project: Partial<UpdateProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Research Material methods
  createResearchMaterial(material: InsertResearchMaterial): Promise<ResearchMaterial>;
  getResearchMaterials(projectId: number): Promise<ResearchMaterial[]>;
  deleteResearchMaterial(id: number): Promise<boolean>;
  
  // Research Objective and Prompt methods
  updateResearchObjective(projectId: number, objective: string): Promise<Project | undefined>;
  updateInterviewPrompt(projectId: number, prompt: string): Promise<Project | undefined>;
  
  sessionStore: any; // Use any for session store type
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private researchMaterials: Map<number, ResearchMaterial>;
  currentUserId: number;
  currentProjectId: number;
  currentResearchMaterialId: number;
  sessionStore: any; // Use any type for sessionStore

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.researchMaterials = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentResearchMaterialId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const now = new Date();
    const project: Project = { 
      ...insertProject, 
      id, 
      createdAt: now,
      researchObjective: null,
      interviewPrompt: null
    };
    this.projects.set(id, project);
    return project;
  }

  async getProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.userId === userId,
    );
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async updateProject(id: number, projectData: Partial<UpdateProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, ...projectData };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    // Delete all research materials associated with the project
    const materialsToDelete = Array.from(this.researchMaterials.values())
      .filter(material => material.projectId === id)
      .map(material => material.id);
    
    materialsToDelete.forEach(materialId => {
      this.researchMaterials.delete(materialId);
    });
    
    return this.projects.delete(id);
  }
  
  // Research Material methods
  async createResearchMaterial(material: InsertResearchMaterial): Promise<ResearchMaterial> {
    const id = this.currentResearchMaterialId++;
    const now = new Date();
    const researchMaterial: ResearchMaterial = {
      ...material,
      id,
      uploadedAt: now,
    };
    this.researchMaterials.set(id, researchMaterial);
    return researchMaterial;
  }
  
  async getResearchMaterials(projectId: number): Promise<ResearchMaterial[]> {
    return Array.from(this.researchMaterials.values())
      .filter(material => material.projectId === projectId);
  }
  
  async deleteResearchMaterial(id: number): Promise<boolean> {
    return this.researchMaterials.delete(id);
  }
  
  // Research Objective and Prompt methods
  async updateResearchObjective(projectId: number, objective: string): Promise<Project | undefined> {
    return this.updateProject(projectId, { researchObjective: objective });
  }
  
  async updateInterviewPrompt(projectId: number, prompt: string): Promise<Project | undefined> {
    return this.updateProject(projectId, { interviewPrompt: prompt });
  }
}

// Import and use the database storage instead of memory storage
import DatabaseStorage from "./db-storage";
export const storage = new DatabaseStorage();
