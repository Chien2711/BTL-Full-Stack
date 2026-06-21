<template>
  <div class="min-h-screen bg-[#f6f8fb]">
    <header class="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-8 py-5 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Project & Member Service</p>
          <h1 class="mt-1 text-2xl font-black text-slate-950">Không gian dự án</h1>
          <p class="mt-1 text-sm text-slate-500">Theo dõi ProjectDB, thành viên, tiến độ và các task liên quan.</p>
        </div>

        <button
          v-if="isManager"
          type="button"
          @click="isCreateOpen = true"
          class="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-orange-100 transition hover:bg-orange-700"
        >
          <FolderPlus class="h-4 w-4" />
          <span>Tạo dự án</span>
        </button>
      </div>
    </header>

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-8 py-7">
      <section class="col-span-12 grid grid-cols-4 gap-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Tổng dự án</p>
          <p class="mt-2 text-3xl font-black text-slate-950">{{ taskStore.projects.length }}</p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p class="text-[10px] font-black uppercase tracking-wider text-emerald-700">Đang chạy</p>
          <p class="mt-2 text-3xl font-black text-emerald-700">{{ activeProjects }}</p>
        </div>
        <div class="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p class="text-[10px] font-black uppercase tracking-wider text-blue-700">Task trong dự án</p>
          <p class="mt-2 text-3xl font-black text-blue-700">{{ scopedTasks.length }}</p>
        </div>
        <div class="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p class="text-[10px] font-black uppercase tracking-wider text-amber-700">Thành viên</p>
          <p class="mt-2 text-3xl font-black text-amber-700">{{ taskStore.users.length }}</p>
        </div>
      </section>

      <section class="col-span-5 space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white"
              placeholder="Tìm dự án theo tên, mô tả, trạng thái..."
            />
          </div>
        </div>

        <div class="space-y-3">
          <article
            v-for="project in filteredProjects"
            :key="project.id"
            @click="selectedProjectId = project.id"
            class="cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            :class="selectedProjectId === project.id ? 'border-orange-300 ring-4 ring-orange-100' : 'border-slate-200'"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl text-white" :class="projectTheme(project.color).solid">
                  <FolderKanban class="h-5 w-5" />
                </div>
                <div>
                  <h2 class="text-base font-black text-slate-950">{{ project.name }}</h2>
                  <p class="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">{{ project.description }}</p>
                </div>
              </div>
              <span class="rounded-full px-2.5 py-1 text-[10px] font-black" :class="statusTheme(project.status)">
                {{ project.statusText }}
              </span>
            </div>

            <div class="mt-5">
              <div class="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                <span>Tiến độ</span>
                <span>{{ progressFor(project.id) }}%</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full" :class="projectTheme(project.color).solid" :style="{ width: progressFor(project.id) + '%' }"></div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <div class="flex -space-x-2">
                <img
                  v-for="member in project.members.slice(0, 5)"
                  :key="member.id"
                  :src="member.avatarUrl"
                  class="h-8 w-8 rounded-full border-2 border-white object-cover"
                  :alt="member.fullName"
                />
                <span
                  v-if="project.members.length > 5"
                  class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-black text-slate-500"
                >
                  +{{ project.members.length - 5 }}
                </span>
              </div>
              <p class="text-xs font-bold text-slate-400">{{ tasksByProject(project.id).length }} task</p>
            </div>
          </article>
        </div>
      </section>

      <section class="col-span-7">
        <div v-if="selectedProject" class="space-y-6">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="h-28" :class="projectTheme(selectedProject.color).banner"></div>
            <div class="-mt-8 p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white text-white shadow-lg" :class="projectTheme(selectedProject.color).solid">
                    <FolderKanban class="h-8 w-8" />
                  </div>
                  <h2 class="mt-4 text-2xl font-black text-slate-950">{{ selectedProject.name }}</h2>
                  <p class="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">{{ selectedProject.description }}</p>
                </div>
                <router-link
                  to="/kanban"
                  class="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  Mở Kanban
                </router-link>
              </div>

              <div class="mt-6 grid grid-cols-3 gap-3">
                <div class="rounded-xl bg-slate-50 p-4">
                  <p class="text-[10px] font-black uppercase text-slate-400">Ngày tạo</p>
                  <p class="mt-1 text-sm font-black text-slate-900">{{ selectedProject.createdAt }}</p>
                </div>
                <div class="rounded-xl bg-slate-50 p-4">
                  <p class="text-[10px] font-black uppercase text-slate-400">Tiến độ</p>
                  <p class="mt-1 text-sm font-black text-slate-900">{{ progressFor(selectedProject.id) }}%</p>
                </div>
                <div class="rounded-xl bg-slate-50 p-4">
                  <p class="text-[10px] font-black uppercase text-slate-400">Task</p>
                  <p class="mt-1 text-sm font-black text-slate-900">{{ selectedProjectTasks.length }} công việc</p>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black text-slate-950">Thành viên dự án</h3>
                <button
                  v-if="isManager"
                  type="button"
                  @click="saveMembers"
                  class="rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white transition hover:bg-orange-700"
                >
                  Lưu thành viên
                </button>
              </div>

              <div class="mt-4 space-y-2">
                <label
                  v-for="user in taskStore.users"
                  :key="user.id"
                  class="flex items-center justify-between rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                >
                  <span class="flex min-w-0 items-center gap-3">
                    <img :src="user.avatarUrl" class="h-9 w-9 rounded-full object-cover" :alt="user.fullName" />
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-black text-slate-900">{{ user.fullName }}</span>
                      <span class="block truncate text-[10px] font-bold text-slate-400">{{ user.role }}</span>
                    </span>
                  </span>
                  <input v-model="selectedMemberIds" :value="user.id" type="checkbox" class="h-5 w-5 accent-orange-600" :disabled="!isManager" />
                </label>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 class="text-base font-black text-slate-950">Task trong dự án</h3>
              <div class="mt-4 space-y-3">
                <article
                  v-for="task in selectedProjectTasks"
                  :key="task.id"
                  class="rounded-xl border border-slate-200 p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-black text-slate-900">{{ task.title }}</p>
                      <p class="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{{ task.description }}</p>
                    </div>
                    <span class="rounded-full px-2 py-1 text-[10px] font-black" :class="taskStatusTheme(task.status)">
                      {{ task.status }}
                    </span>
                  </div>
                  <div class="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>Deadline: {{ task.dueDate }}</span>
                    <span>{{ assigneeNames(task.assigneeId) }}</span>
                  </div>
                </article>

                <div v-if="selectedProjectTasks.length === 0" class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                  <ClipboardList class="mx-auto h-8 w-8 text-slate-300" />
                  <p class="mt-2 text-sm font-black text-slate-600">Dự án này chưa có task.</p>
                  <router-link to="/kanban" class="mt-3 inline-block text-xs font-black text-orange-600 hover:text-orange-700">
                    Tạo task ở Kanban
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <FolderKanban class="mx-auto h-10 w-10 text-slate-300" />
          <p class="mt-3 text-base font-black text-slate-700">Chưa có dự án phù hợp.</p>
        </div>
      </section>
    </main>

    <div v-if="isCreateOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
      <form class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="createProject">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-950">Tạo dự án mới</h2>
            <p class="mt-1 text-sm text-slate-500">Gửi `POST /api/projects` qua Gateway vào Project Service.</p>
          </div>
          <button type="button" @click="isCreateOpen = false" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-4">
          <input v-model="projectForm.name" required class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" placeholder="Tên dự án" />
          <select v-model="projectForm.status" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white">
            <option value="New">Mới</option>
            <option value="Active">Đang thực hiện</option>
            <option value="OnHold">Tạm dừng</option>
            <option value="Completed">Hoàn thành</option>
          </select>
          <textarea v-model="projectForm.description" required rows="3" class="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" placeholder="Mô tả dự án"></textarea>
        </div>

        <div class="mt-5">
          <p class="text-xs font-black uppercase text-slate-500">Màu nhận diện</p>
          <div class="mt-2 flex gap-2">
            <button
              v-for="color in projectColors"
              :key="color"
              type="button"
              @click="projectForm.color = color"
              class="h-9 w-9 rounded-xl border-2 transition"
              :class="[projectTheme(color).solid, projectForm.color === color ? 'border-slate-950 scale-110' : 'border-white']"
              :title="color"
            ></button>
          </div>
        </div>

        <div class="mt-5">
          <p class="text-xs font-black uppercase text-slate-500">Thành viên ban đầu</p>
          <div class="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
            <label v-for="user in taskStore.users" :key="user.id" class="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <input v-model="projectForm.members" :value="user.id" type="checkbox" class="h-4 w-4 accent-orange-600" />
              <img :src="user.avatarUrl" class="h-8 w-8 rounded-full" :alt="user.fullName" />
              <span class="text-xs font-black text-slate-800">{{ user.fullName }}</span>
            </label>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" @click="isCreateOpen = false" class="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button class="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white hover:bg-orange-700">
            Tạo dự án
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ClipboardList, FolderKanban, FolderPlus, Search, X } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';
import type { Project, Task } from '../services/mockData';

