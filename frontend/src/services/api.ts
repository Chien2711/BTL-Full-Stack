import axios from 'axios';
import { mockStorage, type User, type Project, type Task, type Comment, type SubTask, type WorkLog, type Notification, type ActivityLog, type Sprint, type AttendanceRecord } from './mockData';

const browserHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `http://${browserHost}:7000/api`;
export const gatewayHealthUrl = apiBaseUrl.replace(/\/api\/?$/, '/health');

// Khởi tạo Axios client với cấu hình kết nối tới .NET Core Backend
const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động chèn token đăng nhập vào request header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Cờ cấu hình: bật true để chạy thử bằng LocalStorage, tắt false để kết nối Backend thật
const USE_MOCK = true;

export const apiService = {
  // --- USER API ---
  async getUsers(): Promise<User[]> {
    if (USE_MOCK) {
      return Promise.resolve(mockStorage.getUsers());
    }
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    if (USE_MOCK) {
      return Promise.resolve(mockStorage.getCurrentUser());
    }
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  async updateCurrentUser(data: { fullName: string; avatarUrl?: string }): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      const users = mockStorage.getUsers();
      const current = users[0];
      current.fullName = data.fullName;
      current.avatarUrl = data.avatarUrl || current.avatarUrl;
      mockStorage.saveUsers(users);
      return Promise.resolve({ user: current, token: 'mock-token-' + current.id });
    }
    const response = await apiClient.put<{ user: User; token: string }>('/users/me', data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (USE_MOCK) {
      return Promise.resolve();
    }
    await apiClient.put('/users/me/password', { currentPassword, newPassword });
  },

  // --- PROJECT API ---
  async getProjects(): Promise<Project[]> {
    if (USE_MOCK) {
      return Promise.resolve(mockStorage.getProjects());
    }
    const response = await apiClient.get<Project[]>('/projects');
    return response.data;
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'progress'>): Promise<Project> {
    if (USE_MOCK) {
      const newProj: Project = {
        ...project,
        id: 'p_' + Date.now(),
        progress: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const projs = mockStorage.getProjects();
      projs.push(newProj);
      mockStorage.saveProjects(projs);
      return Promise.resolve(newProj);
    }
    const response = await apiClient.post<Project>('/projects', project);
    return response.data;
  },

  // --- TASK API (CRUD) ---
  async getTasks(): Promise<Task[]> {
    if (USE_MOCK) {
      return Promise.resolve(mockStorage.getTasks());
    }
    const response = await apiClient.get<Task[]>('/tasks');
    return response.data;
  },

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'subTasks' | 'workLogs' | 'loggedHours'>): Promise<Task> {
    if (USE_MOCK) {
      const newTask: Task = {
        ...taskData,
        id: 't_' + Date.now(),
        createdAt: new Date().toISOString().split('T')[0],
        subTasks: [],
        workLogs: [],
        loggedHours: 0,
        comments: []
      };
      const tasks = mockStorage.getTasks();
      tasks.push(newTask);
      mockStorage.saveTasks(tasks);
      return Promise.resolve(newTask);
    }
    const response = await apiClient.post<Task>('/tasks', taskData);
    return response.data;
  },

  async updateTask(task: Task): Promise<Task> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const idx = tasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
        tasks[idx] = { ...task };
        mockStorage.saveTasks(tasks);
      }
      return Promise.resolve(task);
    }
    const response = await apiClient.put<Task>(`/tasks/${task.id}`, task);
    return response.data;
  },

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<Task> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        mockStorage.saveTasks(tasks);
        return Promise.resolve(task);
      }
      return Promise.reject(new Error('Task not found'));
    }
    const response = await apiClient.patch<Task>(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    if (USE_MOCK) {
      let tasks = mockStorage.getTasks();
      tasks = tasks.filter(t => t.id !== taskId);
      mockStorage.saveTasks(tasks);
      return Promise.resolve();
    }
    await apiClient.delete(`/tasks/${taskId}`);
  },

  // --- SUB-TASK API ---
  async addSubTask(taskId: string, title: string): Promise<SubTask> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      const newSub: SubTask = {
        id: 'sub_' + Date.now(),
        title,
        isCompleted: false
      };
      if (task) {
        if (!task.subTasks) task.subTasks = [];
        task.subTasks.push(newSub);
        mockStorage.saveTasks(tasks);
        return Promise.resolve(newSub);
      }
      return Promise.reject(new Error('Task not found'));
    }
    const response = await apiClient.post<SubTask>(`/tasks/${taskId}/subtasks`, { title });
    return response.data;
  },

  async toggleSubTask(taskId: string, subTaskId: string): Promise<void> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subTasks) {
        const sub = task.subTasks.find(s => s.id === subTaskId);
        if (sub) {
          sub.isCompleted = !sub.isCompleted;
          mockStorage.saveTasks(tasks);
          return Promise.resolve();
        }
      }
      return Promise.reject(new Error('Subtask not found'));
    }
    await apiClient.put(`/tasks/${taskId}/subtasks/${subTaskId}/toggle`);
  },

  async deleteSubTask(taskId: string, subTaskId: string): Promise<void> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subTasks) {
        task.subTasks = task.subTasks.filter(s => s.id !== subTaskId);
        mockStorage.saveTasks(tasks);
        return Promise.resolve();
      }
      return Promise.reject(new Error('Subtask not found'));
    }
    await apiClient.delete(`/tasks/${taskId}/subtasks/${subTaskId}`);
  },

  // --- WORK LOG API ---
  async addWorkLog(taskId: string, hours: number, description: string): Promise<WorkLog> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      const currentUser = mockStorage.getCurrentUser();
      const newLog: WorkLog = {
        id: 'wlog_' + Date.now(),
        userName: currentUser.fullName,
        hours,
        description,
        createdAt: new Date().toISOString().split('T')[0]
      };
      if (task) {
        if (!task.workLogs) task.workLogs = [];
        task.workLogs.push(newLog);
        task.loggedHours = (task.loggedHours || 0) + hours;
        mockStorage.saveTasks(tasks);
        return Promise.resolve(newLog);
      }
      return Promise.reject(new Error('Task not found'));
    }
    const response = await apiClient.post<WorkLog>(`/tasks/${taskId}/worklogs`, { hours, description });
    return response.data;
  },

  // --- COMMENT API ---
  async addComment(taskId: string, content: string): Promise<Comment> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      const currentUser = mockStorage.getCurrentUser();
      const newComment: Comment = {
        id: 'c_' + Date.now(),
        taskId,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userAvatar: currentUser.avatarUrl,
        content,
        createdAt: new Date().toISOString()
      };
      if (task) {
        if (!task.comments) task.comments = [];
        task.comments.push(newComment);
        mockStorage.saveTasks(tasks);
        return Promise.resolve(newComment);
      }
      return Promise.reject(new Error('Task not found'));
    }
    const response = await apiClient.post<Comment>(`/tasks/${taskId}/comments`, { content });
    return response.data;
  },

  async getComments(taskId: string): Promise<Comment[]> {
    if (USE_MOCK) {
      const task = mockStorage.getTasks().find(t => t.id === taskId);
      return Promise.resolve(task?.comments || []);
    }
    const response = await apiClient.get<Comment[]>(`/tasks/${taskId}/comments`);
    return response.data;
  },

  async updateComment(taskId: string, commentId: string, content: string): Promise<Comment> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      const comment = task?.comments?.find(c => c.id === commentId);
      if (comment) {
        comment.content = content;
        comment.updatedAt = new Date().toISOString();
        mockStorage.saveTasks(tasks);
        return Promise.resolve(comment);
      }
      return Promise.reject(new Error('Comment not found'));
    }
    const response = await apiClient.put<Comment>(`/tasks/${taskId}/comments/${commentId}`, { content });
    return response.data;
  },

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    if (USE_MOCK) {
      const tasks = mockStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      if (task && task.comments) {
        task.comments = task.comments.filter(c => c.id !== commentId);
        mockStorage.saveTasks(tasks);
        return Promise.resolve();
      }
      return Promise.reject(new Error('Comment not found'));
    }
    await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
  },

  // --- NOTIFICATION API ---
  async getNotifications(status: 'all' | 'unread' | 'read' = 'all'): Promise<Notification[]> {
    if (USE_MOCK) {
      const currentUser = mockStorage.getCurrentUser();
      let notifications = mockStorage.getNotifications().filter(n => n.userId === currentUser.id);
      if (status === 'unread') notifications = notifications.filter(n => !n.isRead);
      if (status === 'read') notifications = notifications.filter(n => n.isRead);
      return Promise.resolve(notifications);
    }
    const response = await apiClient.get<Notification[]>('/notifications', { params: { status } });
    return response.data;
  },

  async getUnreadNotificationCount(): Promise<number> {
    if (USE_MOCK) {
      const currentUser = mockStorage.getCurrentUser();
      return Promise.resolve(mockStorage.getNotifications().filter(n => n.userId === currentUser.id && !n.isRead).length);
    }
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },

  async createNotification(data: Omit<Notification, 'id' | 'isRead' | 'createdAt' | 'actorId' | 'actorName'>): Promise<Notification> {
    if (USE_MOCK) {
      const notification: Notification = {
        ...data,
        id: 'noti_' + Date.now(),
        actorId: undefined,
        actorName: undefined,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const notifications = mockStorage.getNotifications();
      notifications.unshift(notification);
      mockStorage.saveNotifications(notifications);
      return Promise.resolve(notification);
    }
    const response = await apiClient.post<Notification>('/notifications', data);
    return response.data;
  },

  async markNotificationRead(notificationId: string): Promise<Notification> {
    if (USE_MOCK) {
      const notifications = mockStorage.getNotifications();
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.isRead = true;
        mockStorage.saveNotifications(notifications);
        return Promise.resolve(notification);
      }
      return Promise.reject(new Error('Notification not found'));
    }
    const response = await apiClient.patch<Notification>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllNotificationsRead(): Promise<void> {
    if (USE_MOCK) {
      const currentUser = mockStorage.getCurrentUser();
      const notifications = mockStorage.getNotifications().map(n => (
        n.userId === currentUser.id ? { ...n, isRead: true } : n
      ));
      mockStorage.saveNotifications(notifications);
      return Promise.resolve();
    }
    await apiClient.patch('/notifications/mark-all-read');
  },

  async deleteNotification(notificationId: string): Promise<void> {
    if (USE_MOCK) {
      const notifications = mockStorage.getNotifications().filter(n => n.id !== notificationId);
      mockStorage.saveNotifications(notifications);
      return Promise.resolve();
    }
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  async getActivityLogs(taskId?: string): Promise<ActivityLog[]> {
    if (USE_MOCK) {
      return Promise.resolve([]);
    }
    const response = await apiClient.get<ActivityLog[]>('/activity-logs', {
      params: taskId ? { taskId } : undefined
    });
    return response.data;
  },

  async updateProjectMembers(projectId: string, members: { userId: string; role: string; hourlyRate: number }[]): Promise<void> {
    if (USE_MOCK) {
      const projs = mockStorage.getProjects();
      const p = projs.find(proj => proj.id === projectId);
      if (p) {
        const users = mockStorage.getUsers();
        p.members = members.map(m => {
          const u = users.find(user => user.id === m.userId);
          return {
            id: m.userId,
            fullName: u?.fullName || m.userId,
            avatarUrl: u?.avatarUrl || '',
            role: m.role,
            isOnline: u?.isOnline || false,
            hourlyRate: m.hourlyRate
          };
        });
        mockStorage.saveProjects(projs);
      }
      return Promise.resolve();
    }
    await apiClient.put(`/projects/${projectId}/members`, { members });
  },

  async updateUserRole(userId: string, role: string): Promise<User> {
    if (USE_MOCK) {
      const users = mockStorage.getUsers();
      const u = users.find(user => user.id === userId);
      if (u) {
        u.role = role;
        mockStorage.saveUsers(users);
        return Promise.resolve(u);
      }
      return Promise.reject(new Error('User not found'));
    }
    const response = await apiClient.put<User>(`/users/${userId}/role`, { role });
    return response.data;
  },

  // --- PROJECT PROGRESS API ---
  async updateProjectProgress(projectId: string, progress: number): Promise<void> {
    if (USE_MOCK) {
      const projs = mockStorage.getProjects();
      const p = projs.find(pr => pr.id === projectId);
      if (p) {
        p.progress = progress;
        mockStorage.saveProjects(projs);
      }
      return Promise.resolve();
    }
    await apiClient.put(`/projects/${projectId}/progress`, { progress });
  },

  // --- AUTH API ---
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      const users = mockStorage.getUsers();
      // Giả lập login cho mock mode
      const user = users.find(u => u.id === 'u1'); // Mặc định u1
      return Promise.resolve({ user: user!, token: 'mock-token-u1' });
    }
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  async register(userData: any): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      const newUser: User = {
        id: 'u_' + Date.now(),
        fullName: userData.fullName,
        role: userData.role || 'Member',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=6366f1&color=fff`,
        isOnline: true
      };
      return Promise.resolve({ user: newUser, token: 'mock-token-' + newUser.id });
    }
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  // --- SPRINT API ---
  async getSprints(projectId: string): Promise<Sprint[]> {
    if (USE_MOCK) {
      return Promise.resolve(mockStorage.getSprints().filter(s => s.projectId === projectId));
    }
    const response = await apiClient.get<Sprint[]>(`/projects/${projectId}/sprints`);
    return response.data;
  },

  async createSprint(projectId: string, sprintData: Omit<Sprint, 'id' | 'projectId'>): Promise<Sprint> {
    if (USE_MOCK) {
      const newSprint: Sprint = {
        ...sprintData,
        id: 'sp_' + Date.now(),
        projectId
      };
      const sprints = mockStorage.getSprints();
      sprints.push(newSprint);
      mockStorage.saveSprints(sprints);
      return Promise.resolve(newSprint);
    }
    const response = await apiClient.post<Sprint>(`/projects/${projectId}/sprints`, sprintData);
    return response.data;
  },

  async getAttendance(projectId: string, date: string): Promise<AttendanceRecord[]> {
    if (USE_MOCK) {
      return Promise.resolve(mockStorage.getAttendance().filter(a => a.projectId === projectId && a.date === date));
    }
    const response = await apiClient.get<AttendanceRecord[]>(`/projects/${projectId}/attendance`, { params: { date } });
    return response.data;
  },

  async saveAttendance(projectId: string, date: string, records: Omit<AttendanceRecord, 'id' | 'projectId' | 'date'>[]): Promise<void> {
    if (USE_MOCK) {
      const allAttendance = mockStorage.getAttendance().filter(a => !(a.projectId === projectId && a.date === date));
      const newRecords: AttendanceRecord[] = records.map((r, index) => ({
        ...r,
        id: `att_${Date.now()}_${index}`,
        projectId,
        date
      }));
      allAttendance.push(...newRecords);
      mockStorage.saveAttendance(allAttendance);
      return Promise.resolve();
    }
    await apiClient.post(`/projects/${projectId}/attendance`, { date, records });
  },

  async getAllProjectAttendance(projectId: string): Promise<AttendanceRecord[]> {
    if (USE_MOCK) {
      return Promise.resolve(mockStorage.getAttendance().filter(a => a.projectId === projectId));
    }
    const response = await apiClient.get<AttendanceRecord[]>(`/projects/${projectId}/attendance/all`);
    return response.data;
  },

  async updateProject(projectId: string, projectData: Omit<Project, 'id' | 'createdAt' | 'progress' | 'members'>): Promise<void> {
    if (USE_MOCK) {
      const projs = mockStorage.getProjects();
      const p = projs.find(proj => proj.id === projectId);
      if (p) {
        Object.assign(p, projectData);
        mockStorage.saveProjects(projs);
      }
      return Promise.resolve();
    }
    await apiClient.put(`/projects/${projectId}`, projectData);
  }
};
