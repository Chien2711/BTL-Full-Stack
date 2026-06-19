<template>
  <div
    :draggable="!isViewer"
    @dragstart="dragStart"
    @dragend="dragEnd"
    @click="openDetails"
    @mousedown="handleCardClick"
    class="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-100 hover:border-indigo-400/50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1.5 hover:scale-[1.01] transition-all duration-300 ease-out select-none space-y-3.5 relative overflow-hidden"
    :class="[
      isViewer ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      { 'opacity-50 border-dashed border-indigo-400': isDragging }
    ]"
  >
    <!-- Card Header: Project Name & Priority -->
    <div class="flex items-center justify-between">
      <!-- Project Indicator -->
      <span
        class="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md"
        :class="[
          projectColor === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
          projectColor === 'amber' ? 'bg-amber-50 text-amber-600' :
          'bg-emerald-50 text-emerald-600'
        ]"
      >
        {{ projectName }}
      </span>

      <!-- Priority Badge -->
      <span
        class="text-[9px] font-extrabold px-2 py-0.5 rounded-md border"
        :class="[
          task.priority === 'High' ? 'bg-rose-50 border-rose-100 text-rose-600' :
          task.priority === 'Medium' ? 'bg-amber-50 border-amber-100 text-amber-600' :
          'bg-emerald-50 border-emerald-100 text-emerald-600'
        ]"
      >
        {{ task.priority === 'High' ? 'Cao' : task.priority === 'Medium' ? 'T.Bình' : 'Thấp' }}
      </span>
    </div>

    <!-- Title -->
    <h4 class="text-xs font-bold text-slate-700 leading-snug line-clamp-2">
      {{ task.title }}
    </h4>

    <!-- Subtasks Progress Bar -->
    <div v-if="subTasksCount > 0" class="space-y-1">
      <div class="flex justify-between text-[9px] text-slate-400 font-bold">
        <span class="flex items-center">
          <CheckSquare class="w-3 h-3 mr-1 text-slate-400" />
          {{ completedSubTasksCount }}/{{ subTasksCount }} việc con
        </span>
        <span>{{ subTasksProgressPercent }}%</span>
      </div>
      <div class="h-1 bg-slate-100/70 rounded-full overflow-hidden">
        <div
          class="h-full bg-indigo-500 rounded-full transition-all duration-300"
          :style="{ width: subTasksProgressPercent + '%' }"
        ></div>
      </div>
    </div>

    <!-- Card Footer: Due Date, Comments count, Assignee -->
    <div class="flex items-center justify-between pt-3 border-t border-slate-50">
      <!-- Due Date & Comments -->
      <div class="flex items-center space-x-2.5">
        <!-- Date -->
        <div 
          class="flex items-center text-[10px] font-bold" 
          :class="isOverdue && task.status !== 'Done' ? 'text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md' : 'text-slate-400'"
        >
          <Clock class="w-3.5 h-3.5 mr-0.5" />
          <span>{{ formattedDate }}</span>
        </div>

        <!-- Comments Count -->
        <div v-if="commentsCount > 0" class="flex items-center text-[10px] font-bold text-slate-400 hover:text-slate-600">
          <MessageSquare class="w-3.5 h-3.5 mr-0.5" />
          <span>{{ commentsCount }}</span>
        </div>
      </div>

      <!-- Quick Move Control Center & Assignee Avatar -->
      <div class="flex items-center space-x-2.5">
        <!-- Quick Action Buttons -->
        <div v-if="!isViewer" class="flex items-center space-x-1">
          <!-- Move Left Arrow -->
          <button
            v-if="canMoveLeft"
            type="button"
            @click.stop="moveLeft"
            class="w-5.5 h-5.5 rounded-lg border border-slate-100/80 hover:border-indigo-200 bg-white hover:bg-indigo-50/20 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Di chuyển sang trái"
          >
            <ChevronLeft class="w-3.5 h-3.5" />
          </button>

          <!-- Quick Status Switch Dropdown -->
          <div class="relative inline-block">
            <button
              type="button"
              @click.stop="isMenuOpen = !isMenuOpen"
              class="w-5.5 h-5.5 rounded-lg border border-slate-100/80 hover:border-indigo-200 bg-white hover:bg-indigo-50/20 text-slate-400 hover:text-indigo-650 flex items-center justify-center transition-colors cursor-pointer"
              title="Chuyển trạng thái nhanh"
            >
              <ArrowLeftRight class="w-3 h-3" />
            </button>
            
            <!-- Dropdown menu -->
            <div
              v-if="isMenuOpen"
              class="absolute bottom-full right-0 mb-2 w-36 rounded-xl bg-white border border-slate-150 shadow-xl z-30 py-1.5 focus:outline-none"
              @click.stop
            >
              <div class="px-2.5 py-1 border-b border-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Chuyển sang:
              </div>
              <button
                v-for="col in targetColumns"
                :key="col.status"
                type="button"
                @click.stop="moveToStatus(col.status)"
                class="w-full text-left px-3 py-1.5 text-[11px] hover:bg-indigo-50/50 text-slate-650 hover:text-indigo-650 font-bold flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="col.color"></span>
                <span>{{ col.name }}</span>
              </button>
            </div>
            
            <!-- Transparent click-away overlay -->
            <div v-if="isMenuOpen" class="fixed inset-0 z-20 cursor-default" @click.stop="isMenuOpen = false"></div>
          </div>

          <!-- Move Right Arrow -->
          <button
            v-if="canMoveRight"
            type="button"
            @click.stop="moveRight"
            class="w-5.5 h-5.5 rounded-lg border border-slate-100/80 hover:border-indigo-200 bg-white hover:bg-indigo-50/20 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Di chuyển sang phải"
          >
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Assignees Stacked List -->
        <div v-if="assignees.length > 0" class="flex -space-x-1.5 overflow-hidden items-center">
          <img
            v-for="user in assignees"
            :key="user.id"
            :src="user.avatarUrl"
            :alt="user.fullName"
            :title="user.fullName"
            class="w-5.5 h-5.5 rounded-full border border-slate-100 ring-2 ring-white hover:scale-110 hover:z-10 transition-transform duration-150"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Clock, MessageSquare, ArrowLeftRight, ChevronLeft, ChevronRight, CheckSquare } from '@lucide/vue';
