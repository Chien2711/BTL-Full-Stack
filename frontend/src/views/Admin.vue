<template>
  <div class="flex-1 flex flex-col min-h-screen pb-12">
    <!-- Top Header Bar -->
    <header class="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div class="flex items-center space-x-3">
        <ShieldCheck class="w-6 h-6 text-indigo-600" />
        <h1 class="text-lg font-bold text-slate-800 tracking-tight">Trang Quản trị Hệ thống</h1>
      </div>
      <div class="flex items-center space-x-4">
        <!-- Back to Dashboard -->
        <router-link
          to="/"
          class="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-3.5 py-2 hover:bg-slate-50 rounded-xl transition-all"
        >
          Quay lại Dashboard
        </router-link>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex-1 px-8 py-6 max-w-6xl mx-auto w-full space-y-6">
      <!-- Admin Tab Selector -->
      <div class="flex space-x-3 border-b border-slate-100 pb-3">
        <button
          @click="activeSubTab = 'projects'"
          class="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
          :class="[
            activeSubTab === 'projects'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          ]"
        >
          <Briefcase class="w-4 h-4" />
          <span>Dự án & Thành viên</span>
        </button>
        <button
          @click="activeSubTab = 'users'"
          class="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
          :class="[
            activeSubTab === 'users'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          ]"
        >
          <Users class="w-4 h-4" />
          <span>Quản lý Tài khoản (Hồ sơ nhân sự)</span>
        </button>
      </div>

      <!-- Tab 1: Projects & Group Members Management -->
      <div v-if="activeSubTab === 'projects'" class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <h2 class="text-base font-bold text-slate-800">Quản lý Dự án & Thành viên</h2>
            <p class="text-xs text-slate-500">Xem danh sách dự án, thêm thành viên vào nhóm và phân công công việc.</p>
          </div>
          <button
            @click="isCreateProjectModalOpen = true"
            class="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all duration-200 cursor-pointer"
          >
            <FolderPlus class="w-4.5 h-4.5" />
            <span>Tạo dự án mới</span>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <!-- Projects List Left Side (1 Column) -->
          <div class="col-span-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Danh sách dự án</h3>
            <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              <div
                v-for="proj in taskStore.projects"
                :key="proj.id"
                @click="selectedProject = proj"
                class="p-3.5 rounded-xl border transition-all cursor-pointer text-left flex items-center justify-between"
                :class="[
                  selectedProject && selectedProject.id === proj.id
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-sm shadow-indigo-500/5'
                    : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                ]"
              >
                <div class="flex items-center space-x-3 min-w-0">
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :class="[
                      proj.color === 'indigo' ? 'bg-indigo-500' :
                      proj.color === 'amber' ? 'bg-amber-500' :
                      proj.color === 'emerald' ? 'bg-emerald-500' : 'bg-slate-500'
                    ]"
                  ></span>
                  <div class="truncate">
                    <p class="text-xs font-bold truncate leading-snug">{{ proj.name }}</p>
                    <p class="text-[10px] text-slate-400 font-medium truncate mt-0.5">{{ proj.statusText }}</p>
                  </div>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          <!-- Project Detail & Member Management Right Side (2 Columns) -->
          <div class="col-span-2 space-y-6">
            <div v-if="selectedProject" class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 text-left">
              <!-- Project Meta -->
              <div class="flex items-start justify-between border-b border-slate-50 pb-4">
                <div class="space-y-1.5 min-w-0">
                  <h3 class="text-lg font-bold text-slate-800">{{ selectedProject.name }}</h3>
                  <p class="text-xs text-slate-500 leading-relaxed">{{ selectedProject.description }}</p>
                </div>
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                  :class="[
                    selectedProject.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                    selectedProject.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                    'bg-emerald-50 text-emerald-600'
                  ]"
                >
                  {{ selectedProject.statusText }}
                </span>
              </div>

              <!-- Members Section -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Thành viên trong nhóm</h4>
                  
                  <!-- Add Member Quick Dropdown -->
                  <div class="relative">
                    <select
                      @change="addMemberToProject"
                      v-model="quickSelectedMemberId"
                      class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none rounded-xl text-xs font-bold focus:outline-none transition-all cursor-pointer appearance-none pr-8 pl-3"
                    >
                      <option value="" disabled selected>+ Thêm thành viên...</option>
                      <option v-for="user in usersNotInProject" :key="user.id" :value="user.id">
                        {{ user.fullName }} ({{ user.role }})
                      </option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-600">
                      <Plus class="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <!-- Members List -->
                <div v-if="selectedProject.members && selectedProject.members.length > 0" class="grid grid-cols-2 gap-4">
                  <div
                    v-for="member in selectedProject.members"
                    :key="member.id"
                    class="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group"
                  >
                    <div class="flex items-center space-x-3 min-w-0">
                      <img :src="member.avatarUrl" alt="Avatar" class="w-8 h-8 rounded-full border border-slate-100" />
                      <div class="truncate">
                        <p class="text-xs font-bold text-slate-700 truncate leading-snug">{{ member.fullName }}</p>
                        <p class="text-[10px] text-slate-400 font-medium truncate mt-0.5">{{ member.role }}</p>
                      </div>
                    </div>
                    <!-- Remove member from project -->
                    <button
                      @click="removeMemberFromProject(member.id)"
                      class="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa khỏi dự án"
                    >
                      <UserMinus class="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div v-else class="text-xs text-slate-400 italic py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  Chưa có thành viên nào trong dự án này. Hãy thêm thành viên đầu tiên!
                </div>
              </div>

              <!-- Tasks List in Project -->
              <div class="space-y-4 border-t border-slate-50 pt-6">
                <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Công việc trong dự án ({{ projectTasks.length }})</h4>
                <div v-if="projectTasks.length > 0" class="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div
                    v-for="task in projectTasks"
                    :key="task.id"
                    class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-slate-700 truncate leading-snug">{{ task.title }}</p>
                      <div class="flex items-center space-x-2 text-[10px] text-slate-450 mt-1">
                        <span class="font-semibold" :class="task.status === 'Done' ? 'text-indigo-600' : 'text-slate-450'">
                          {{ task.status === 'Done' ? 'Hoàn thành' : task.status === 'InProgress' ? 'Đang làm' : 'Cần làm' }}
                        </span>
                        <span>•</span>
                        <span>Người làm: <strong class="text-slate-600">{{ getAssigneeName(task.assigneeId) }}</strong></span>
                      </div>
                    </div>
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
                </div>
                <div v-else class="text-xs text-slate-400 italic py-3">
                  Chưa có công việc nào thuộc dự án này.
                </div>
              </div>
            </div>

            <!-- Empty selected Project display -->
            <div v-else class="h-64 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 text-slate-400">
              <Briefcase class="w-10 h-10 text-slate-300 stroke-[1.5] mb-2" />
              <p class="text-xs font-bold text-slate-500">Chưa có dự án nào được chọn</p>
              <p class="text-[10px] text-slate-400 max-w-[200px] leading-relaxed mt-1">Chọn một dự án từ danh sách bên trái để quản lý danh sách thành viên và các nhiệm vụ.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: User Accounts & Roles Management -->
      <div v-if="activeSubTab === 'users'" class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left space-y-5">
        <div class="space-y-1">
          <h2 class="text-base font-bold text-slate-800">Quản lý Tài khoản & Phân quyền</h2>
          <p class="text-xs text-slate-500">Danh sách thành viên hệ thống. Cập nhật các quyền hoặc vai trò trực tiếp.</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs text-slate-600 font-medium">
            <thead>
              <tr class="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                <th class="pb-3.5 pl-2">Họ tên & Tài khoản</th>
                <th class="pb-3.5">Email</th>
                <th class="pb-3.5">Trạng thái</th>
                <th class="pb-3.5">Vai trò hệ thống (Role)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="user in taskStore.users" :key="user.id" class="hover:bg-slate-50/50 transition-colors">
                <td class="py-3.5 pl-2 flex items-center space-x-3">
                  <img :src="user.avatarUrl" alt="Avatar" class="w-8 h-8 rounded-full border border-slate-100" />
                  <div>
                    <span class="font-bold text-slate-800 block leading-snug">{{ user.fullName }}</span>
                    <span class="text-[10px] text-slate-400 font-semibold block mt-0.5">ID: {{ user.id }}</span>
                  </div>
                </td>
                <td class="py-3.5 text-slate-700 font-semibold">{{ user.email || 'N/A' }}</td>
                <td class="py-3.5">
                  <span
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center w-max space-x-1"
                    :class="user.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"></span>
                    <span>{{ user.isOnline ? 'Trực tuyến' : 'Ngoại tuyến' }}</span>
                  </span>
                </td>
                <td class="py-3.5">
                  <!-- Role update selector -->
                  <div class="relative w-44">
                    <select
                      v-model="user.role"
                      @change="changeUserRole(user.id, user.role)"
                      class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Project Manager">Project Manager</option>
                      <option value="Backend Dev">Backend Dev</option>
                      <option value="Frontend Lead">Frontend Lead</option>
                      <option value="Business Analyst">Business Analyst</option>
                      <option value="DevOps Engineer">DevOps Engineer</option>
                      <option value="QA Engineer">QA Engineer</option>
                      <option value="UI/UX Designer">UI/UX Designer</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg class="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal: Create New Project -->
    <Transition name="modal">
      <div v-if="isCreateProjectModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col transition-all transform duration-300 text-left">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-sm font-bold text-slate-800">Tạo dự án mới</h3>
            <button @click="isCreateProjectModalOpen = false" class="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              <X class="w-4.5 h-4.5" />
            </button>
          </div>

          <form @submit.prevent="submitCreateProject" class="p-6 space-y-4">
            <!-- Project Name -->
            <div class="relative">
              <input
                v-model="newProject.name"
                id="proj_name"
                type="text"
                required
                placeholder=" "
                class="peer w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
              />
              <label
                for="proj_name"
                class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                       peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
                       peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:text-indigo-500 peer-focus:px-1 peer-focus:bg-white
                       peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:bg-white"
              >
                Tên dự án...
              </label>
            </div>

            <!-- Description -->
            <div class="relative">
              <textarea
                v-model="newProject.description"
                id="proj_desc"
                rows="3"
                required
                placeholder=" "
                class="peer w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold resize-none"
              ></textarea>
              <label
                for="proj_desc"
                class="absolute left-2.5 top-4 text-xs font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                       peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs 
                       peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:text-indigo-500 peer-focus:px-1 peer-focus:bg-white
                       peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:bg-white"
              >
                Mô tả ngắn về dự án...
              </label>
            </div>

            <!-- Color Palette selector -->
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Màu sắc chủ đề</label>
              <div class="flex space-x-3">
                <button
                  v-for="color in ['indigo', 'amber', 'emerald']"
                  :key="color"
                  type="button"
                  @click="newProject.color = color"
                  class="w-6 h-6 rounded-full border transition-all cursor-pointer flex items-center justify-center"
                  :class="[
                    color === 'indigo' ? 'bg-indigo-500 border-indigo-500' :
                    color === 'amber' ? 'bg-amber-500 border-amber-500' : 'bg-emerald-500 border-emerald-500',
                    newProject.color === color ? 'ring-2 ring-indigo-500/20 scale-110 shadow-md' : 'opacity-75 hover:opacity-100'
                  ]"
                >
                  <span v-if="newProject.color === color" class="w-1.5 h-1.5 bg-white rounded-full"></span>
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center space-x-3 pt-3">
              <button
                type="button"
                @click="isCreateProjectModalOpen = false"
                class="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all cursor-pointer text-center"
              >
                Tạo dự án
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  ShieldCheck,
  Briefcase,
  Users,
  ChevronRight,
  Plus,
  UserMinus,
  X,
  FolderPlus
} from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';
import type { Project } from '../services/mockData';

