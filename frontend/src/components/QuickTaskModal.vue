<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <!-- Modal Panel -->
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 transition-all transform duration-300">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">Tạo công việc mới</h3>
          <button @click="close" class="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Content -->
        <form @submit.prevent="submitForm" class="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <!-- Title -->
          <div class="relative w-full">
            <input
              v-model="title"
              id="quick_title"
              type="text"
              required
              placeholder=" "
              class="peer w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold"
            />
            <label
              for="quick_title"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                     peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm 
                     peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:px-1.5 peer-focus:bg-white
                     peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-white"
            >
              Tiêu đề công việc *
            </label>
          </div>

          <!-- Project & Assignee Grid -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Project -->
            <div class="relative w-full">
              <!-- Regular Dropdown Selector with Add Button -->
              <div v-if="!showNewProjectInput" class="flex items-center gap-1.5">
                <div class="relative flex-1">
                  <select
                    v-model="projectId"
                    id="quick_project"
                    required
                    class="peer w-full pl-3 pr-8 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold appearance-none cursor-pointer"
                  >
                    <option v-for="proj in taskStore.projects" :key="proj.id" :value="proj.id">
                      {{ proj.name }}
                    </option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
                <button
                  v-if="isManager"
                  type="button"
                  @click="showNewProjectInput = true"
                  class="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  title="Thêm dự án mới"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>

              <!-- Inline New Project Creator -->
              <div v-else class="flex items-center gap-1.5">
                <div class="relative flex-1">
                  <input
                    v-model="newProjectName"
                    type="text"
                    placeholder="Tên dự án mới..."
                    required
                    class="w-full px-3 py-3 bg-white border border-indigo-500 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold"
                    @keyup.enter="handleCreateProject"
                  />
                </div>
                <button
                  type="button"
                  @click="handleCreateProject"
                  class="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100/50 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  title="Xác nhận"
                >
                  <Check class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  @click="cancelNewProject"
                  class="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  title="Hủy"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <label
                for="quick_project"
                class="absolute left-3 top-0 -translate-y-1/2 text-[10px] font-bold text-indigo-500 px-1 bg-white"
              >
                Dự án *
              </label>
            </div>

            <!-- Assignee (Multi-select dropdown) -->
            <div class="relative w-full">
              <div class="relative">
                <button
                  type="button"
                  @click="isAssigneeDropdownOpen = !isAssigneeDropdownOpen"
                  class="w-full text-left px-3 py-3 bg-slate-50/55 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold cursor-pointer flex items-center justify-between"
                >
                  <span class="truncate">
                    {{ selectedAssigneesText }}
                  </span>
                  <svg class="fill-current h-4 w-4 text-slate-400 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </button>
                
                <!-- Dropdown panel -->
                <div v-if="isAssigneeDropdownOpen" class="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-2 space-y-1">
                  <label
                    v-for="user in taskStore.users"
                    :key="user.id"
                    class="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      :value="user.id"
                      v-model="selectedAssigneeIds"
                      class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <img :src="user.avatarUrl" class="w-5 h-5 rounded-full shrink-0" />
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-slate-705 truncate">{{ user.fullName }}</p>
                      <p class="text-[9px] text-slate-400 font-medium truncate">{{ user.role }}</p>
                    </div>
                  </label>
                </div>
                <!-- Transparent click-away overlay -->
                <div v-if="isAssigneeDropdownOpen" class="fixed inset-0 z-10 cursor-default" @click="isAssigneeDropdownOpen = false"></div>
              </div>
              <label
                for="quick_assignee"
                class="absolute left-3 top-0 -translate-y-1/2 text-[10px] font-bold text-indigo-500 px-1 bg-white z-10"
              >
                Người thực hiện
              </label>
            </div>
          </div>

          <!-- Priority, Due Date & Estimated Hours Grid -->
          <div class="grid grid-cols-3 gap-3">
            <!-- Priority -->
            <div class="relative w-full">
              <select
                v-model="priority"
                id="quick_priority"
                required
                class="peer w-full px-2 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold appearance-none cursor-pointer"
              >
                <option value="Low">Thấp</option>
                <option value="Medium">Trung bình</option>
                <option value="High">Cao</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg class="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
              <label
                for="quick_priority"
                class="absolute left-2.5 top-0 -translate-y-1/2 text-[9px] font-bold text-indigo-500 px-1 bg-white"
              >
                Độ ưu tiên *
              </label>
            </div>

            <!-- Due Date -->
            <div class="relative w-full">
              <input
                v-model="dueDate"
                id="quick_duedate"
                type="date"
                required
                class="peer w-full px-2 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
              />
              <label
                for="quick_duedate"
                class="absolute left-2.5 top-0 -translate-y-1/2 text-[9px] font-bold text-indigo-500 px-1 bg-white"
              >
                Ngày đến hạn *
              </label>
            </div>

            <!-- Estimated Hours -->
            <div class="relative w-full">
              <input
                v-model.number="estimatedHours"
                id="quick_hours"
                type="number"
                min="0"
                placeholder=" "
                class="peer w-full px-3 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-850 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold"
              />
              <label
                for="quick_hours"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                       peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
                       peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[9px] peer-focus:text-indigo-500 peer-focus:px-1 peer-focus:bg-white
                       peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[9px] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:bg-white"
              >
                Ước lượng (h)
              </label>
            </div>
          </div>

          <!-- Color Labels -->
          <div>
            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Nhãn công việc (chọn nhiều)</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="lbl in availableLabels"
                :key="lbl.name"
                class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer select-none transition-all hover:scale-102"
                :class="[
                  selectedLabels.includes(lbl.name)
                    ? `${lbl.bg} ${lbl.text} ${lbl.border} shadow-sm`
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                ]"
              >
                <input
                  type="checkbox"
                  :value="lbl.name"
                  v-model="selectedLabels"
                  class="hidden"
                />
                <span>{{ lbl.name }}</span>
              </label>
            </div>
          </div>

          <!-- Description -->
          <div class="relative w-full">
            <textarea
              v-model="description"
              id="quick_description"
              rows="3"
              placeholder=" "
              class="peer w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none font-semibold"
            ></textarea>
            <label
              for="quick_description"
              class="absolute left-3.5 top-5 text-xs font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                     peer-placeholder-shown:top-5 peer-placeholder-shown:text-xs 
                     peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:px-1.5 peer-focus:bg-white
                     peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-white"
            >
              Mô tả chi tiết công việc
            </label>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              @click="close"
              @mousedown="handleButtonClick"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all relative overflow-hidden cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              @mousedown="handleButtonClick"
              class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all relative overflow-hidden cursor-pointer"
            >
              Thêm mới
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, Plus, Check } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';

