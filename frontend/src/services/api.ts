import axios from 'axios';
import { mockStorage, type User, type Project, type Task, type Comment, type SubTask, type WorkLog } from './mockData';

// Khởi tạo Axios client với cấu hình kết nối tới .NET Core Backend
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Thay thế bằng đường dẫn API thật của bạn
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
const USE_MOCK = false;

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

  async updateProjectMembers(projectId: string, members: string[]): Promise<void> {
    if (USE_MOCK) {
      const projs = mockStorage.getProjects();
      const p = projs.find(proj => proj.id === projectId);
      if (p) {
        const users = mockStorage.getUsers();
        p.members = users.filter(u => members.includes(u.id)).map(u => ({
          id: u.id,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl,
          role: u.role,
          isOnline: u.isOnline
        }));
        mockStorage.saveProjects(projs);
      }
      return Promise.resolve();
    }
    await apiClient.put(`/projects/${projectId}/members`, { members });
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    if (USE_MOCK) {
      const users = mockStorage.getUsers();
      const u = users.find(user => user.id === userId);
      if (u) {
        u.role = role;
        mockStorage.saveUsers(users);
      }
      return Promise.resolve();
    }
    await apiClient.put(`/users/${userId}/role`, { role });
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
  }
};
