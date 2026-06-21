<template>
  <div class="min-h-screen bg-[#f7f9fc]">
    <header class="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-8 py-5 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">System Console</p>
          <h1 class="mt-1 text-2xl font-black text-slate-950">Cài đặt & kiểm thử dịch vụ</h1>
          <p class="mt-1 text-sm text-slate-500">Điểm kiểm tra nhanh cho JWT, Gateway, Notification Service và activity log.</p>
        </div>

        <button
          type="button"
          @click="checkGateway"
          class="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
        >
          <Radar class="h-4 w-4" />
          <span>Kiểm tra Gateway</span>
        </button>
      </div>
    </header>

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-8 py-7">
      <section class="col-span-4 space-y-6">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-base font-black text-slate-950">Trạng thái kết nối</h2>
              <p class="mt-1 text-sm text-slate-500">Frontend phải gọi qua Gateway `7000`.</p>
            </div>
            <span
              class="rounded-full px-3 py-1 text-[10px] font-black uppercase"
              :class="gatewayStatus.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
            >
              {{ gatewayStatus.label }}
            </span>
          </div>

          <div class="mt-5 space-y-3">
            <div class="rounded-xl bg-slate-50 p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">API Gateway</p>
              <p class="mt-1 break-all text-sm font-bold text-slate-900">http://localhost:7000</p>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-xl bg-teal-50 p-3">
                <p class="text-lg font-black text-teal-700">5001</p>
                <p class="text-[10px] font-bold text-slate-500">Project</p>
              </div>
              <div class="rounded-xl bg-blue-50 p-3">
                <p class="text-lg font-black text-blue-700">5002</p>
                <p class="text-[10px] font-bold text-slate-500">Task</p>
              </div>
              <div class="rounded-xl bg-rose-50 p-3">
                <p class="text-lg font-black text-rose-700">5003</p>
                <p class="text-[10px] font-bold text-slate-500">Notify</p>
              </div>
            </div>
            <p class="min-h-4 text-xs font-bold" :class="gatewayStatus.ok ? 'text-emerald-700' : 'text-amber-700'">
              {{ gatewayStatus.message }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-base font-black text-slate-950">Tùy chọn thông báo</h2>
          <p class="mt-1 text-sm text-slate-500">Lưu local preference để demo trải nghiệm người dùng.</p>

          <div class="mt-5 space-y-3">
            <label
              v-for="option in preferenceOptions"
              :key="option.key"
              class="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <span>
                <span class="block text-sm font-black text-slate-900">{{ option.title }}</span>
                <span class="block text-xs font-semibold text-slate-500">{{ option.description }}</span>
              </span>
              <input v-model="preferences[option.key]" type="checkbox" class="h-5 w-5 accent-blue-600" @change="savePreferences" />
            </label>
          </div>
        </div>
      </section>

      <section class="col-span-8 space-y-6">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-black text-slate-950">Kiểm thử Notification Service</h2>
              <p class="mt-1 text-sm text-slate-500">Tạo notification thật vào `NotifyDB.dbo.Notifications` cho chính tài khoản đang đăng nhập.</p>
            </div>
            <button
              type="button"
              @click="markAllRead"
              class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          <form class="mt-5 grid grid-cols-5 gap-3" @submit.prevent="createTestNotification">
            <input
              v-model="testNotification.title"
              class="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-rose-500 focus:bg-white"
              placeholder="Tiêu đề thông báo"
              required
            />
            <input
              v-model="testNotification.message"
              class="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-500 focus:bg-white"
              placeholder="Nội dung thông báo"
              required
            />
            <button class="rounded-xl bg-rose-600 px-4 py-3 text-xs font-black text-white transition hover:bg-rose-700">
              Tạo test
            </button>
          </form>

          <div class="mt-5 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-slate-50 p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">Tổng thông báo</p>
              <p class="mt-1 text-2xl font-black text-slate-950">{{ taskStore.notifications.length }}</p>
            </div>
            <div class="rounded-xl bg-rose-50 p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">Chưa đọc</p>
              <p class="mt-1 text-2xl font-black text-rose-600">{{ taskStore.unreadNotificationCount }}</p>
            </div>
            <div class="rounded-xl bg-emerald-50 p-4">
              <p class="text-[10px] font-black uppercase text-slate-400">Đã đọc</p>
              <p class="mt-1 text-2xl font-black text-emerald-600">{{ readCount }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-black text-slate-950">Activity log tự động</h2>
              <p class="mt-1 text-sm text-slate-500">Hiển thị log `comment.created`, `notification.created`, `user.profile.updated` từ Notify Service.</p>
            </div>
            <button
              type="button"
              @click="refreshLogs"
              class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700"
            >
              <RefreshCw class="h-4 w-4" />
              <span>Làm mới log</span>
            </button>
          </div>

          <div v-if="isManager" class="mt-5 space-y-3">
            <article
              v-for="log in taskStore.activityLogs"
              :key="log.id"
              class="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-black text-slate-900">{{ log.action }}</p>
                  <p class="mt-1 text-xs font-semibold text-slate-600">{{ log.message }}</p>
                </div>
                <span class="shrink-0 text-[10px] font-bold text-slate-400">{{ formatDate(log.createdAt) }}</span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-slate-500">
                <span class="rounded-md bg-white px-2 py-1">user: {{ log.userName || log.userId }}</span>
                <span class="rounded-md bg-white px-2 py-1">entity: {{ log.entityType || '-' }}</span>
                <span v-if="log.taskId" class="rounded-md bg-white px-2 py-1">task: {{ log.taskId }}</span>
              </div>
            </article>

            <div v-if="taskStore.activityLogs.length === 0" class="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <FileClock class="mx-auto h-8 w-8 text-slate-300" />
              <p class="mt-2 text-sm font-black text-slate-600">Chưa có log hoặc tài khoản không có quyền xem.</p>
            </div>
          </div>

          <div v-else class="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <LockKeyhole class="mx-auto h-8 w-8 text-slate-400" />
            <p class="mt-2 text-sm font-black text-slate-700">Activity log toàn hệ thống chỉ mở cho Admin/Project Manager.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import { FileClock, LockKeyhole, Radar, RefreshCw } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';

type PreferenceKey = 'toast' | 'sound' | 'dailyDigest';

const taskStore = useTaskStore();

const preferences = reactive<Record<PreferenceKey, boolean>>({
  toast: true,
  sound: false,
  dailyDigest: true
});

const preferenceOptions: { key: PreferenceKey; title: string; description: string }[] = [
  { key: 'toast', title: 'Toast khi có thông báo mới', description: 'Phù hợp khi đang mở Kanban hoặc Task Detail.' },
  { key: 'sound', title: 'Âm báo trong app', description: 'Demo tuỳ chọn trải nghiệm, không ảnh hưởng backend.' },
  { key: 'dailyDigest', title: 'Tổng hợp cuối ngày', description: 'Gợi ý mở rộng cho Notification Service.' }
];

const gatewayStatus = reactive({
  ok: false,
  label: 'Chưa kiểm tra',
  message: 'Bấm kiểm tra để xác nhận Gateway còn sống.'
});

const testNotification = reactive({
  title: 'Thông báo kiểm thử nhóm 3',
  message: 'Notification thật được tạo từ trang Cài đặt.'
});

const isManager = computed(() => ['Admin', 'Project Manager'].includes(taskStore.currentUser.role));
const readCount = computed(() => taskStore.notifications.filter(item => item.isRead).length);

onMounted(() => {
  loadPreferences();
  checkGateway();
  if (isManager.value) {
    refreshLogs();
  }
});

function loadPreferences() {
  const raw = localStorage.getItem('sprintflow_preferences');
  if (!raw) return;
  try {
    Object.assign(preferences, JSON.parse(raw));
  } catch {
    localStorage.removeItem('sprintflow_preferences');
  }
}

function savePreferences() {
  localStorage.setItem('sprintflow_preferences', JSON.stringify(preferences));
}

async function checkGateway() {
  try {
    const response = await fetch('http://localhost:7000/health');
    const data = await response.json();
    gatewayStatus.ok = response.ok;
    gatewayStatus.label = response.ok ? 'Gateway OK' : 'Gateway lỗi';
    gatewayStatus.message = `${data.service || 'Gateway'}: ${data.status || response.status}`;
  } catch (error: any) {
    gatewayStatus.ok = false;
    gatewayStatus.label = 'Không kết nối';
    gatewayStatus.message = error.message || 'Không gọi được Gateway.';
  }
}

async function createTestNotification() {
  await taskStore.createSelfNotification(testNotification.title, testNotification.message, 'manual.test');
  testNotification.title = 'Thông báo kiểm thử nhóm 3';
  testNotification.message = 'Notification thật được tạo từ trang Cài đặt.';
}

async function markAllRead() {
  await taskStore.markAllNotificationsRead();
}

async function refreshLogs() {
  await taskStore.refreshActivityLogs();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  });
}
</script>
