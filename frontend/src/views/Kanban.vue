<template>
  <div class="flex-1 flex flex-col h-screen overflow-hidden pb-6">
    <!-- Header with Project Filters -->
    <header class="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div class="flex items-center space-x-6">
        <h1 class="text-lg font-bold text-slate-800 tracking-tight">Bảng công việc Kanban</h1>
        
        <!-- Project Filter Dropdown -->
        <div class="relative flex items-center space-x-2">
          <span class="text-xs text-slate-400 font-medium">Dự án:</span>
          <select
            v-model="selectedProjectId"
            class="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
          >
            <option value="all">Tất cả dự án</option>
            <option v-for="proj in taskStore.projects" :key="proj.id" :value="proj.id">
              {{ proj.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex items-center space-x-3">
        <!-- Search bar stub inside Kanban -->
        <div class="relative w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Tìm nhanh công việc..."
            class="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-50 rounded-xl text-[11px] text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <button
          v-if="isManager"
          @click="openCreateModal"
          @mousedown="handleButtonClick"
          class="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all duration-200 relative overflow-hidden"
        >
          <Plus class="w-4 h-4" />
          <span>Tạo công việc</span>
        </button>
      </div>
    </header>

    <!-- Project Stats / Progress strip -->
    <div class="px-8 py-3 bg-white/70 backdrop-blur-md border-b border-slate-100/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-1.5">
          <span class="font-bold text-slate-700">Tổng số công việc:</span>
          <span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-extrabold">{{ projectTasks.length }}</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <span class="font-bold text-emerald-600">Đã hoàn thành:</span>
          <span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg font-extrabold">{{ doneTasksCount }}</span>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="flex items-center space-x-3 w-72">
        <span class="font-bold text-slate-700 shrink-0">Tiến độ dự án:</span>
        <div class="flex-1 h-2 bg-slate-100/70 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-indigo-500 to-emerald-505 rounded-full transition-all duration-500 ease-out" 
            :style="{ width: projectProgressPercent + '%' }"
          ></div>
        </div>
        <span class="font-extrabold text-indigo-600 w-8 text-right">{{ projectProgressPercent }}%</span>
      </div>
    </div>

    <!-- Tab navigation for smaller screens (Mobile/Tablet) -->
    <div class="lg:hidden flex space-x-2 px-8 py-3 overflow-x-auto bg-slate-50 border-b border-slate-100 shrink-0">
      <button
        v-for="col in columns"
        :key="col.status"
        @click="activeTab = col.status"
        class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center space-x-1.5 cursor-pointer"
        :class="[
          activeTab === col.status
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        ]"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="col.color"></span>
        <span>{{ col.name }}</span>
        <span
          class="text-[9.5px] px-1.5 py-0.5 rounded-md font-extrabold"
          :class="activeTab === col.status ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'"
        >
          {{ getTasksByStatus(col.status).length }}
        </span>
      </button>
      
      <!-- Option to view all columns -->
      <button
        @click="activeTab = 'all'"
        class="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center space-x-1.5 cursor-pointer"
        :class="[
          activeTab === 'all'
            ? 'bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-100'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        ]"
      >
        <span>Tất cả</span>
        <span
          class="text-[9.5px] px-1.5 py-0.5 rounded-md font-extrabold"
          :class="activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'"
        >
          {{ taskStore.tasks.length }}
        </span>
      </button>
    </div>

    <!-- Kanban Columns Area -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6 flex space-x-6 items-start h-full">
      <div
        v-for="col in columns"
        :key="col.status"
        class="w-full lg:w-80 bg-white/40 backdrop-blur-md rounded-3xl p-5 flex-col max-h-[80vh] border border-slate-200/40 shadow-sm shrink-0 transition-all duration-300"
        @dragover.prevent
        @dragenter="onDragEnter($event, col.status)"
        @dragleave="onDragLeave($event, col.status)"
        @drop="onDrop($event, col.status)"
        :class="[
          dragOverColumn === col.status ? 'bg-indigo-50/60 border-dashed border-indigo-400/80 ring-2 ring-indigo-500/10 scale-[1.01] shadow-lg shadow-indigo-500/5' : '',
          activeTab !== 'all' && activeTab !== col.status ? 'hidden lg:flex' : 'flex'
        ]"
      >
        <!-- Column Title -->
        <div class="flex items-center justify-between mb-4 px-1 shrink-0">
          <div class="flex items-center space-x-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="col.color"
            ></span>
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {{ col.name }}
            </h3>
          </div>
          <span class="bg-white text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200/50 shadow-sm">
            {{ getTasksByStatus(col.status).length }}
          </span>
        </div>

        <!-- Task List Inside Column (Scrollable) -->
        <div class="flex-1 overflow-y-auto pr-1 min-h-[150px]">
          <TransitionGroup name="kanban-list" tag="div" class="space-y-3 pb-2 relative">
            <TaskCard
              v-for="task in getTasksByStatus(col.status)"
              :key="task.id"
              :task="task"
              @click-detail="openTaskDetails"
            />
          </TransitionGroup>
          
          <!-- Empty column indicator -->
          <div
            v-if="getTasksByStatus(col.status).length === 0"
            class="text-[10px] text-slate-400 italic text-center py-8 border border-dashed border-slate-200 rounded-xl bg-white/20 select-none"
          >
            Kéo thả hoặc thêm việc vào đây
          </div>
        </div>

        <!-- Column Footer Add Button -->
        <button
          v-if="isManager"
          @click="openCreateModalWithStatus(col.status)"
          @mousedown="handleButtonClick"
          class="w-full mt-4 py-2 border border-slate-200/40 hover:border-indigo-300 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 shrink-0 relative overflow-hidden"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Thêm công việc</span>
        </button>
      </div>
    </div>

    <!-- Modals -->
    <QuickTaskModal
      :isOpen="isCreateModalOpen"
      :preselectedProjectId="selectedProjectId !== 'all' ? selectedProjectId : undefined"
      @close="isCreateModalOpen = false"
    />
    <TaskDetailModal
      :isOpen="isDetailModalOpen"
      :taskId="activeTaskId"
      @close="isDetailModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Plus } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '../services/mockData';
