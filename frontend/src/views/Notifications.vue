<template>
  <div class="flex-1 min-h-screen bg-slate-50">
    <header class="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 class="text-lg font-bold text-slate-900">Thông báo</h1>
        <p class="text-xs text-slate-500 mt-1">
          {{ taskStore.unreadNotificationCount }} thông báo chưa đọc
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <button
          type="button"
          @click="refresh"
          class="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 text-xs font-bold flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
        <button
          type="button"
          :disabled="taskStore.unreadNotificationCount === 0"
          @click="markAllRead"
          class="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-bold flex items-center space-x-1.5 transition-colors"
        >
          <CheckCheck class="w-3.5 h-3.5" />
          <span>Đánh dấu tất cả</span>
        </button>
      </div>
    </header>

    <section class="px-8 py-5 border-b border-slate-100 bg-white/70">
      <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          @click="activeFilter = filter.value"
          class="px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
          :class="activeFilter === filter.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'"
        >
          {{ filter.label }}
        </button>
      </div>
    </section>

    <main class="px-8 py-6">
      <div v-if="filteredNotifications.length > 0" class="space-y-3 max-w-4xl">
        <article
          v-for="notification in filteredNotifications"
          :key="notification.id"
          class="bg-white border rounded-lg p-4 flex items-start gap-4 transition-colors"
          :class="notification.isRead ? 'border-slate-100' : 'border-indigo-200 bg-indigo-50/30'"
        >
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            :class="typeStyle(notification.type).iconBg"
          >
            <component :is="typeStyle(notification.type).icon" class="w-5 h-5" :class="typeStyle(notification.type).iconText" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-bold text-slate-900 truncate">{{ notification.title }}</h2>
                  <span v-if="!notification.isRead" class="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                </div>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">{{ notification.message }}</p>
              </div>
              <span class="text-[10px] text-slate-400 shrink-0">{{ formatDate(notification.createdAt) }}</span>
            </div>

            <div class="flex items-center justify-between mt-3">
              <div class="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                <span class="px-2 py-1 rounded-md bg-slate-100 font-bold">{{ notification.type }}</span>
                <span v-if="notification.actorName">Từ: {{ notification.actorName }}</span>
                <router-link
                  v-if="notification.taskId"
                  to="/kanban"
                  class="text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  {{ getTaskTitle(notification.taskId) }}
                </router-link>
              </div>

              <div class="flex items-center gap-1">
                <button
                  v-if="!notification.isRead"
                  type="button"
                  @click="taskStore.markNotificationRead(notification.id)"
                  class="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Đánh dấu đã đọc"
                >
                  <CheckCheck class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  @click="taskStore.deleteNotification(notification.id)"
                  class="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Xóa thông báo"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="max-w-4xl bg-white border border-dashed border-slate-200 rounded-lg py-16 text-center">
        <Inbox class="w-10 h-10 mx-auto text-slate-300" />
        <h2 class="text-sm font-bold text-slate-700 mt-3">Không có thông báo</h2>
        <p class="text-xs text-slate-400 mt-1">Các cập nhật về task và bình luận sẽ xuất hiện tại đây.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Bell, CheckCheck, ClipboardCheck, Inbox, MessageSquare, RefreshCw, Trash2, UserPlus } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';

const taskStore = useTaskStore();
const activeFilter = ref<'all' | 'unread' | 'read'>('all');

const filters = [
  { label: 'Tất cả', value: 'all' as const },
  { label: 'Chưa đọc', value: 'unread' as const },
  { label: 'Đã đọc', value: 'read' as const }
];

onMounted(() => {
  refresh();
});

const filteredNotifications = computed(() => {
  if (activeFilter.value === 'unread') {
    return taskStore.notifications.filter(n => !n.isRead);
  }
  if (activeFilter.value === 'read') {
    return taskStore.notifications.filter(n => n.isRead);
  }
  return taskStore.notifications;
});

function refresh() {
  taskStore.refreshNotifications();
}

async function markAllRead() {
  await taskStore.markAllNotificationsRead();
}

function getTaskTitle(taskId: string) {
  return taskStore.tasks.find(task => task.id === taskId)?.title || `Task ${taskId}`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  } catch {
    return value;
  }
}

function typeStyle(type: string) {
  if (type.includes('comment')) {
    return { icon: MessageSquare, iconBg: 'bg-sky-50', iconText: 'text-sky-600' };
  }
  if (type.includes('assigned')) {
    return { icon: UserPlus, iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' };
  }
  if (type.includes('status')) {
    return { icon: ClipboardCheck, iconBg: 'bg-amber-50', iconText: 'text-amber-600' };
  }
  return { icon: Bell, iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' };
}
</script>
