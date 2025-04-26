import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  researchObjective: text("research_objective"),
  interviewPrompt: text("interview_prompt"),
});

export const researchMaterials = pgTable("research_materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const interviewTranscripts = pgTable("interview_transcripts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  assistantId: text("assistant_id").notNull(),
  participantName: text("participant_name"),
  conductedAt: timestamp("conducted_at").defaultNow().notNull(),
  transcriptData: json("transcript_data").notNull(),
  summary: text("summary"),
  keyFindings: text("key_findings"),
  sentimentScore: integer("sentiment_score"),
  duration: integer("duration"), // Duration in seconds
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  userId: true,
  name: true,
  description: true,
});

export const updateProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  researchObjective: true,
  interviewPrompt: true,
}).partial();

export const insertResearchMaterialSchema = createInsertSchema(researchMaterials).pick({
  projectId: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  filePath: true,
});

export const insertTranscriptSchema = createInsertSchema(interviewTranscripts).pick({
  projectId: true,
  assistantId: true,
  participantName: true,
  transcriptData: true,
  summary: true,
  keyFindings: true,
  sentimentScore: true,
  duration: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type ResearchMaterial = typeof researchMaterials.$inferSelect;
export type InsertResearchMaterial = z.infer<typeof insertResearchMaterialSchema>;
export type InterviewTranscript = typeof interviewTranscripts.$inferSelect;
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
