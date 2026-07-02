export interface User {
  id: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  isOnline: boolean;
  email?: string;
  hourlyRate?: number;
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
  budget: number;
  startDate: string;
  endDate: string;
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

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}

export interface AttendanceRecord {
  id: string;
  projectId: string;
  date: string;
  userId: string;
  status: 'Present' | 'Absent';
  overtimeHours: number;
  notes: string;
}

export const defaultUsers: User[] = [
  {
    id: 'u1',
    fullName: 'Chien2711 (Group 1 Lead)',
    avatarUrl: 'https://ui-avatars.com/api/?name=Chien+2711&background=6366f1&color=fff',
    role: 'Admin',
    isOnline: true,
    email: 'admin@projecthub.com',
    hourlyRate: 50
  },
  {
    id: 'u2',
    fullName: 'Ngọc Bảo (Group 2 Lead)',
    avatarUrl: 'https://ui-avatars.com/api/?name=Ngoc+Bao&background=3b82f6&color=fff',
    role: 'Member',
    isOnline: true,
    email: 'nhanvien1@projecthub.com',
    hourlyRate: 40
  },
  {
    id: 'u3',
    fullName: 'Tuấn (Group 3 Lead)',
    avatarUrl: 'https://ui-avatars.com/api/?name=Tuan&background=10b981&color=fff',
    role: 'Member',
    isOnline: false,
    email: 'viewer@projecthub.com',
    hourlyRate: 30
  }
];

export const defaultProjects: Project[] = [
  {
    id: 'p1',
    name: 'SprintFlow Microservices',
    description: 'Hệ thống quản lý dự án và phân công công việc theo mô hình Kanban/Scrum.',
    status: 'Active',
    statusText: 'Đang hoạt động',
    progress: 40,
    members: [
      { id: 'u1', fullName: 'Chien2711 (Group 1 Lead)', avatarUrl: 'https://ui-avatars.com/api/?name=Chien+2711&background=6366f1&color=fff', role: 'Admin', isOnline: true, hourlyRate: 50 },
      { id: 'u2', fullName: 'Ngọc Bảo (Group 2 Lead)', avatarUrl: 'https://ui-avatars.com/api/?name=Ngoc+Bao&background=3b82f6&color=fff', role: 'Member', isOnline: true, hourlyRate: 40 },
      { id: 'u3', fullName: 'Tuấn (Group 3 Lead)', avatarUrl: 'https://ui-avatars.com/api/?name=Tuan&background=10b981&color=fff', role: 'Member', isOnline: false, hourlyRate: 30 }
    ],
    color: 'indigo',
    createdAt: '2026-07-01',
    budget: 5000,
    startDate: '2026-07-01',
    endDate: '2026-12-31'
  },
  {
    id: 'p2',
    name: 'Legacy Migration',
    description: 'Chuyển đổi hệ thống từ Monolith sang Microservices.',
    status: 'New',
    statusText: 'Mới tạo',
    progress: 0,
    members: [
      { id: 'u1', fullName: 'Chien2711 (Group 1 Lead)', avatarUrl: 'https://ui-avatars.com/api/?name=Chien+2711&background=6366f1&color=fff', role: 'Admin', isOnline: true, hourlyRate: 50 }
    ],
    color: 'amber',
    createdAt: '2026-07-02',
    budget: 2500,
    startDate: '2026-07-02',
    endDate: '2026-09-02'
  }
];

export const defaultTasks: Task[] = [
  {
    id: 't1',
    title: 'Thiết kế cơ sở dữ liệu ProjectDB',
    description: 'Tạo các bảng cho Project và Member trong ProjectService.',
    status: 'Done',
    priority: 'High',
    dueDate: '2026-07-05',
    projectId: 'p1',
    assigneeId: 'u1',
    creatorId: 'u1',
    createdAt: '2026-07-01',
    labels: ['Lập trình', 'Cơ sở dữ liệu'],
    loggedHours: 12
  },
  {
    id: 't2',
    title: 'Xây dựng giao diện Kanban Board',
    description: 'Thiết kế giao diện kéo thả các cột công việc.',
    status: 'InProgress',
    priority: 'Medium',
    dueDate: '2026-07-10',
    projectId: 'p1',
    assigneeId: 'u2',
    creatorId: 'u1',
    createdAt: '2026-07-01',
    labels: ['Giao diện'],
    loggedHours: 20
  }
];

export const defaultNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    title: 'Chào mừng bạn!',
    message: 'Chào mừng bạn đến với hệ thống quản lý công việc SprintFlow.',
    type: 'system',
    isRead: false,
    createdAt: new Date().toISOString()
  }
];

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
    return this.getUsers()[0]; // Logged in user is 'Chien2711' by default
  },

  getSprints(): Sprint[] {
    const data = localStorage.getItem('ph_sprints');
    if (!data) {
      localStorage.setItem('ph_sprints', JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  },

  saveSprints(sprints: Sprint[]) {
    localStorage.setItem('ph_sprints', JSON.stringify(sprints));
  },

  getAttendance(): AttendanceRecord[] {
    const data = localStorage.getItem('ph_attendance');
    if (!data) {
      localStorage.setItem('ph_attendance', JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  },

  saveAttendance(records: AttendanceRecord[]) {
    localStorage.setItem('ph_attendance', JSON.stringify(records));
  }
};