// Sóng nước ripple cho button
function handleButtonClick(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement;
  const circle = document.createElement('span');
  const diameter = Math.max(el.clientWidth, el.clientHeight);
  const radius = diameter / 2;

  const rect = el.getBoundingClientRect();
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-span-modal');

  const oldRipple = el.querySelector('.ripple-span-modal');
  if (oldRipple) {
    oldRipple.remove();
  }

  el.appendChild(circle);
}

const props = defineProps<{
  isOpen: boolean;
  preselectedProjectId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const taskStore = useTaskStore();

// Role checks
const isManager = computed(() => {
  const role = taskStore.currentUser.role;
  return role === 'Admin' || role === 'Project Manager';
});

// Form Fields
const title = ref('');
const description = ref('');
const projectId = ref('');
const priority = ref<'Low' | 'Medium' | 'High'>('Medium');
const dueDate = ref(new Date().toISOString().split('T')[0]);
const estimatedHours = ref(0);
const selectedLabels = ref<string[]>([]);

// Multiple assignees selection states
const isAssigneeDropdownOpen = ref(false);
const selectedAssigneeIds = ref<string[]>([]);

const selectedAssigneesText = computed(() => {
  if (selectedAssigneeIds.value.length === 0) return 'Chưa phân công';
  const selectedUsers = taskStore.users.filter(u => selectedAssigneeIds.value.includes(u.id));
  return selectedUsers.map(u => u.fullName).join(', ');
});

// Inline project creation states
const showNewProjectInput = ref(false);
const newProjectName = ref('');

function cancelNewProject() {
  showNewProjectInput.value = false;
  newProjectName.value = '';
}

async function handleCreateProject() {
  if (!newProjectName.value.trim()) return;
  try {
    const newProj = await taskStore.addProject({
      name: newProjectName.value.trim(),
      description: 'Dự án được tạo nhanh khi tạo công việc',
      status: 'Active',
      statusText: 'Đang tiến hành',
      color: 'indigo',
      members: [taskStore.currentUser]
    });
    if (newProj && newProj.id) {
      projectId.value = newProj.id;
    }
    cancelNewProject();
  } catch (error) {
    console.error('Failed to create project inline:', error);
  }
}

// Available labels with corresponding Tailwind colors
const availableLabels = [
  { name: 'Phân tích', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  { name: 'Thiết kế', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  { name: 'Lập trình', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { name: 'Kiểm thử', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { name: 'Họp hành', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  { name: 'Tài liệu', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' }
];

// Watcher to handle initial/preselected project IDs
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      title.value = '';
      description.value = '';
      projectId.value = props.preselectedProjectId || (taskStore.projects[0]?.id || '');
      selectedAssigneeIds.value = [taskStore.currentUser.id]; // Assign to self by default
      priority.value = 'Medium';
      dueDate.value = new Date().toISOString().split('T')[0];
      estimatedHours.value = 0;
      selectedLabels.value = [];
      showNewProjectInput.value = false;
      newProjectName.value = '';
      isAssigneeDropdownOpen.value = false;
    }
  }
);

function close() {
  emit('close');
}

function submitForm() {
  taskStore.addTask({
    title: title.value,
    description: description.value,
    projectId: projectId.value,
    assigneeId: selectedAssigneeIds.value.length > 0 ? selectedAssigneeIds.value.join(',') : undefined,
    priority: priority.value,
    dueDate: dueDate.value,
    status: 'ToDo', // New tasks default to ToDo
    creatorId: taskStore.currentUser.id,
    estimatedHours: estimatedHours.value || 0,
    labels: selectedLabels.value
  });
  close();
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

/* Modal ripple effects */
:deep(.ripple-span-modal) {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple-animation 500ms linear;
  background-color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 0;
}
:deep(button.bg-slate-100 .ripple-span-modal) {
  background-color: rgba(99, 102, 241, 0.15); /* Light indigo on cancel button */
}
</style>
