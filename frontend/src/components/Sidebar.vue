<template>
  <aside class="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
    <!-- Logo Section -->
    <div class="p-6 flex items-center space-x-3 border-b border-slate-50">
      <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
        <!-- Modern Grid Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      </div>
      <span class="text-xl font-bold bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">ProjectHub</span>
    </div>

    <!-- Navigation Links -->
    <nav class="flex-1 px-4 py-6 space-y-1">
      <router-link
        v-for="item in filteredNavItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group"
        :class="[
          $route.path === item.path
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        ]"
      >
        <div class="flex items-center space-x-3">
          <component
            :is="item.icon"
            class="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
            :class="[$route.path === item.path ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600']"
          />
          <span>{{ item.name }}</span>
        </div>
        
        <!-- Alerts Badge -->
        <span
          v-if="item.badge"
          class="w-2 h-2 rounded-full bg-rose-500"
          :class="[$route.path === item.path ? 'ring-4 ring-indigo-100' : '']"
        ></span>
      </router-link>
    </nav>

    <!-- User Profile & Settings/Logout at Bottom -->
    <div class="p-4 border-t border-slate-50 space-y-2">
      <!-- User profile info -->
      <div class="flex items-center space-x-3 px-2 py-1">
        <img 
          :src="taskStore.currentUser.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=cbd5e1&color=fff'" 
          class="w-9 h-9 rounded-full object-cover border border-slate-100" 
          alt="Avatar"
        />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-slate-800 truncate">{{ taskStore.currentUser.fullName || 'Thành viên' }}</p>
          <p class="text-[10px] text-slate-500 truncate">{{ taskStore.currentUser.role || 'Member' }}</p>
        </div>
      </div>
      
      <!-- Cài đặt link -->
      <a
        href="#"
        class="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 group"
      >
        <Settings class="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:rotate-45 transition-transform duration-300" />
        <span>Cài đặt</span>
      </a>

      <!-- Đăng xuất button -->
      <button
        @click="logout"
        class="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all duration-200 group text-left cursor-pointer"
      >
        <LogOut class="w-5 h-5 text-rose-500 group-hover:translate-x-0.5 transition-transform duration-200" />
        <span>Đăng xuất</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  LayoutDashboard,
  FolderKanban,
  Kanban,
  Bell,
  User,
  Settings,
  LogOut,
  ShieldCheck
} from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const taskStore = useTaskStore();
const router = useRouter();

function logout() {
  taskStore.logoutAction();
  router.push('/login');
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  badge?: boolean;
}

const isManager = computed(() => {
  const role = taskStore.currentUser?.role;
  return role === 'Project Manager' || role === 'Admin';
});

const filteredNavItems = computed<NavItem[]>(() => {
  const items = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard
    },
    {
      name: 'Dự án',
      path: '/projects-stub',
      icon: FolderKanban
    },
    {
      name: 'Kanban',
      path: '/kanban',
      icon: Kanban
    },
    {
      name: 'Thông báo',
      path: '/alerts-stub',
      icon: Bell,
      badge: true
    },
    {
      name: 'Hồ sơ',
      path: '/profile-stub',
      icon: User
    }
  ];

  if (isManager.value) {
    items.splice(3, 0, {
      name: 'Quản trị',
      path: '/admin',
      icon: ShieldCheck
    });
  }

  return items;
});
</script>
