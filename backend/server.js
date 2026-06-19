import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as db from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Trạng thái kết nối Database
let isDbConnected = false;

// Middleware chặn API nếu DB chưa sẵn sàng
app.use((req, res, next) => {
  if (!isDbConnected && req.path.startsWith('/api/')) {
    return res.status(503).json({ error: 'Cơ sở dữ liệu SQL Server chưa kết nối thành công. Vui lòng bật TCP/IP và kiểm tra cấu hình file .env' });
  }
  next();
});


// Helper lấy user từ authorization header
async function getUserByHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const userId = token.replace('jwt-token-', '');
  try {
    const userRes = await db.query('SELECT * FROM Users WHERE id = @userId', { userId });
    return userRes.recordset[0] || null;
  } catch (err) {
    console.error('Error fetching user by token:', err);
    return null;
  }
}

function isManagerRole(user) {
  return user && (user.role === 'Project Manager' || user.role === 'Admin');
}

function isViewerRole(user) {
  return user && user.role === 'Viewer';
}

// --- API ENDPOINTS ---

// 1. Auth APIs
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await db.query('SELECT * FROM Users WHERE email = @email AND password = @password', { email, password });
    const user = userRes.recordset[0];
    if (user) {
      user.isOnline = !!user.isOnline;
      const { password: _, ...userWithoutPassword } = user;
      const token = `jwt-token-${user.id}`;
      return res.json({ user: userWithoutPassword, token });
    }
    res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password, role } = req.body;
  try {
    const checkEmail = await db.query('SELECT 1 FROM Users WHERE email = @email', { email });
    if (checkEmail.recordset.length > 0) {
      return res.status(400).json({ error: 'Email này đã được sử dụng' });
    }
    
    const colors = ['6366f1', '0ea5e9', 'ec4899', 'f59e0b', '10b981'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = 'u_' + Date.now();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=${randomColor}&color=fff`;
    const finalRole = role || 'Member';

    await db.query(`
      INSERT INTO Users (id, fullName, email, password, role, avatarUrl, isOnline)
      VALUES (@id, @fullName, @email, @password, @role, @avatarUrl, 1)
    `, { id, fullName, email, password, role: finalRole, avatarUrl });

    const token = `jwt-token-${id}`;
    res.status(201).json({
      user: { id, fullName, email, role: finalRole, avatarUrl, isOnline: true },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// 2. Users APIs
app.get('/api/users', async (req, res) => {
  try {
    const usersRes = await db.query('SELECT id, fullName, avatarUrl, role, isOnline, email FROM Users');
    const users = usersRes.recordset.map(u => ({ ...u, isOnline: !!u.isOnline }));
    res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.get('/api/users/me', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (user) {
      user.isOnline = !!user.isOnline;
      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    }
    res.status(401).json({ error: 'Unauthorized: Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// 3. Projects APIs
app.get('/api/projects', async (req, res) => {
  try {
    const projectsRes = await db.query('SELECT * FROM Projects');
    const projects = projectsRes.recordset;
    
    const membersRes = await db.query(`
      SELECT pm.projectId, u.id, u.fullName, u.avatarUrl, u.role, u.isOnline, u.email 
      FROM Users u 
      JOIN ProjectMembers pm ON u.id = pm.userId
    `);
    
    const membersByProject = {};
    membersRes.recordset.forEach(m => {
      const pId = m.projectId;
      if (!membersByProject[pId]) membersByProject[pId] = [];
      membersByProject[pId].push({
        id: m.id,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl,
        role: m.role,
        isOnline: !!m.isOnline,
        email: m.email
      });
    });

    const result = projects.map(p => ({
      ...p,
      members: membersByProject[p.id] || []
    }));
    res.json(result);
  } catch (err) {
    console.error('Fetch projects error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền tạo dự án mới' });
    }
    
    const { name, description, status, statusText, color, members } = req.body;
    const id = 'p_' + Date.now();
    const createdAt = new Date().toISOString().split('T')[0];

    await db.query(`
      INSERT INTO Projects (id, name, description, status, statusText, progress, color, createdAt)
      VALUES (@id, @name, @description, @status, @statusText, 0, @color, @createdAt)
    `, { id, name, description, status, statusText, color, createdAt });

    if (Array.isArray(members)) {
      for (const m of members) {
        await db.query('INSERT INTO ProjectMembers (projectId, userId) VALUES (@pid, @uid)', { pid: id, uid: m.id });
      }
    }

    res.status(201).json({
      id, name, description, status, statusText, progress: 0, color, createdAt, members: members || []
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.put('/api/projects/:id/progress', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền cập nhật tiến độ dự án' });
    }
    const { id } = req.params;
    const { progress } = req.body;

    const projectCheck = await db.query('SELECT * FROM Projects WHERE id = @id', { id });
    if (projectCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy dự án' });
    }

    await db.query('UPDATE Projects SET progress = @progress WHERE id = @id', { progress, id });

    const updatedProj = { ...projectCheck.recordset[0], progress };
    res.json({ message: 'Cập nhật tiến độ thành công', project: updatedProj });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// 4. Tasks APIs
app.get('/api/tasks', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    let tasksQuery = 'SELECT * FROM Tasks';
    let params = {};
    
    if (user) {
      if (!isManagerRole(user) && !isViewerRole(user)) {
        tasksQuery = "SELECT * FROM Tasks WHERE ',' + assigneeId + ',' LIKE '%,' + @userId + ',%'";
        params = { userId: user.id };
      }
    }

    const tasksRes = await db.query(tasksQuery, params);
    const tasks = tasksRes.recordset;

    if (tasks.length === 0) {
      return res.json([]);
    }

    const subTasksRes = await db.query('SELECT * FROM SubTasks');
    const workLogsRes = await db.query('SELECT * FROM WorkLogs');
    const commentsRes = await db.query('SELECT * FROM Comments');

    const subsByTask = {};
    subTasksRes.recordset.forEach(s => {
      if (!subsByTask[s.taskId]) subsByTask[s.taskId] = [];
      subsByTask[s.taskId].push({
        id: s.id,
        title: s.title,
        isCompleted: !!s.isCompleted
      });
    });

    const logsByTask = {};
    workLogsRes.recordset.forEach(l => {
      if (!logsByTask[l.taskId]) logsByTask[l.taskId] = [];
      logsByTask[l.taskId].push({
        id: l.id,
        userName: l.userName,
        hours: l.hours,
        description: l.description,
        createdAt: l.createdAt
      });
    });

    const commentsByTask = {};
    commentsRes.recordset.forEach(c => {
      if (!commentsByTask[c.taskId]) commentsByTask[c.taskId] = [];
      commentsByTask[c.taskId].push({
        id: c.id,
        userName: c.userName,
        userAvatar: c.userAvatar,
        content: c.content,
        createdAt: c.createdAt
      });
    });

    const result = tasks.map(t => ({
      ...t,
      labels: t.labels ? t.labels.split(',') : [],
      subTasks: subsByTask[t.id] || [],
      workLogs: logsByTask[t.id] || [],
      comments: commentsByTask[t.id] || []
    }));

    res.json(result);
  } catch (err) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền tạo công việc mới' });
    }
    
    const { title, description, status, priority, dueDate, projectId, assigneeId, creatorId, labels, estimatedHours } = req.body;
    const id = 't_' + Date.now();
    const createdAt = new Date().toISOString().split('T')[0];
    const labelsStr = Array.isArray(labels) ? labels.join(',') : (labels || '');

    await db.query(`
      INSERT INTO Tasks (id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId, createdAt, labels, estimatedHours, loggedHours)
      VALUES (@id, @title, @description, @status, @priority, @dueDate, @projectId, @assigneeId, @creatorId, @createdAt, @labelsStr, @estimatedHours, 0)
    `, {
      id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId, createdAt, labelsStr, estimatedHours: estimatedHours || 0
    });

    res.status(201).json({
      id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId, createdAt,
      labels: labels || [], estimatedHours: estimatedHours || 0, loggedHours: 0, subTasks: [], workLogs: [], comments: []
    });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền chỉnh sửa công việc' });
    }
    const { id } = req.params;
    const { title, description, status, priority, dueDate, projectId, assigneeId, creatorId, labels, estimatedHours } = req.body;
    
    const taskCheck = await db.query('SELECT * FROM Tasks WHERE id = @id', { id });
    if (taskCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const labelsStr = Array.isArray(labels) ? labels.join(',') : (labels || '');

    await db.query(`
      UPDATE Tasks 
      SET title = @title, description = @description, status = @status, priority = @priority, 
          dueDate = @dueDate, projectId = @projectId, assigneeId = @assigneeId, creatorId = @creatorId, 
          labels = @labelsStr, estimatedHours = @estimatedHours
      WHERE id = @id
    `, {
      id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId, labelsStr, estimatedHours: estimatedHours || 0
    });

    const updatedTaskRes = await db.query('SELECT * FROM Tasks WHERE id = @id', { id });
    const updatedTask = updatedTaskRes.recordset[0];

    const subTasksRes = await db.query('SELECT * FROM SubTasks WHERE taskId = @id', { id });
    const workLogsRes = await db.query('SELECT * FROM WorkLogs WHERE taskId = @id', { id });
    const commentsRes = await db.query('SELECT * FROM Comments WHERE taskId = @id', { id });

    res.json({
      ...updatedTask,
      labels: updatedTask.labels ? updatedTask.labels.split(',') : [],
      subTasks: subTasksRes.recordset.map(s => ({ ...s, isCompleted: !!s.isCompleted })),
      workLogs: workLogsRes.recordset,
      comments: commentsRes.recordset
    });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.patch('/api/tasks/:id/status', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (isViewerRole(user)) {
      return res.status(403).json({ error: 'Viewer không được phép chỉnh sửa trạng thái công việc' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const taskCheck = await db.query('SELECT * FROM Tasks WHERE id = @id', { id });
    if (taskCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const task = taskCheck.recordset[0];
    const assignees = task.assigneeId ? task.assigneeId.split(',') : [];
    if (!isManagerRole(user) && !assignees.includes(user.id)) {
      return res.status(403).json({ error: 'Bạn chỉ được chỉnh sửa trạng thái của công việc được giao cho mình' });
    }

    await db.query('UPDATE Tasks SET status = @status WHERE id = @id', { status, id });

    const updatedTask = { ...task, status };
    
    const subTasksRes = await db.query('SELECT * FROM SubTasks WHERE taskId = @id', { id });
    const workLogsRes = await db.query('SELECT * FROM WorkLogs WHERE taskId = @id', { id });
    const commentsRes = await db.query('SELECT * FROM Comments WHERE taskId = @id', { id });

    res.json({
      ...updatedTask,
      labels: updatedTask.labels ? updatedTask.labels.split(',') : [],
      subTasks: subTasksRes.recordset.map(s => ({ ...s, isCompleted: !!s.isCompleted })),
      workLogs: workLogsRes.recordset,
      comments: commentsRes.recordset
    });
  } catch (err) {
    console.error('Update task status error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền xóa công việc' });
    }
    const { id } = req.params;

    const taskCheck = await db.query('SELECT 1 FROM Tasks WHERE id = @id', { id });
    if (taskCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    await db.query('DELETE FROM Tasks WHERE id = @id', { id });
    res.json({ message: 'Xóa công việc thành công' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// Projects Members Management
app.put('/api/projects/:id/members', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền quản lý thành viên nhóm' });
    }
    const { id } = req.params;
    const { members } = req.body; // array of user IDs

    // Delete existing members first
    await db.query('DELETE FROM ProjectMembers WHERE projectId = @pid', { pid: id });

    // Insert new members
    if (Array.isArray(members)) {
      for (const uid of members) {
        const userCheck = await db.query('SELECT 1 FROM Users WHERE id = @uid', { uid });
        if (userCheck.recordset.length > 0) {
          await db.query('INSERT INTO ProjectMembers (projectId, userId) VALUES (@pid, @uid)', { pid: id, uid });
        }
      }
    }

    res.json({ message: 'Cập nhật thành viên nhóm thành công' });
  } catch (err) {
    console.error('Update project members error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// Users Role Management
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    // Only Admin or Project Manager can change roles
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager/Admin mới có quyền điều chỉnh vai trò' });
    }
    const { id } = req.params;
    const { role } = req.body;

    const userCheck = await db.query('SELECT 1 FROM Users WHERE id = @id', { id });
    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    await db.query('UPDATE Users SET role = @role WHERE id = @id', { role, id });
    res.json({ message: 'Cập nhật vai trò người dùng thành công' });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// 5. Sub-tasks APIs
app.post('/api/tasks/:id/subtasks', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền tạo công việc con' });
    }
    const { id } = req.params;
    const { title } = req.body;

    const taskCheck = await db.query('SELECT 1 FROM Tasks WHERE id = @id', { id });
    if (taskCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const subId = 'sub_' + Date.now();
    await db.query(`
      INSERT INTO SubTasks (id, taskId, title, isCompleted)
      VALUES (@subId, @id, @title, 0)
    `, { subId, id, title });

    res.status(201).json({ id: subId, title, isCompleted: false });
  } catch (err) {
    console.error('Create subtask error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.put('/api/tasks/:id/subtasks/:subTaskId/toggle', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (isViewerRole(user)) {
      return res.status(403).json({ error: 'Viewer không được phép chỉnh sửa công việc con' });
    }
    const { id, subTaskId } = req.params;

    const taskCheck = await db.query('SELECT * FROM Tasks WHERE id = @id', { id });
    if (taskCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const task = taskCheck.recordset[0];
    const assignees = task.assigneeId ? task.assigneeId.split(',').map(id => id.trim()) : [];
    if (!isManagerRole(user) && !assignees.includes(user.id)) {
      return res.status(403).json({ error: 'Bạn chỉ được chỉnh sửa công việc con của task được giao cho mình' });
    }

    const subCheck = await db.query('SELECT * FROM SubTasks WHERE id = @subTaskId AND taskId = @id', { subTaskId, id });
    if (subCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sub-task' });
    }

    const newIsCompleted = !subCheck.recordset[0].isCompleted;
    await db.query('UPDATE SubTasks SET isCompleted = @newIsCompleted WHERE id = @subTaskId', { newIsCompleted, subTaskId });

    res.json({
      message: 'Thay đổi trạng thái sub-task thành công',
      sub: { id: subTaskId, title: subCheck.recordset[0].title, isCompleted: newIsCompleted }
    });
  } catch (err) {
    console.error('Toggle subtask error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.delete('/api/tasks/:id/subtasks/:subTaskId', async (req, res) => {
  try {
    const user = await getUserByHeader(req);
    if (!isManagerRole(user)) {
      return res.status(403).json({ error: 'Chỉ Project Manager mới có quyền xóa công việc con' });
    }
    const { id, subTaskId } = req.params;

    const subCheck = await db.query('SELECT 1 FROM SubTasks WHERE id = @subTaskId AND taskId = @id', { subTaskId, id });
    if (subCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sub-task hoặc công việc' });
    }

    await db.query('DELETE FROM SubTasks WHERE id = @subTaskId', { subTaskId });
    res.json({ message: 'Xóa sub-task thành công' });
  } catch (err) {
    console.error('Delete subtask error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// 6. Work logs APIs
app.post('/api/tasks/:id/worklogs', async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, description } = req.body;
    
    const user = await getUserByHeader(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Phiên làm việc hết hạn' });
    }
    if (isViewerRole(user)) {
      return res.status(403).json({ error: 'Viewer không được phép ghi nhận giờ làm việc' });
    }

    const taskCheck = await db.query('SELECT * FROM Tasks WHERE id = @id', { id });
    if (taskCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const task = taskCheck.recordset[0];
    const assignees = task.assigneeId ? task.assigneeId.split(',').map(id => id.trim()) : [];
    if (!isManagerRole(user) && !assignees.includes(user.id)) {
      return res.status(403).json({ error: 'Bạn chỉ được ghi nhận giờ làm việc cho task được giao cho mình' });
    }

    const logId = 'wlog_' + Date.now();
    const createdAt = new Date().toISOString().split('T')[0];

    await db.query(`
      INSERT INTO WorkLogs (id, taskId, userName, hours, description, createdAt)
      VALUES (@logId, @id, @userName, @hours, @description, @createdAt)
    `, {
      logId, id, userName: user.fullName, hours: hours || 0, description, createdAt
    });

    const newLoggedHours = (task.loggedHours || 0) + (hours || 0);
    await db.query('UPDATE Tasks SET loggedHours = @newLoggedHours WHERE id = @id', { newLoggedHours, id });

    res.status(201).json({
      id: logId, userName: user.fullName, hours, description, createdAt
    });
  } catch (err) {
    console.error('Create worklog error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

// 7. Comments APIs
app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    const user = await getUserByHeader(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Phiên làm việc hết hạn' });
    }
    if (isViewerRole(user)) {
      return res.status(403).json({ error: 'Viewer không được phép bình luận' });
    }

    const taskCheck = await db.query('SELECT * FROM Tasks WHERE id = @id', { id });
    if (taskCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const task = taskCheck.recordset[0];
    const assignees = task.assigneeId ? task.assigneeId.split(',').map(id => id.trim()) : [];
    if (!isManagerRole(user) && !assignees.includes(user.id)) {
      return res.status(403).json({ error: 'Bạn chỉ được phép bình luận trên task được giao cho mình' });
    }

    const commentId = 'c_' + Date.now();
    const createdAt = new Date().toISOString();

    await db.query(`
      INSERT INTO Comments (id, taskId, userName, userAvatar, content, createdAt)
      VALUES (@commentId, @id, @userName, @userAvatar, @content, @createdAt)
    `, {
      commentId, id, userName: user.fullName, userAvatar: user.avatarUrl, content, createdAt
    });

    res.status(201).json({
      id: commentId, userName: user.fullName, userAvatar: user.avatarUrl, content, createdAt
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});



// Khởi chạy Server
db.initDB()
  .then(() => {
    isDbConnected = true;
    console.log('Database initialized successfully.');
  })
  .catch(err => {
    console.error('LỖI KẾT NỐI SQL SERVER:', err.message);
    console.log('Backend server đang chạy ở chế độ ngoại tuyến (chưa có kết nối DB).');
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Backend API Server running at http://localhost:${PORT}`);
    });
  });