const taskStore = useTaskStore();
const searchQuery = ref('');
const selectedProjectId = ref('');
const selectedMemberIds = ref<string[]>([]);
const isCreateOpen = ref(false);

const projectColors = ['orange', 'teal', 'blue', 'rose', 'violet', 'emerald'];

const projectForm = reactive({
  name: '',
  description: '',
  status: 'Active' as Project['status'],
  color: 'orange',
  members: [] as string[]
});

const isManager = computed(() => ['Admin', 'Project Manager'].includes(taskStore.currentUser.role));
const activeProjects = computed(() => taskStore.projects.filter(project => String(project.status).toLowerCase() === 'active').length);
const scopedTasks = computed(() => taskStore.tasks.filter(task => taskStore.projects.some(project => project.id === task.projectId)));

const filteredProjects = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return taskStore.projects;
  return taskStore.projects.filter(project =>
    [project.name, project.description, project.statusText].join(' ').toLowerCase().includes(q)
  );
});

const selectedProject = computed(() => taskStore.projects.find(project => project.id === selectedProjectId.value) || filteredProjects.value[0]);
const selectedProjectTasks = computed(() => selectedProject.value ? tasksByProject(selectedProject.value.id) : []);

watch(
  () => selectedProject.value?.id,
  () => {
    if (selectedProject.value) {
      selectedProjectId.value = selectedProject.value.id;
      selectedMemberIds.value = selectedProject.value.members.map(member => member.id);
    }
  },
  { immediate: true }
);

