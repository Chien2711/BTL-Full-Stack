export interface User {
  id: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  isOnline: boolean;
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
  userName: string;
  userAvatar: string;
  content: string;
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

export const mockStorage = {
  getUsers(): User[] {
    const data = localStorage.getItem('ph_users');
    if (!data) {
      localStorage.setItem('ph_users', JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(data);
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

  getCurrentUser(): User {
    return this.getUsers()[0]; // Logged in user is 'Việt Nguyễn' by default
  }
};
