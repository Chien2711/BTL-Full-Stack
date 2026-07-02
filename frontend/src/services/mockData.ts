export interface User {
  id: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  isOnline: boolean;
  email?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'New' | 'Active' | 'Completed' | 'OnHold';
  statusText: string;
  progress: number;
  members: User[];
  color: string; // Tailwind color name like 'indigo', 'amber', 'emerald', 'rose'
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId?: string;
  userId?: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  taskId?: string | null;
  projectId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  taskId?: string | null;
  message?: string | null;
  createdAt: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface WorkLog {
  id: string;
  userName: string;
  hours: number;
  description: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Backlog' | 'ToDo' | 'InProgress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  createdAt: string;
  labels?: string[]; // E.g., 'Lập trình', 'Thiết kế', 'Kiểm thử', 'Tài liệu'
  blockedBy?: string[]; // Array of task IDs that must be 'Done' before this task can be started
  subTasks?: SubTask[];
  estimatedHours?: number;
  loggedHours?: number;
  workLogs?: WorkLog[];
  comments?: Comment[];
}

export interface PublishedEvent {
  id: string;
  eventType: 'task.status.changed' | 'task.assigned';
  taskTitle: string;
  details: string;
  payload: string; // JSON string payload
  timestamp: string;
}

export const defaultUsers: User[] = [];

export const defaultProjects: Project[] = [];

export const defaultTasks: Task[] = [];

export const defaultNotifications: Notification[] = [];

export const mockStorage = {
  getUsers(): User[] {
    const data = localStorage.getItem('ph_users');
    if (!data) {
      localStorage.setItem('ph_users', JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(data);
  },

  saveUsers(users: User[]) {
    localStorage.setItem('ph_users', JSON.stringify(users));
  },

  getProjects(): Project[] {
    const data = localStorage.getItem('ph_projects');
    if (!data) {
      localStorage.setItem('ph_projects', JSON.stringify(defaultProjects));
      return defaultProjects;
    }
    return JSON.parse(data);
  },

  saveProjects(projects: Project[]) {
    localStorage.setItem('ph_projects', JSON.stringify(projects));
  },

  getTasks(): Task[] {
    const data = localStorage.getItem('ph_tasks');
    if (!data) {
      localStorage.setItem('ph_tasks', JSON.stringify(defaultTasks));
      return defaultTasks;
    }
    return JSON.parse(data);
  },

  saveTasks(tasks: Task[]) {
    localStorage.setItem('ph_tasks', JSON.stringify(tasks));
  },

  getNotifications(): Notification[] {
    const data = localStorage.getItem('ph_notifications');
    if (!data) {
      localStorage.setItem('ph_notifications', JSON.stringify(defaultNotifications));
      return defaultNotifications;
    }
    return JSON.parse(data);
  },

  saveNotifications(notifications: Notification[]) {
    localStorage.setItem('ph_notifications', JSON.stringify(notifications));
  },

  getCurrentUser(): User {
    return this.getUsers()[0]; // Logged in user is 'Việt Nguyễn' by default
  }
};
