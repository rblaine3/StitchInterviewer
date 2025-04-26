import { 
  users, type User, type InsertUser, 
  projects, type Project, type InsertProject, type UpdateProject,
  researchMaterials, type ResearchMaterial, type InsertResearchMaterial,
  interviewTranscripts, type InterviewTranscript, type InsertTranscript
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, desc } from "drizzle-orm";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      // Clear expired sessions and clean up on startup
      pruneSessionInterval: 60, // 1 minute
      tableName: 'session'
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
  
  // Interview Transcript methods
  async createTranscript(transcript: InsertTranscript): Promise<InterviewTranscript> {
    const [createdTranscript] = await db
      .insert(interviewTranscripts)
      .values({
        ...transcript,
        participantName: transcript.participantName || null,
        summary: transcript.summary || null,
        keyFindings: transcript.keyFindings || null,
        sentimentScore: transcript.sentimentScore || null,
        duration: transcript.duration || null
      })
      .returning();
    
    return createdTranscript;
  }
  
  async getProjectTranscripts(projectId: number): Promise<InterviewTranscript[]> {
    const transcripts = await db
      .select()
      .from(interviewTranscripts)
      .where(eq(interviewTranscripts.projectId, projectId));
    
    // Sort manually since drizzle-orm order by is being tricky
    return transcripts.sort((a, b) => {
      return new Date(b.conductedAt).getTime() - new Date(a.conductedAt).getTime();
    });
  }
  
  async getTranscript(id: number): Promise<InterviewTranscript | undefined> {
    const [transcript] = await db
      .select()
      .from(interviewTranscripts)
      .where(eq(interviewTranscripts.id, id));
      
    return transcript || undefined;
  }
  
  async updateTranscriptAnalysis(
    id: number, 
    summary: string, 
    keyFindings: string, 
    sentimentScore: number
  ): Promise<InterviewTranscript | undefined> {
    const [updatedTranscript] = await db
      .update(interviewTranscripts)
      .set({ 
        summary, 
        keyFindings, 
        sentimentScore 
      })
      .where(eq(interviewTranscripts.id, id))
      .returning();
      
    return updatedTranscript || undefined;
  }
}

// Export the DatabaseStorage as default
export default DatabaseStorage;