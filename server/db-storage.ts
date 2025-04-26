import { 
  users, type User, type InsertUser, 
  projects, type Project, type InsertProject, type UpdateProject,
  researchMaterials, type ResearchMaterial, type InsertResearchMaterial
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [createdProject] = await db
      .insert(projects)
      .values({
        ...project,
        researchObjective: null,
        interviewPrompt: null,
      })
      .returning();
    return createdProject;
  }

  async getProjects(userId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project || undefined;
  }

  async updateProject(id: number, projectData: Partial<UpdateProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set(projectData)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    // First delete associated research materials
    await db
      .delete(researchMaterials)
      .where(eq(researchMaterials.projectId, id));
    
    // Then delete the project
    const deleted = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    
    return deleted.length > 0;
  }

  // Research Material methods
  async createResearchMaterial(material: InsertResearchMaterial): Promise<ResearchMaterial> {
    const [createdMaterial] = await db
      .insert(researchMaterials)
      .values(material)
      .returning();
    return createdMaterial;
  }

  async getResearchMaterials(projectId: number): Promise<ResearchMaterial[]> {
    return await db
      .select()
      .from(researchMaterials)
      .where(eq(researchMaterials.projectId, projectId));
  }

  async deleteResearchMaterial(id: number): Promise<boolean> {
    const deleted = await db
      .delete(researchMaterials)
      .where(eq(researchMaterials.id, id))
      .returning();
    
    return deleted.length > 0;
  }

  // Research Objective and Prompt methods
  async updateResearchObjective(projectId: number, objective: string): Promise<Project | undefined> {
    return this.updateProject(projectId, { researchObjective: objective });
  }

  async updateInterviewPrompt(projectId: number, prompt: string): Promise<Project | undefined> {
    return this.updateProject(projectId, { interviewPrompt: prompt });
  }
}

import { IStorage } from "./storage";