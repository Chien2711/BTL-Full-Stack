import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const targetDbName = process.env.DB_DATABASE || 'ProjectManagement';

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123',
  server: process.env.DB_SERVER || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
  database: 'master', // Start with master database to check/create target database
  options: {
    instanceName: process.env.DB_INSTANCE || undefined,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true
  }
};

export let pool = null;

export async function query(queryStr, inputs = {}) {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDB() first.');
  }
  const req = pool.request();
  for (const [key, value] of Object.entries(inputs)) {
    req.input(key, value);
  }
  return await req.query(queryStr);
}

export async function initDB() {
  try {
    console.log('Connecting to SQL Server master database to verify target database existence...');
    const masterPool = await sql.connect(config);
    
    const dbCheckResult = await masterPool.request()
      .query(`SELECT database_id FROM sys.databases WHERE name = N'${targetDbName.replace(/'/g, "''")}'`);
    
    if (dbCheckResult.recordset.length === 0) {
      console.log(`Database ${targetDbName} does not exist. Creating database...`);
      await masterPool.request().query(`CREATE DATABASE [${targetDbName}]`);
      console.log(`Database ${targetDbName} created successfully.`);
    } else {
      console.log(`Database ${targetDbName} already exists.`);
    }
    
    await masterPool.close();
    
    // Connect to the target database
    const targetConfig = { ...config, database: targetDbName };
    console.log(`Connecting to database ${targetDbName}...`);
    pool = await sql.connect(targetConfig);
    console.log('Connected to target database successfully.');

    // Create tables and migrate data
    await createTables();
    await migrateDataIfNeeded();

  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
}

async function createTables() {
  const req = pool.request();
  
  console.log('Creating or verifying tables...');

  // Users Table
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    CREATE TABLE Users (
      id NVARCHAR(50) PRIMARY KEY,
      fullName NVARCHAR(100) NOT NULL,
      avatarUrl NVARCHAR(500),
      role NVARCHAR(50),
      isOnline BIT DEFAULT 0,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL
    )
  `);

  // Projects Table
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Projects' AND xtype='U')
    CREATE TABLE Projects (
      id NVARCHAR(50) PRIMARY KEY,
      name NVARCHAR(255) NOT NULL,
      description NVARCHAR(MAX),
      status NVARCHAR(50),
      statusText NVARCHAR(100),
      progress INT DEFAULT 0,
      color NVARCHAR(50),
      createdAt VARCHAR(50)
    )
  `);

  // ProjectMembers Table
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProjectMembers' AND xtype='U')
    CREATE TABLE ProjectMembers (
      projectId NVARCHAR(50) REFERENCES Projects(id) ON DELETE CASCADE,
      userId NVARCHAR(50) REFERENCES Users(id) ON DELETE CASCADE,
      PRIMARY KEY (projectId, userId)
    )
  `);

  // Tasks Table
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Tasks' AND xtype='U')
    CREATE TABLE Tasks (
      id NVARCHAR(50) PRIMARY KEY,
      title NVARCHAR(255) NOT NULL,
      description NVARCHAR(MAX),
      status NVARCHAR(50),
      priority NVARCHAR(50),
      dueDate VARCHAR(50),
      projectId NVARCHAR(50) REFERENCES Projects(id) ON DELETE CASCADE,
      assigneeId NVARCHAR(50) REFERENCES Users(id),
      creatorId NVARCHAR(50) REFERENCES Users(id),
      createdAt VARCHAR(50),
      labels NVARCHAR(500),
      estimatedHours FLOAT DEFAULT 0,
      loggedHours FLOAT DEFAULT 0
    )
  `);

  // SubTasks Table
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SubTasks' AND xtype='U')
    CREATE TABLE SubTasks (
      id NVARCHAR(50) PRIMARY KEY,
      taskId NVARCHAR(50) REFERENCES Tasks(id) ON DELETE CASCADE,
      title NVARCHAR(255) NOT NULL,
      isCompleted BIT DEFAULT 0
    )
  `);

  // WorkLogs Table
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WorkLogs' AND xtype='U')
    CREATE TABLE WorkLogs (
      id NVARCHAR(50) PRIMARY KEY,
      taskId NVARCHAR(50) REFERENCES Tasks(id) ON DELETE CASCADE,
      userName NVARCHAR(100),
      hours FLOAT DEFAULT 0,
      description NVARCHAR(MAX),
      createdAt VARCHAR(50)
    )
  `);

  // Comments Table
  await req.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Comments' AND xtype='U')
    CREATE TABLE Comments (
      id NVARCHAR(50) PRIMARY KEY,
      taskId NVARCHAR(50) REFERENCES Tasks(id) ON DELETE CASCADE,
      userName NVARCHAR(100),
      userAvatar NVARCHAR(500),
      content NVARCHAR(MAX),
      createdAt VARCHAR(100)
    )
  `);
  
  console.log('Database tables verified/created successfully.');
}

async function migrateDataIfNeeded() {
  const checkUsers = await pool.request().query('SELECT COUNT(*) as count FROM Users');
  if (checkUsers.recordset[0].count > 0) {
    console.log('Database is not empty. Migration skipped.');
    return;
  }

  const dbJsonPath = path.join(__dirname, 'data', 'database.json');
  if (!fs.existsSync(dbJsonPath)) {
    console.log('database.json not found. Migration skipped.');
    return;
  }

  try {
    console.log('Starting migration from database.json to SQL Server...');
    const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));

    // 1. Migrate Users
    if (data.users && data.users.length > 0) {
      console.log(`Migrating ${data.users.length} users...`);
      for (const u of data.users) {
        await pool.request()
          .input('id', sql.NVarChar, u.id)
          .input('fullName', sql.NVarChar, u.fullName)
          .input('avatarUrl', sql.NVarChar, u.avatarUrl)
          .input('role', sql.NVarChar, u.role)
          .input('isOnline', sql.Bit, u.isOnline ? 1 : 0)
          .input('email', sql.VarChar, u.email)
          .input('password', sql.VarChar, u.password)
          .query(`
            INSERT INTO Users (id, fullName, avatarUrl, role, isOnline, email, password)
            VALUES (@id, @fullName, @avatarUrl, @role, @isOnline, @email, @password)
          `);
      }
    }

    // 2. Migrate Projects & Members
    if (data.projects && data.projects.length > 0) {
      console.log(`Migrating ${data.projects.length} projects...`);
      for (const p of data.projects) {
        await pool.request()
          .input('id', sql.NVarChar, p.id)
          .input('name', sql.NVarChar, p.name)
          .input('description', sql.NVarChar, p.description)
          .input('status', sql.NVarChar, p.status)
          .input('statusText', sql.NVarChar, p.statusText)
          .input('progress', sql.Int, p.progress || 0)
          .input('color', sql.NVarChar, p.color)
          .input('createdAt', sql.VarChar, p.createdAt)
          .query(`
            INSERT INTO Projects (id, name, description, status, statusText, progress, color, createdAt)
            VALUES (@id, @name, @description, @status, @statusText, @progress, @color, @createdAt)
          `);

        if (p.members && p.members.length > 0) {
          for (const m of p.members) {
            const userCheck = await pool.request()
              .input('uid', sql.NVarChar, m.id)
              .query('SELECT 1 FROM Users WHERE id = @uid');
            if (userCheck.recordset.length > 0) {
              await pool.request()
                .input('pid', sql.NVarChar, p.id)
                .input('uid', sql.NVarChar, m.id)
                .query('INSERT INTO ProjectMembers (projectId, userId) VALUES (@pid, @uid)');
            }
          }
        }
      }
    }

    // 3. Migrate Tasks, SubTasks, WorkLogs, Comments
    if (data.tasks && data.tasks.length > 0) {
      console.log(`Migrating ${data.tasks.length} tasks...`);
      for (const t of data.tasks) {
        const labelsStr = Array.isArray(t.labels) ? t.labels.join(',') : (t.labels || '');
        await pool.request()
          .input('id', sql.NVarChar, t.id)
          .input('title', sql.NVarChar, t.title)
          .input('description', sql.NVarChar, t.description)
          .input('status', sql.NVarChar, t.status)
          .input('priority', sql.NVarChar, t.priority)
          .input('dueDate', sql.VarChar, t.dueDate)
          .input('projectId', sql.NVarChar, t.projectId)
          .input('assigneeId', sql.NVarChar, t.assigneeId)
          .input('creatorId', sql.NVarChar, t.creatorId)
          .input('createdAt', sql.VarChar, t.createdAt)
          .input('labels', sql.NVarChar, labelsStr)
          .input('estimatedHours', sql.Float, t.estimatedHours || 0)
          .input('loggedHours', sql.Float, t.loggedHours || 0)
          .query(`
            INSERT INTO Tasks (id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId, createdAt, labels, estimatedHours, loggedHours)
            VALUES (@id, @title, @description, @status, @priority, @dueDate, @projectId, @assigneeId, @creatorId, @createdAt, @labels, @estimatedHours, @loggedHours)
          `);

        // SubTasks
        if (t.subTasks && t.subTasks.length > 0) {
          for (const st of t.subTasks) {
            await pool.request()
              .input('sid', sql.NVarChar, st.id)
              .input('tid', sql.NVarChar, t.id)
              .input('title', sql.NVarChar, st.title)
              .input('isCompleted', sql.Bit, st.isCompleted ? 1 : 0)
              .query('INSERT INTO SubTasks (id, taskId, title, isCompleted) VALUES (@sid, @tid, @title, @isCompleted)');
          }
        }

        // WorkLogs
        if (t.workLogs && t.workLogs.length > 0) {
          for (const wl of t.workLogs) {
            await pool.request()
              .input('wid', sql.NVarChar, wl.id)
              .input('tid', sql.NVarChar, t.id)
              .input('userName', sql.NVarChar, wl.userName)
              .input('hours', sql.Float, wl.hours || 0)
              .input('description', sql.NVarChar, wl.description)
              .input('createdAt', sql.VarChar, wl.createdAt)
              .query('INSERT INTO WorkLogs (id, taskId, userName, hours, description, createdAt) VALUES (@wid, @tid, @userName, @hours, @description, @createdAt)');
          }
        }

        // Comments
        if (t.comments && t.comments.length > 0) {
          for (const c of t.comments) {
            await pool.request()
              .input('cid', sql.NVarChar, c.id)
              .input('tid', sql.NVarChar, t.id)
              .input('userName', sql.NVarChar, c.userName)
              .input('userAvatar', sql.NVarChar, c.userAvatar)
              .input('content', sql.NVarChar, c.content)
              .input('createdAt', sql.VarChar, c.createdAt)
              .query('INSERT INTO Comments (id, taskId, userName, userAvatar, content, createdAt) VALUES (@cid, @tid, @userName, @userAvatar, @content, @createdAt)');
          }
        }
      }
    }
    console.log('Migration from database.json to SQL Server completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

export { sql };