const taskStore = useTaskStore();
const router = useRouter();

// UI States
const activeSubTab = ref<'projects' | 'users'>('projects');
const selectedProject = ref<Project | null>(null);
const quickSelectedMemberId = ref('');
const isCreateProjectModalOpen = ref(false);

// Create Project fields
const newProject = ref<Omit<Project, 'id' | 'createdAt' | 'progress'>>({
  name: '',
  description: '',
  color: 'indigo',
  status: 'New',
  statusText: 'Lên kế hoạch',
  members: []
});

// Access Protection on Mount
onMounted(() => {
  const role = taskStore.currentUser?.role;
  if (role !== 'Project Manager' && role !== 'Admin') {
    router.push('/');
  } else {
    // Select the first project by default if available
    if (taskStore.projects.length > 0) {
      selectedProject.value = taskStore.projects[0];
    }
  }
});

// Computed list of tasks for selected project
const projectTasks = computed(() => {
  if (!selectedProject.value) return [];
  return taskStore.tasks.filter(t => t.projectId === selectedProject.value?.id);
});

// Computed list of users who are NOT in the currently selected project
const usersNotInProject = computed(() => {
  if (!selectedProject.value) return [];
  const currentMembers = selectedProject.value.members || [];
  const memberIds = currentMembers.map(m => m.id);
  return taskStore.users.filter(u => !memberIds.includes(u.id));
});

