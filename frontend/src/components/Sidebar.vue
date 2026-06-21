<template>
  <aside class="sticky top-0 flex h-screen w-72 flex-col border-r border-slate-200 bg-white">
    <div class="border-b border-slate-100 p-6">
      <router-link to="/" class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#2563eb_55%,#f97316)] text-white shadow-lg shadow-blue-100">
          <Workflow class="h-6 w-6" />
        </div>
        <div>
          <p class="text-xl font-black tracking-tight text-slate-950">SprintFlow</p>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Project Kanban</p>
        </div>
      </router-link>
    </div>

    <nav class="flex-1 space-y-1 px-4 py-6">
      <router-link
        v-for="item in filteredNavItems"
        :key="item.path"
        :to="item.path"
        class="group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition"
        :class="isActive(item.path)
          ? 'bg-slate-950 text-white shadow-lg shadow-slate-200'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'"
      >
        <span class="flex items-center gap-3">
          <component
            :is="item.icon"
            class="h-5 w-5 transition-transform group-hover:scale-110"
            :class="isActive(item.path) ? item.activeIconClass : 'text-slate-400 group-hover:text-slate-700'"
          />
          <span>{{ item.name }}</span>
        </span>

        <span
          v-if="item.badgeCount && item.badgeCount > 0"
          class="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white"
        >
          {{ item.badgeCount > 99 ? '99+' : item.badgeCount }}
        </span>
      </router-link>
    </nav>

    <div class="space-y-2 border-t border-slate-100 p-4">
      <router-link
        to="/profile"
        class="flex items-center gap-3 rounded-2xl px-3 py-3 transition"
        :class="isActive('/profile') ? 'bg-teal-50' : 'hover:bg-slate-50'"
      >
        <img
          :src="taskStore.currentUser.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=0f766e&color=fff'"
          class="h-11 w-11 rounded-2xl border border-slate-100 object-cover"
          alt="Avatar"
        />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-black text-slate-900">{{ taskStore.currentUser.fullName || 'Thành viên' }}</span>
          <span class="block truncate text-[11px] font-bold text-slate-500">{{ taskStore.currentUser.role || 'Member' }}</span>
        </span>
      </router-link>

      <router-link
        to="/settings"
        class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition"
        :class="isActive('/settings') ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'"
      >
        <Settings class="h-5 w-5" :class="isActive('/settings') ? 'text-blue-600' : 'text-slate-400'" />
        <span>Cài đặt</span>
      </router-link>

      <button
        @click="logout"
        class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-rose-600 transition hover:bg-rose-50"
      >
        <LogOut class="h-5 w-5 text-rose-500" />
        <span>Đăng xuất</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  Bell,
  FolderKanban,
  Kanban,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  Workflow
} from '@lucide/vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTaskStore } from '../stores/taskStore';

const taskStore = useTaskStore();
const router = useRouter();
const route = useRoute();

interface NavItem {
  name: string;
  path: string;
  icon: any;
  activeIconClass: string;
  badgeCount?: number;
}

const isManager = computed(() => {
  const role = taskStore.currentUser?.role;
  return role === 'Project Manager' || role === 'Admin';
});

const filteredNavItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      name: 'Tổng quan',
      path: '/',
      icon: LayoutDashboard,
      activeIconClass: 'text-teal-300'
    },
    {
      name: 'Dự án',
      path: '/projects',
      icon: FolderKanban,
      activeIconClass: 'text-orange-300'
    },
    {
      name: 'Kanban',
      path: '/kanban',
      icon: Kanban,
      activeIconClass: 'text-blue-300'
    },
    {
      name: 'Thông báo',
      path: '/notifications',
      icon: Bell,
      activeIconClass: 'text-rose-300',
      badgeCount: taskStore.unreadNotificationCount
    },
    {
      name: 'Hồ sơ',
      path: '/profile',
      icon: User,
      activeIconClass: 'text-emerald-300'
    }
  ];

  if (isManager.value) {
    items.splice(3, 0, {
      name: 'Quản trị',
      path: '/admin',
      icon: ShieldCheck,
      activeIconClass: 'text-amber-300'
    });
  }

  return items;
});

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path);
}

function logout() {
  taskStore.logoutAction();
  router.push('/login');
}
</script>
