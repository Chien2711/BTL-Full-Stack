<template>
  <div class="flex-1 flex flex-col min-h-screen pb-12">
    <!-- Top Header Bar -->
    <header class="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <!-- Search -->
      <div class="relative w-96">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm kiếm dự án, công việc..."
          class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200"
        />
      </div>

      <!-- User Profile Card -->
      <div class="flex items-center space-x-4">
        <router-link to="/notifications" class="relative p-2 hover:bg-slate-50 rounded-xl transition-colors">
          <Bell class="w-5 h-5 text-slate-500" />
          <span v-if="taskStore.unreadNotificationCount > 0" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </router-link>
        
        <!-- Date -->
        <span class="text-xs text-slate-400 font-medium">{{ formattedDate }}</span>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="flex-1 px-8 py-6 max-w-6xl mx-auto w-full space-y-8">
      <!-- Greeting and CTA Banner -->
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            Chào buổi sáng, {{ firstName }}!
            <span class="inline-block animate-wave ml-2 origin-[70%_70%]">👋</span>
          </h1>
          <p class="text-sm text-slate-500">
            Hôm nay bạn có <span class="font-semibold text-indigo-600">{{ taskStore.todayTasks.length }}</span> nhiệm vụ quan trọng cần xử lý trong các dự án tham gia.
          </p>
        </div>
        <button
          v-if="isManager"
          @click="isCreateModalOpen = true"
          class="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus class="w-4.5 h-4.5" />
          <span>Tạo công việc mới</span>
        </button>
      </div>

      <!-- Quick stats cards grid (Matches screenshot metrics layout) -->
      <div class="grid grid-cols-4 gap-6">
        <!-- Card 1: Total Tasks -->
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div class="space-y-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng công việc</span>
            <h3 class="text-3xl font-extrabold text-indigo-600 tracking-tight">{{ taskStore.totalTasks }}</h3>
            <p class="text-[10px] text-slate-400">Nhiệm vụ trong dự án</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Briefcase class="w-6 h-6" />
          </div>
        </div>

        <!-- Card 2: In Progress -->
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div class="space-y-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang tiến hành</span>
            <h3 class="text-3xl font-extrabold text-emerald-500 tracking-tight">{{ taskStore.inProgressTasks }}</h3>
            <p class="text-[10px] text-emerald-500 font-semibold">↑ 12% so với tuần trước</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <Clock class="w-6 h-6" />
          </div>
        </div>

        <!-- Card 3: Overdue -->
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div class="space-y-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Công việc quá hạn</span>
            <h3 class="text-3xl font-extrabold text-rose-500 tracking-tight">{{ taskStore.overdueTasks }}</h3>
            <p class="text-[10px] text-rose-500 font-semibold">Cần xử lý ngay hôm nay</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
            <AlertTriangle class="w-6 h-6" />
          </div>
        </div>

        <!-- Card 4: Active Online Members -->
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div class="space-y-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Thành viên online</span>
            <h3 class="text-3xl font-extrabold text-amber-500 tracking-tight">{{ taskStore.onlineMembersCount }}</h3>
            <p class="text-[10px] text-slate-400">Đang hoạt động trực tiếp</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Users class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Main Layout Grid (Projects on Left, Today's Tasks on Right) -->
      <div class="grid grid-cols-3 gap-8">
        <!-- Left Side: Projects (2 Columns Wide) -->
        <div class="col-span-2 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-slate-800 tracking-tight">Dự án tham gia</h2>
            <router-link to="/kanban" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center space-x-1">
              <span>Xem chi tiết Kanban</span>
              <ChevronRight class="w-4 h-4" />
            </router-link>
          </div>

          <!-- Project Cards Grid -->
          <div class="grid grid-cols-2 gap-6">
            <div
              v-for="project in filteredProjects"
              :key="project.id"
              class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col justify-between h-56"
            >
              <!-- Project Header -->
              <div>
                <div class="flex items-start justify-between">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    :class="[
                      project.color === 'indigo' ? 'bg-indigo-500' :
                      project.color === 'amber' ? 'bg-amber-500' :
                      project.color === 'emerald' ? 'bg-emerald-500' : 'bg-slate-500'
                    ]"
                  >
                    <!-- Project Custom Icon Shape -->
                    <svg v-if="project.color === 'indigo'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5.5 h-5.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                    <svg v-else-if="project.color === 'amber'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5.5 h-5.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5.5 h-5.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A9.342 9.342 0 0 0 12 21a9.34 9.34 0 0 0-3-1.763V19.13c0-1.113.285-2.16.786-3.07M12 18.046a9.33 9.33 0 0 0 3-.54M12 18.046a9.33 9.33 0 0 1-3-.54M9.786 16.06L9.785 16.06a9.37 9.37 0 0 0-2.625.372 4.125 4.125 0 0 0 7.533 2.493M7.215 14.884a8.989 8.989 0 0 0-2.215.372c-1.896.539-3 2.285-3 4.116v.109A9.342 9.342 0 0 0 5 21a9.34 9.34 0 0 0 3-1.763V19.13c0-1.113.285-2.16.786-3.07M5 12.046a9.33 9.33 0 0 0 3-.54M5 12.046a9.33 9.33 0 0 1-3-.54M2.786 10.06A9.34 9.34 0 0 0 5 12.046M12 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </div>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                    :class="[
                      project.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                      project.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    ]"
                  >
                    {{ project.statusText }}
                  </span>
                </div>
                
                <h3 class="text-sm font-bold text-slate-800 mt-4 group-hover:text-indigo-600 transition-colors">
                  {{ project.name }}
                </h3>
                <p class="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {{ project.description }}
                </p>
              </div>

              <!-- Project Footer Area -->
              <div class="mt-4 pt-4 border-t border-slate-50 space-y-3">
                <!-- Members stacked list -->
                <div class="flex items-center justify-between">
                  <div class="flex -space-x-1.5 overflow-hidden">
                    <img
                      v-for="member in project.members"
                      :key="member.id"
                      :src="member.avatarUrl"
                      :alt="member.fullName"
                      :title="member.fullName"
                      class="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-white"
                    />
                  </div>
                  <span class="text-[10px] text-slate-400 font-medium">Cập nhật hôm qua</span>
                </div>

                <!-- Progress Bar -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[10px] font-semibold">
                    <span class="text-slate-400">Tiến độ dự án</span>
                    <span :class="[
                      project.color === 'indigo' ? 'text-indigo-600' :
                      project.color === 'amber' ? 'text-amber-600' :
                      'text-emerald-600'
                    ]">{{ taskStore.getProjectProgress(project.id) }}%</span>
                  </div>
                  <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="[
                        project.color === 'indigo' ? 'bg-indigo-600' :
                        project.color === 'amber' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      ]"
                      :style="{ width: taskStore.getProjectProgress(project.id) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side: Today's Tasks Checklist (1 Column Wide) -->
        <div class="space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-slate-800 tracking-tight flex items-center space-x-1.5">
              <span>Công việc hôm nay</span>
              <span class="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {{ taskStore.todayTasks.length }} việc
              </span>
            </h2>
          </div>

          <!-- Checklist panel -->
          <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
            <div v-if="taskStore.todayTasks.length > 0" class="space-y-3 flex-1">
              <div
                v-for="task in taskStore.todayTasks"
                :key="task.id"
                class="flex items-start space-x-3.5 p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors group cursor-pointer"
                @click.self="openTaskDetails(task.id)"
              >
                <!-- Custom Checkbox -->
                <div class="mt-0.5 flex items-center" @click.stop="!isViewer && toggleTaskCompleted(task)">
                  <div
                    class="w-5 h-5 rounded-md border flex items-center justify-center transition-all"
                    :class="[
                      task.status === 'Done'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white group-hover:border-indigo-500',
                      isViewer ? 'cursor-default' : 'cursor-pointer'
                    ]"
                  >
                    <Check v-if="task.status === 'Done'" class="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                <!-- Text & Metadata -->
                <div class="flex-1 space-y-1" @click="openTaskDetails(task.id)">
                  <h4
                    class="text-xs font-bold text-slate-700 leading-snug group-hover:text-indigo-600 transition-colors"
                    :class="{ 'line-through text-slate-400': task.status === 'Done' }"
                  >
                    {{ task.title }}
                  </h4>
                  <div class="flex items-center space-x-2 text-[10px] font-medium text-slate-400">
                    <span class="flex items-center">
                      <Clock class="w-3 h-3 mr-0.5" />
                      {{ task.dueDate === todayStr ? 'Hôm nay' : task.dueDate }}
                    </span>
                    <span>•</span>
                    <span
                      class="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      :class="[
                        task.priority === 'High' ? 'bg-rose-50 text-rose-500' :
                        task.priority === 'Medium' ? 'bg-amber-50 text-amber-500' :
                        'bg-emerald-50 text-emerald-500'
                      ]"
                    >
                      {{ task.priority === 'High' ? 'Cao' : task.priority === 'Medium' ? 'Trung bình' : 'Thấp' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty view -->
            <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <CheckCircle class="w-6 h-6 text-emerald-500" />
              </div>
              <div class="space-y-1">
                <h4 class="text-xs font-bold text-slate-700">Tất cả đã hoàn thành!</h4>
                <p class="text-[10px] text-slate-400 max-w-[180px]">Hôm nay bạn không còn nhiệm vụ nào quá hạn hoặc cần làm.</p>
              </div>
            </div>

            <!-- Add quick task button -->
            <button
              v-if="isManager"
              @click="isCreateModalOpen = true"
              class="w-full mt-4 py-2.5 border border-dashed border-slate-200 hover:border-indigo-400 text-slate-400 hover:text-indigo-600 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all bg-slate-50/50 hover:bg-indigo-50/30"
            >
              <Plus class="w-4 h-4" />
              <span>Thêm nhiệm vụ</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <QuickTaskModal :isOpen="isCreateModalOpen" @close="isCreateModalOpen = false" />
    <TaskDetailModal :isOpen="isDetailModalOpen" :taskId="activeTaskId" @close="isDetailModalOpen = false" />

    <!-- Footer -->
    <footer class="mt-auto pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 px-8 flex justify-between items-center max-w-6xl mx-auto w-full">
      <span>© 2026 SprintFlow - Hệ thống quản lý dự án & phân công công việc</span>
      <div class="space-x-4">
        <a href="#" class="hover:text-slate-600">Trang chủ</a>
        <a href="#" class="hover:text-slate-600">Điều khoản</a>
        <a href="#" class="hover:text-slate-600">Liên hệ</a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Search,
  Bell,
  Plus,
  Briefcase,
  Clock,
  AlertTriangle,
  Users,
  ChevronRight,
  Check,
  CheckCircle
} from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '../services/mockData';
import QuickTaskModal from '../components/QuickTaskModal.vue';
import TaskDetailModal from '../components/TaskDetailModal.vue';


const taskStore = useTaskStore();

const isManager = computed(() => {
  const role = taskStore.currentUser.role;
  return role === 'Project Manager' || role === 'Admin';
});

const isViewer = computed(() => {
  return taskStore.currentUser.role === 'Viewer';
});

// Modals State
const isCreateModalOpen = ref(false);
const isDetailModalOpen = ref(false);
const activeTaskId = ref<string | undefined>(undefined);

// Search Query
const searchQuery = ref('');

// Computed Dates
const todayStr = computed(() => new Date().toISOString().split('T')[0]);
const formattedDate = computed(() => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' };
  const str = new Date().toLocaleDateString('vi-VN', options);
  // Capitalize first letter (e.g. "Thứ hai...")
  return str.charAt(0).toUpperCase() + str.slice(1);
});

// Greeting computations
const firstName = computed(() => {
  const fullName = taskStore.currentUser.fullName || 'Việt';
  return fullName.split(' ').pop(); // Get last word ("Việt")
});

// Filtering projects based on search query
const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) return taskStore.projects;
  const query = searchQuery.value.toLowerCase();
  return taskStore.projects.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.description.toLowerCase().includes(query)
  );
});

// Toggle Task Completed
function toggleTaskCompleted(task: Task) {
  const newStatus = task.status === 'Done' ? 'ToDo' : 'Done';
  taskStore.updateTaskStatus(task.id, newStatus);
}

// Open Task Details Modal
function openTaskDetails(taskId: string) {
  activeTaskId.value = taskId;
  isDetailModalOpen.value = true;
}
</script>

<style>
@keyframes wave {
  0% { transform: rotate( 0.0deg) }
  10% { transform: rotate(14.0deg) }
  20% { transform: rotate(-8.0deg) }
  30% { transform: rotate(14.0deg) }
  40% { transform: rotate(-4.0deg) }
  50% { transform: rotate(10.0deg) }
  60% { transform: rotate( 0.0deg) }
  100% { transform: rotate( 0.0deg) }
}

.animate-wave {
  animation: wave 2.5s infinite;
}
</style>