function getAssigneeName(assigneeId?: string) {
  if (!assigneeId) return 'Chưa phân công';
  const ids = assigneeId.split(',').map(id => id.trim()).filter(Boolean);
  if (ids.length === 0) return 'Chưa phân công';
  const names = ids.map(id => {
    const u = taskStore.users.find(user => user.id === id);
    return u ? u.fullName : null;
  }).filter(Boolean);
  return names.length > 0 ? names.join(', ') : 'Chưa phân công';
}

// Add member to selected project
async function addMemberToProject() {
  if (selectedProject.value && quickSelectedMemberId.value) {
    const memberIds = (selectedProject.value.members || []).map(m => m.id);
    const updatedIds = [...memberIds, quickSelectedMemberId.value];
    
    await taskStore.updateProjectMembers(selectedProject.value.id, updatedIds);
    
    // Refresh selected project details local reference
    const p = taskStore.projects.find(proj => proj.id === selectedProject.value?.id);
    if (p) selectedProject.value = p;
    
    // Reset select option
    quickSelectedMemberId.value = '';
  }
}

// Remove member from selected project
async function removeMemberFromProject(userId: string) {
  if (selectedProject.value && confirm('Xóa thành viên này khỏi nhóm dự án?')) {
    const memberIds = (selectedProject.value.members || []).map(m => m.id);
    const updatedIds = memberIds.filter(id => id !== userId);
    
    await taskStore.updateProjectMembers(selectedProject.value.id, updatedIds);
    
    // Refresh selected project reference
    const p = taskStore.projects.find(proj => proj.id === selectedProject.value?.id);
    if (p) selectedProject.value = p;
  }
}

// Change user role action
async function changeUserRole(userId: string, role: string) {
  if (confirm(`Bạn có chắc chắn muốn đổi vai trò của người dùng này thành ${role}?`)) {
    await taskStore.updateUserRole(userId, role);
  } else {
    // If cancelled, reload store data to reset view selection
    await taskStore.init();
  }
}

// Create project form submit
async function submitCreateProject() {
  if (newProject.value.name.trim() && newProject.value.description.trim()) {
    const projData = {
      name: newProject.value.name.trim(),
      description: newProject.value.description.trim(),
      color: newProject.value.color,
      status: newProject.value.status,
      statusText: newProject.value.statusText,
      members: [] // default empty members on creation
    };
    
    await taskStore.addProject(projData);
    
    // Select the newly created project
    if (taskStore.projects.length > 0) {
      selectedProject.value = taskStore.projects[taskStore.projects.length - 1];
    }
    
    // Reset state & close modal
    newProject.value = {
      name: '',
      description: '',
      color: 'indigo',
      status: 'New',
      statusText: 'Lên kế hoạch',
      members: []
    };
    isCreateProjectModalOpen.value = false;
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.9);
}

/* Custom scroll for left drawer list */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}
</style>