import TaskCard from '../components/TaskCard.vue';

import QuickTaskModal from '../components/QuickTaskModal.vue';
import TaskDetailModal from '../components/TaskDetailModal.vue';

const taskStore = useTaskStore();

// Project health statistics computed values
const projectTasks = computed(() => {
  if (selectedProjectId.value === 'all') {
    return taskStore.tasks;
  }
  return taskStore.tasks.filter(t => t.projectId === selectedProjectId.value);
});

const doneTasksCount = computed(() => {
  return projectTasks.value.filter(t => t.status === 'Done').length;
});

const projectProgressPercent = computed(() => {
  if (projectTasks.value.length === 0) return 0;
  return Math.round((doneTasksCount.value / projectTasks.value.length) * 100);
});

const isManager = computed(() => {
  const role = taskStore.currentUser.role;
  return role === 'Project Manager' || role === 'Admin';
});

const isViewer = computed(() => {
  return taskStore.currentUser.role === 'Viewer';
});

// Sóng nước kiểu Vuetify cho button
function handleButtonClick(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement;
  const circle = document.createElement('span');
  const diameter = Math.max(el.clientWidth, el.clientHeight);
  const radius = diameter / 2;

  const rect = el.getBoundingClientRect();
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-span-kanban');

  const oldRipple = el.querySelector('.ripple-span-kanban');
  if (oldRipple) {
    oldRipple.remove();
  }

  el.appendChild(circle);
}

// UI States
const selectedProjectId = ref('all');
const searchQuery = ref('');
const isCreateModalOpen = ref(false);
const isDetailModalOpen = ref(false);
const activeTaskId = ref<string | undefined>(undefined);
const dragOverColumn = ref<Task['status'] | null>(null);
const activeTab = ref<Task['status'] | 'all'>('all');

// Preset column info
const columns = [
  { status: 'Backlog' as const, name: 'Tích lũy', color: 'bg-rose-400', colorText: 'text-rose-600' },
  { status: 'ToDo' as const, name: 'Cần làm', color: 'bg-slate-400', colorText: 'text-slate-600' },
  { status: 'InProgress' as const, name: 'Đang làm', color: 'bg-emerald-500', colorText: 'text-emerald-600' },
  { status: 'Review' as const, name: 'Kiểm tra', color: 'bg-amber-500', colorText: 'text-amber-600' },
  { status: 'Done' as const, name: 'Hoàn thành', color: 'bg-indigo-600', colorText: 'text-indigo-600' }
];


// Drag & Drop Handlers
function onDragEnter(event: DragEvent, status: Task['status']) {
  dragOverColumn.value = status;
}

function onDragLeave(event: DragEvent, status: Task['status']) {
  if (dragOverColumn.value === status) {
    dragOverColumn.value = null;
  }
}

function onDrop(event: DragEvent, status: Task['status']) {
  dragOverColumn.value = null;
  if (isViewer.value) return; // Không cho phép kéo thả đối với Viewer
  if (event.dataTransfer) {
    const taskId = event.dataTransfer.getData('text/plain');
    if (taskId) {
      taskStore.updateTaskStatus(taskId, status);
    }
  }
}

// Get tasks filtered and by status
function getTasksByStatus(status: Task['status']) {
  let filtered = taskStore.tasks.filter(t => t.status === status);
  
  // Project Filter
  if (selectedProjectId.value !== 'all') {
    filtered = filtered.filter(t => t.projectId === selectedProjectId.value);
  }

  // Text search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }

  return filtered;
}

// Modal management
function openCreateModal() {
  isCreateModalOpen.value = true;
}

const targetStatusForNewTask = ref<Task['status']>('ToDo');
function openCreateModalWithStatus(status: Task['status']) {
  targetStatusForNewTask.value = status;
  // We can open standard quick modal. Let it default to ToDo, but if needed we could pass status.
  // For simplicity we open the standard modal, and it goes to ToDo, which is the standard task flow.
  isCreateModalOpen.value = true;
}

function openTaskDetails(taskId: string) {
  activeTaskId.value = taskId;
  isDetailModalOpen.value = true;
}
</script>

<style scoped>
/* Smooth scroll for list containers */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}

/* Kanban List Smooth Glide Transitions */
.kanban-list-move {
  transition: transform 0.45s cubic-bezier(0.23, 1, 0.32, 1);
}
.kanban-list-enter-active,
.kanban-list-leave-active {
  transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
}
.kanban-list-enter-from,
.kanban-list-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(12px);
}
.kanban-list-leave-active {
  position: absolute;
  width: 100%;
}

/* Ripple effect inside Kanban view */
:deep(.ripple-span-kanban) {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple-animation 500ms linear;
  background-color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 0;
}
:deep(button.bg-white .ripple-span-kanban) {
  background-color: rgba(99, 102, 241, 0.15); /* Indigo ripple on white buttons */
}
</style>
