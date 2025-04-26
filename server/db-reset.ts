import { db } from './db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Dropping and recreating database tables...');

  try {
    // Drop existing tables in the correct order (reverse dependency)
    await db.execute(sql`DROP TABLE IF EXISTS research_materials CASCADE`);
    console.log('Dropped research_materials table.');
    
    await db.execute(sql`DROP TABLE IF EXISTS projects CASCADE`);
    console.log('Dropped projects table.');
    
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    console.log('Dropped users table.');
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);
    console.log('Users table created.');

    // Create projects table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        research_objective TEXT,
        interview_prompt TEXT
      )
    `);
    console.log('Projects table created.');

    // Create research_materials table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS research_materials (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
    console.log('Research materials table created.');

    console.log('Database reset complete.');
  } catch (error) {
    console.error('Error resetting database tables:', error);
    process.exit(1);
  }
}

main();