import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type Task, type Project, type User, type Notification, type PublishedEvent, type ActivityLog, type Sprint, type AttendanceRecord } from '../services/mockData';
import { apiService } from '../services/api';

export const useTaskStore = defineStore('taskStore', () => {
  const users = ref<User[]>([]);
  const projects = ref<Project[]>([]);
  const tasks = ref<Task[]>([]);
  const notifications = ref<Notification[]>([]);
  const activityLogs = ref<ActivityLog[]>([]);
  const currentUser = ref<User>({} as User);
  const sprints = ref<Sprint[]>([]);
  
  // Event Hub states
  const events = ref<PublishedEvent[]>([]);
  const toasts = ref<{ id: string; type: string; message: string }[]>([]);

  // Initialize data asynchronously from API service
  function normalizeTaskDefaults() {
    tasks.value.forEach(t => {
      if (!t.subTasks) t.subTasks = [];
      if (!t.workLogs) t.workLogs = [];
      if (!t.comments) t.comments = [];
      if (!t.labels) t.labels = [];
      if (t.estimatedHours === undefined) t.estimatedHours = 0;
      if (t.loggedHours === undefined) t.loggedHours = 0;
    });
  }

  async function refreshWorkspaceApis() {
    users.value = await apiService.getUsers();
    projects.value = await apiService.getProjects();
    tasks.value = await apiService.getTasks();
    normalizeTaskDefaults();
  }

  async function init() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      users.value = await apiService.getUsers();
      projects.value = await apiService.getProjects();
      tasks.value = await apiService.getTasks();
      currentUser.value = await apiService.getCurrentUser();
      notifications.value = await apiService.getNotifications();
      
      // Set default values if fields are missing in older storage
      normalizeTaskDefaults();
    } catch (error) {
      console.error('Failed to initialize task store:', error);
      logoutAction();
    }
  }

  async function loginAction(email: string, password: string) {
    const data = await apiService.login(email, password);
    localStorage.setItem('token', data.token);
    currentUser.value = data.user;
    await init();
    return true;
  }

  async function registerAction(userData: any) {
    const data = await apiService.register(userData);
    localStorage.setItem('token', data.token);
    currentUser.value = data.user;
    await init();
    return true;
  }

  function logoutAction() {
    localStorage.removeItem('token');
    currentUser.value = {} as User;
    users.value = [];
    projects.value = [];
    tasks.value = [];
    notifications.value = [];
  }

  // Get project progress dynamically based on completed tasks
  const getProjectProgress = computed(() => {
    return (projectId: string) => {
      const projectTasks = tasks.value.filter(t => t.projectId === projectId);
      if (projectTasks.length === 0) {
        const proj = projects.value.find(p => p.id === projectId);
        return proj ? proj.progress : 0;
      }
      const completed = projectTasks.filter(t => t.status === 'Done').length;
      return Math.round((completed / projectTasks.length) * 100);
    };
  });

  // Stats for Dashboard
  const totalTasks = computed(() => tasks.value.length);
  const inProgressTasks = computed(() => tasks.value.filter(t => t.status === 'InProgress').length);
  
  const overdueTasks = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.value.filter(t => {
      return t.status !== 'Done' && t.dueDate < todayStr;
    }).length;
  });

  const onlineMembersCount = computed(() => users.value.filter(u => u.isOnline).length);
  const unreadNotificationCount = computed(() => notifications.value.filter(n => !n.isRead).length);

  // Today's tasks for current user
  const todayTasks = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.value.filter(t => {
      const isAssignee = t.assigneeId ? t.assigneeId.split(',').map(id => id.trim()).includes(currentUser.value.id) : false;
      return isAssignee && (t.dueDate === todayStr || (t.dueDate < todayStr && t.status !== 'Done'));
    });
  });

  // Event Broker Helper
  function publishEvent(eventType: 'task.status.changed' | 'task.assigned', task: Task, details: string) {
    const assigneeNames = task.assigneeId
      ? task.assigneeId.split(',')
          .map(id => users.value.find(u => u.id === id.trim())?.fullName)
          .filter(Boolean)
          .join(', ')
      : 'Unassigned';
    
    const payloadObj = {
      eventId: 'evt_' + Date.now(),
      eventType,
      taskId: task.id,
      taskTitle: task.title,
      status: task.status,
      assigneeName: assigneeNames || 'Unassigned',
      timestamp: new Date().toISOString()
    };

    const event: PublishedEvent = {
      id: payloadObj.eventId,
      eventType,
      taskTitle: task.title,
      details,
      payload: JSON.stringify(payloadObj, null, 2),
      timestamp: new Date().toLocaleTimeString('vi-VN')
    };

    events.value.unshift(event);
    triggerToast(eventType, `[Event Published] ${details}`);
  }

  function triggerToast(type: string, message: string) {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    toasts.value.push({ id, type, message });
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 4500);
  }

  // API Call Actions for Tasks
  async function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'subTasks' | 'workLogs' | 'loggedHours'>) {
    try {
      const newTask = await apiService.createTask(taskData);
      tasks.value.push(newTask);
      updateProjectProgressLocal(newTask.projectId);

      if (newTask.assigneeId) {
        const names = newTask.assigneeId.split(',')
          .map(id => users.value.find(u => u.id === id.trim())?.fullName)
          .filter(Boolean)
          .join(', ');
        publishEvent('task.assigned', newTask, `Công việc '${newTask.title}' đã được giao cho ${names || 'chưa ai'}`);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  }

  async function updateTaskStatus(taskId: string, status: Task['status']) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        const oldStatus = task.status;
        if (oldStatus !== status) {
          const updatedTask = await apiService.updateTaskStatus(taskId, status);
          task.status = updatedTask.status;
          updateProjectProgressLocal(task.projectId);
          
          publishEvent('task.status.changed', task, `Trạng thái của '${task.title}' đổi từ [${oldStatus}] sang [${status}]`);
        }
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }

  async function updateTask(updatedTask: Task) {
    try {
      const index = tasks.value.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        const oldTask = tasks.value[index];
        const oldProjectId = oldTask.projectId;
        const oldStatus = oldTask.status;
        const oldAssigneeId = oldTask.assigneeId;

        const savedTask = await apiService.updateTask(updatedTask);
        tasks.value[index] = { ...savedTask };
        
        updateProjectProgressLocal(savedTask.projectId);
        if (oldProjectId !== savedTask.projectId) {
          updateProjectProgressLocal(oldProjectId);
        }

        // Check for event triggers
        if (oldStatus !== savedTask.status) {
          publishEvent('task.status.changed', savedTask, `Trạng thái của '${savedTask.title}' đổi từ [${oldStatus}] sang [${savedTask.status}]`);
        }
        if (oldAssigneeId !== savedTask.assigneeId) {
          const names = savedTask.assigneeId
            ? savedTask.assigneeId.split(',')
                .map(id => users.value.find(u => u.id === id.trim())?.fullName)
                .filter(Boolean)
                .join(', ')
            : 'chưa ai';
          publishEvent('task.assigned', savedTask, `Công việc '${savedTask.title}' được phân công cho [${names || 'chưa ai'}]`);
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        const projectId = task.projectId;
        await apiService.deleteTask(taskId);
        tasks.value = tasks.value.filter(t => t.id !== taskId);
        updateProjectProgressLocal(projectId);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  function updateProjectProgressLocal(projectId: string) {
    const proj = projects.value.find(p => p.id === projectId);
    if (proj) {
      proj.progress = getProjectProgress.value(projectId);
      // Synchronize project progress with backend
      apiService.updateProjectProgress(projectId, proj.progress).catch(error => {
        console.error('Failed to update project progress:', error);
      });
    }
  }

  // Comments
  async function refreshTaskComments(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId);
    if (!task) return;

    task.comments = await apiService.getComments(taskId);
  }

  async function addComment(taskId: string, content: string) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        await apiService.addComment(taskId, content);
        await refreshWorkspaceApis();
        await refreshTaskComments(taskId);
        await refreshNotifications();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }

  async function updateComment(taskId: string, commentId: string, content: string) {
    try {
      const updatedComment = await apiService.updateComment(taskId, commentId, content);
      await refreshWorkspaceApis();
      await refreshTaskComments(taskId);
      await refreshNotifications();
      return updatedComment;
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }

  async function deleteComment(taskId: string, commentId: string) {
    try {
      await apiService.deleteComment(taskId, commentId);
      await refreshWorkspaceApis();
      await refreshTaskComments(taskId);
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  async function refreshNotifications(status: 'all' | 'unread' | 'read' = 'all') {
    try {
      notifications.value = await apiService.getNotifications(status);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }

  async function markNotificationRead(notificationId: string) {
    try {
      const updated = await apiService.markNotificationRead(notificationId);
      const index = notifications.value.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        notifications.value[index] = updated;
      }
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await apiService.markAllNotificationsRead();
      notifications.value = notifications.value.map(n => ({ ...n, isRead: true }));
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      await apiService.deleteNotification(notificationId);
      notifications.value = notifications.value.filter(n => n.id !== notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  async function refreshActivityLogs(taskId?: string) {
    try {
      activityLogs.value = await apiService.getActivityLogs(taskId);
    } catch (error) {
      console.error('Failed to refresh activity logs:', error);
      activityLogs.value = [];
    }
  }

  async function createSelfNotification(title: string, message: string, type = 'manual') {
    if (!currentUser.value?.id) return;
    try {
      const notification = await apiService.createNotification({
        userId: currentUser.value.id,
        title,
        message,
        type,
        taskId: null,
        projectId: null
      });
      notifications.value = [notification, ...notifications.value];
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  async function updateProfile(data: { fullName: string; avatarUrl?: string }) {
    try {
      const result = await apiService.updateCurrentUser(data);
      const updated = result.user;
      localStorage.setItem('token', result.token);
      currentUser.value = updated;
      const index = users.value.findIndex(user => user.id === updated.id);
      if (index !== -1) {
        users.value[index] = updated;
      }
      return updated;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    try {
      await apiService.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  }

  // Projects
  async function addProject(projData: Omit<Project, 'id' | 'createdAt' | 'progress'>) {
    try {
      const newProj = await apiService.createProject(projData);
      projects.value.push(newProj);
      return newProj;
    } catch (error) {
      console.error('Failed to add project:', error);
      throw error;
    }
  }

  async function updateProjectMembers(projectId: string, memberRoles: { userId: string; role: string; hourlyRate: number }[]) {
    try {
      await apiService.updateProjectMembers(projectId, memberRoles);
      const proj = projects.value.find(p => p.id === projectId);
      if (proj) {
        proj.members = memberRoles.map(m => {
          const u = users.value.find(user => user.id === m.userId);
          return {
            id: m.userId,
            fullName: u?.fullName || m.userId,
            avatarUrl: u?.avatarUrl || '',
            role: m.role,
            isOnline: u?.isOnline || false,
            hourlyRate: m.hourlyRate
          };
        });
      }
    } catch (error) {
      console.error('Failed to update project members:', error);
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      await apiService.updateUserRole(userId, role);
      const u = users.value.find(user => user.id === userId);
      if (u) {
        u.role = role;
      }
      if (currentUser.value.id === userId) {
        currentUser.value.role = role;
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  }

  // --- N2 ASYNC ACTIONS ---

  // Sub-task management
  async function addSubTask(taskId: string, title: string) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        const newSub = await apiService.addSubTask(taskId, title);
        if (!task.subTasks) task.subTasks = [];
        task.subTasks.push(newSub);
      }
    } catch (error) {
      console.error('Failed to add sub-task:', error);
    }
  }

  async function toggleSubTask(taskId: string, subTaskId: string) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task && task.subTasks) {
        const sub = task.subTasks.find(s => s.id === subTaskId);
        if (sub) {
          await apiService.toggleSubTask(taskId, subTaskId);
          sub.isCompleted = !sub.isCompleted;
        }
      }
    } catch (error) {
      console.error('Failed to toggle sub-task:', error);
    }
  }

  async function deleteSubTask(taskId: string, subTaskId: string) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task && task.subTasks) {
        await apiService.deleteSubTask(taskId, subTaskId);
        task.subTasks = task.subTasks.filter(s => s.id !== subTaskId);
      }
    } catch (error) {
      console.error('Failed to delete sub-task:', error);
    }
  }

  // Work log management
  async function addWorkLog(taskId: string, hours: number, description: string) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        const newLog = await apiService.addWorkLog(taskId, hours, description);
        if (!task.workLogs) task.workLogs = [];
        task.workLogs.push(newLog);
        task.loggedHours = (task.loggedHours || 0) + hours;
      }
    } catch (error) {
      console.error('Failed to add work log:', error);
    }
  }

  // Sprints
  async function refreshProjectSprints(projectId: string) {
    try {
      sprints.value = await apiService.getSprints(projectId);
    } catch (error) {
      console.error('Failed to load project sprints:', error);
      sprints.value = [];
    }
  }

  async function addSprint(projectId: string, sprintData: Omit<Sprint, 'id' | 'projectId'>) {
    try {
      const newSprint = await apiService.createSprint(projectId, sprintData);
      sprints.value.push(newSprint);
      return newSprint;
    } catch (error) {
      console.error('Failed to add sprint:', error);
      throw error;
    }
  }

  // Attendance
  async function getAttendance(projectId: string, date: string): Promise<AttendanceRecord[]> {
    try {
      return await apiService.getAttendance(projectId, date);
    } catch (error) {
      console.error('Failed to get attendance:', error);
      return [];
    }
  }

  async function saveAttendance(projectId: string, date: string, records: Omit<AttendanceRecord, 'id' | 'projectId' | 'date'>[]): Promise<void> {
    try {
      await apiService.saveAttendance(projectId, date, records);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      throw error;
    }
  }

  async function getAllProjectAttendance(projectId: string): Promise<AttendanceRecord[]> {
    try {
      return await apiService.getAllProjectAttendance(projectId);
    } catch (error) {
      console.error('Failed to get all project attendance:', error);
      return [];
    }
  }

  async function updateProject(projectId: string, projectData: Omit<Project, 'id' | 'createdAt' | 'progress' | 'members'>): Promise<void> {
    try {
      await apiService.updateProject(projectId, projectData);
      const p = projects.value.find(proj => proj.id === projectId);
      if (p) {
        Object.assign(p, projectData);
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  }

  return {
    users,
    projects,
    tasks,
    notifications,
    activityLogs,
    currentUser,
    events,
    toasts,
    init,
    getProjectProgress,
    totalTasks,
    inProgressTasks,
    overdueTasks,
    onlineMembersCount,
    unreadNotificationCount,
    todayTasks,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    addComment,
    refreshTaskComments,
    updateComment,
    deleteComment,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    refreshActivityLogs,
    createSelfNotification,
    addProject,
    updateProject,
    updateProjectMembers,
    updateUserRole,
    updateProfile,
    changePassword,
    
    // N2
    addSubTask,
    toggleSubTask,
    deleteSubTask,
    addWorkLog,

    // Sprints
    sprints,
    refreshProjectSprints,
    addSprint,

    // Attendance
    getAttendance,
    saveAttendance,
    getAllProjectAttendance,

    // Auth
    loginAction,
    registerAction,
    logoutAction
  };
});