import type { Task, User } from '../services/mockData';
import { useTaskStore } from '../stores/taskStore';

// Sóng nước nhạt màu chèn vào thẻ task
function handleCardClick(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement;
  const circle = document.createElement('span');
  const diameter = Math.max(el.clientWidth, el.clientHeight);
  const radius = diameter / 2;

  const rect = el.getBoundingClientRect();
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-span-card');

  const oldRipple = el.querySelector('.ripple-span-card');
  if (oldRipple) {
    oldRipple.remove();
  }

  el.appendChild(circle);
}

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  (e: 'click-detail', taskId: string): void;
}>();

const taskStore = useTaskStore();

const isViewer = computed(() => {
  return taskStore.currentUser.role === 'Viewer';
});
const isDragging = ref(false);

const isMenuOpen = ref(false);

// Subtasks calculations for mini progress bar
const subTasksCount = computed(() => props.task.subTasks ? props.task.subTasks.length : 0);
const completedSubTasksCount = computed(() => props.task.subTasks ? props.task.subTasks.filter(s => s.isCompleted).length : 0);
const subTasksProgressPercent = computed(() => subTasksCount.value > 0 ? Math.round((completedSubTasksCount.value / subTasksCount.value) * 100) : 0);

// Status list order for sliding left/right
const statusOrder: Task['status'][] = ['Backlog', 'ToDo', 'InProgress', 'Review', 'Done'];
const currentStatusIndex = computed(() => statusOrder.indexOf(props.task.status));

const canMoveLeft = computed(() => currentStatusIndex.value > 0);
const canMoveRight = computed(() => currentStatusIndex.value < statusOrder.length - 1);

function moveLeft() {
  if (canMoveLeft.value) {
    const nextStatus = statusOrder[currentStatusIndex.value - 1];
    taskStore.updateTaskStatus(props.task.id, nextStatus);
  }
}

function moveRight() {
  if (canMoveRight.value) {
    const nextStatus = statusOrder[currentStatusIndex.value + 1];
    taskStore.updateTaskStatus(props.task.id, nextStatus);
  }
}

const targetColumns = computed(() => {
  const allCols = [
    { status: 'Backlog' as const, name: 'Tích lũy', color: 'bg-rose-400' },
    { status: 'ToDo' as const, name: 'Cần làm', color: 'bg-slate-400' },
    { status: 'InProgress' as const, name: 'Đang làm', color: 'bg-emerald-500' },
    { status: 'Review' as const, name: 'Kiểm tra', color: 'bg-amber-500' },
    { status: 'Done' as const, name: 'Hoàn thành', color: 'bg-indigo-600' }
  ];
  return allCols.filter(col => col.status !== props.task.status);
});

function moveToStatus(status: Task['status']) {
  isMenuOpen.value = false;
  taskStore.updateTaskStatus(props.task.id, status);
}

const assignees = computed<User[]>(() => {
  if (!props.task.assigneeId) return [];
  const ids = props.task.assigneeId.split(',');
  return taskStore.users.filter(u => ids.includes(u.id));
});

const project = computed(() => {
  return taskStore.projects.find(p => p.id === props.task.projectId);
});

const projectName = computed(() => project.value ? project.value.name : 'Dự án');
const projectColor = computed(() => project.value ? project.value.color : 'indigo');
const commentsCount = computed(() => props.task.comments ? props.task.comments.length : 0);

const formattedDate = computed(() => {
  const dateStr = props.task.dueDate;
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) return 'Hôm nay';
  
  // Return readable dd/mm
  try {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  } catch (e) {
    return dateStr;
  }
});

const isOverdue = computed(() => {
  const todayStr = new Date().toISOString().split('T')[0];
  return props.task.dueDate < todayStr;
});

function dragStart(event: DragEvent) {
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', props.task.id);
  }
  // Optional style hook for parents
  document.body.classList.add('dragging');
}

function dragEnd() {
  isDragging.value = false;
  document.body.classList.remove('dragging');
}

function openDetails() {
  emit('click-detail', props.task.id);
}
</script>

<style>
.ripple-span-card {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: card-ripple-animation 550ms linear;
  background-color: rgba(99, 102, 241, 0.12); /* light indigo ripple */
  pointer-events: none;
  z-index: 0;
}

@keyframes card-ripple-animation {
  to {
    transform: scale(3.5);
    opacity: 0;
  }
}
</style>