function tasksByProject(projectId: string) {
  return taskStore.tasks.filter(task => task.projectId === projectId);
}

function progressFor(projectId: string) {
  return taskStore.getProjectProgress(projectId);
}

function assigneeNames(assigneeId?: string) {
  if (!assigneeId) return 'Chưa phân công';
  return assigneeId
    .split(',')
    .map(id => taskStore.users.find(user => user.id === id.trim())?.fullName)
    .filter(Boolean)
    .join(', ') || 'Chưa phân công';
}

async function saveMembers() {
  if (!selectedProject.value) return;
  await taskStore.updateProjectMembers(selectedProject.value.id, selectedMemberIds.value);
}

async function createProject() {
  const members = taskStore.users.filter(user => projectForm.members.includes(user.id));
  const project = await taskStore.addProject({
    name: projectForm.name,
    description: projectForm.description,
    status: projectForm.status,
    statusText: statusText(projectForm.status),
    color: projectForm.color,
    members
  });
  selectedProjectId.value = project.id;
  Object.assign(projectForm, {
    name: '',
    description: '',
    status: 'Active',
    color: 'orange',
    members: []
  });
  isCreateOpen.value = false;
}

function statusText(status: Project['status']) {
  const labels: Record<string, string> = {
    New: 'Mới khởi tạo',
    Active: 'Đang thực hiện',
    OnHold: 'Tạm dừng',
    Completed: 'Hoàn thành',
    active: 'Đang thực hiện'
  };
  return labels[status] || status;
}

function projectTheme(color: string) {
  const themes: Record<string, { solid: string; banner: string }> = {
    orange: { solid: 'bg-orange-600', banner: 'bg-[linear-gradient(135deg,#ea580c,#f59e0b)]' },
    teal: { solid: 'bg-teal-600', banner: 'bg-[linear-gradient(135deg,#0f766e,#14b8a6)]' },
    blue: { solid: 'bg-blue-600', banner: 'bg-[linear-gradient(135deg,#2563eb,#38bdf8)]' },
    rose: { solid: 'bg-rose-600', banner: 'bg-[linear-gradient(135deg,#e11d48,#fb7185)]' },
    violet: { solid: 'bg-violet-600', banner: 'bg-[linear-gradient(135deg,#7c3aed,#a78bfa)]' },
    emerald: { solid: 'bg-emerald-600', banner: 'bg-[linear-gradient(135deg,#059669,#34d399)]' },
    indigo: { solid: 'bg-blue-600', banner: 'bg-[linear-gradient(135deg,#2563eb,#38bdf8)]' },
    amber: { solid: 'bg-orange-600', banner: 'bg-[linear-gradient(135deg,#ea580c,#f59e0b)]' }
  };
  return themes[color] || themes.orange;
}

function statusTheme(status: string) {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'OnHold') return 'bg-amber-100 text-amber-700';
  if (status === 'New') return 'bg-blue-100 text-blue-700';
  return 'bg-orange-100 text-orange-700';
}

function taskStatusTheme(status: Task['status']) {
  if (status === 'Done') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Review') return 'bg-amber-100 text-amber-700';
  if (status === 'InProgress') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}
</script>
