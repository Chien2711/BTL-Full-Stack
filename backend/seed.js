import * as db from './db.js';
import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const targetDbName = process.env.DB_DATABASE || 'ProjectManagement';

const masterConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123',
  server: process.env.DB_SERVER || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
  database: 'master',
  options: {
    instanceName: process.env.DB_INSTANCE || undefined,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true
  }
};

async function seed() {
  try {
    console.log('Connecting to master to drop database if exists...');
    const masterPool = await sql.connect(masterConfig);
    
    // Check if database exists
    const dbCheckResult = await masterPool.request()
      .query(`SELECT database_id FROM sys.databases WHERE name = N'${targetDbName.replace(/'/g, "''")}'`);
    
    if (dbCheckResult.recordset.length > 0) {
      console.log(`Database ${targetDbName} exists. Dropping database to reset schema and data...`);
      // Use SINGLE_USER to close existing connections immediately
      await masterPool.request().query(`
        ALTER DATABASE [${targetDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE [${targetDbName}];
      `);
      console.log('Database dropped successfully.');
    } else {
      console.log(`Database ${targetDbName} does not exist.`);
    }
    
    await masterPool.close();

    console.log('Calling db.initDB() to recreate database, tables, and migrate database.json...');
    await db.initDB();

    // Now load seed-data.sql
    const seedSqlPath = path.join(__dirname, 'seed-data.sql');
    if (fs.existsSync(seedSqlPath)) {
      console.log('Reading seed-data.sql as UTF-8...');
      const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');
      
      console.log('Executing seed-data.sql...');
      await db.query(seedSql);
      console.log('seed-data.sql executed successfully.');
    } else {
      console.log('seed-data.sql not found!');
    }

    console.log('Verification: Querying Users...');
    const users = await db.query('SELECT id, fullName, role FROM Users');
    console.log('Users in database:');
    console.log(JSON.stringify(users.recordset, null, 2));

    console.log('Verification: Querying Projects...');
    const projects = await db.query('SELECT id, name FROM Projects');
    console.log('Projects in database:');
    console.log(JSON.stringify(projects.recordset, null, 2));

    await db.pool.close();
    console.log('Seed/Reset completed successfully.');
  } catch (err) {
    console.error('Error seeding/resetting DB:', err);
  }
}

seed();
