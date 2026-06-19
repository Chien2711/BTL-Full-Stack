import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type Task, type Project, type User, type Comment, type PublishedEvent } from '../services/mockData';
import { apiService } from '../services/api';

export const useTaskStore = defineStore('taskStore', () => {
  const users = ref<User[]>([]);
  const projects = ref<Project[]>([]);
  const tasks = ref<Task[]>([]);
  const currentUser = ref<User>({} as User);
  
  // Event Hub states
  const events = ref<PublishedEvent[]>([]);
  const toasts = ref<{ id: string; type: string; message: string }[]>([]);

  // Initialize data asynchronously from API service
  async function init() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      users.value = await apiService.getUsers();
      projects.value = await apiService.getProjects();
      tasks.value = await apiService.getTasks();
      currentUser.value = await apiService.getCurrentUser();
      
      // Set default values if fields are missing in older storage
      tasks.value.forEach(t => {
        if (!t.subTasks) t.subTasks = [];
        if (!t.workLogs) t.workLogs = [];
        if (!t.labels) t.labels = [];
        if (t.estimatedHours === undefined) t.estimatedHours = 0;
        if (t.loggedHours === undefined) t.loggedHours = 0;
      });
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
  async function addComment(taskId: string, content: string) {
    try {
      const task = tasks.value.find(t => t.id === taskId);
      if (task) {
        const newComment = await apiService.addComment(taskId, content);
        if (!task.comments) task.comments = [];
        task.comments.push(newComment);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
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

  async function updateProjectMembers(projectId: string, memberIds: string[]) {
    try {
      await apiService.updateProjectMembers(projectId, memberIds);
      const proj = projects.value.find(p => p.id === projectId);
      if (proj) {
        proj.members = users.value.filter(u => memberIds.includes(u.id)).map(u => ({
          id: u.id,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl,
          role: u.role,
          isOnline: u.isOnline
        }));
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

  return {
    users,
    projects,
    tasks,
    currentUser,
    events,
    toasts,
    init,
    getProjectProgress,
    totalTasks,
    inProgressTasks,
    overdueTasks,
    onlineMembersCount,
    todayTasks,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    addComment,
    addProject,
    updateProjectMembers,
    updateUserRole,
    
    // N2
    addSubTask,
    toggleSubTask,
    deleteSubTask,
    addWorkLog,

    // Auth
    loginAction,
    registerAction,
    logoutAction
  };
});
