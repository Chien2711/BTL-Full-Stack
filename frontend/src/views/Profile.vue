<template>
  <div class="min-h-screen bg-[#f6f8fb]">
    <header class="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-8 py-5 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-teal-600">NotifyDB / User Account</p>
          <h1 class="mt-1 text-2xl font-black text-slate-950">Hồ sơ cá nhân</h1>
          <p class="mt-1 text-sm text-slate-500">Quản lý thông tin tài khoản, token JWT và hồ sơ hiển thị khi bình luận.</p>
        </div>

        <div class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          <ShieldCheck class="h-4 w-4" />
          <span>JWT đang hoạt động</span>
        </div>
      </div>
    </header>

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-8 py-7">
      <section class="col-span-4 space-y-6">
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="h-28 bg-[linear-gradient(135deg,#0f766e,#2563eb_48%,#f97316)]"></div>
          <div class="-mt-12 px-6 pb-6">
            <img
              :src="avatarPreview"
              alt="Avatar"
              class="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg"
            />
            <div class="mt-4">
              <h2 class="text-xl font-black text-slate-950">{{ taskStore.currentUser.fullName }}</h2>
              <p class="text-sm font-semibold text-slate-500">{{ taskStore.currentUser.email }}</p>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase text-slate-400">Vai trò</p>
                <p class="mt-1 text-sm font-black text-slate-900">{{ taskStore.currentUser.role }}</p>
              </div>
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase text-slate-400">Trạng thái</p>
                <p class="mt-1 text-sm font-black text-emerald-600">Online</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <ClipboardList class="h-5 w-5 text-sky-600" />
            <p class="mt-4 text-2xl font-black text-slate-950">{{ assignedTasks.length }}</p>
            <p class="text-xs font-bold text-slate-500">Task được giao</p>
          </div>
          <div class="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <Bell class="h-5 w-5 text-rose-600" />
            <p class="mt-4 text-2xl font-black text-slate-950">{{ taskStore.unreadNotificationCount }}</p>
            <p class="text-xs font-bold text-slate-500">Thông báo chưa đọc</p>
          </div>
          <div class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <MessageSquare class="h-5 w-5 text-amber-600" />
            <p class="mt-4 text-2xl font-black text-slate-950">{{ visibleCommentsByMe }}</p>
            <p class="text-xs font-bold text-slate-500">Bình luận đã tải</p>
          </div>
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <CheckCircle2 class="h-5 w-5 text-emerald-600" />
            <p class="mt-4 text-2xl font-black text-slate-950">{{ completedAssigned }}</p>
            <p class="text-xs font-bold text-slate-500">Task hoàn thành</p>
          </div>
        </div>
      </section>

      <section class="col-span-8 space-y-6">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-black text-slate-950">Cập nhật hồ sơ</h2>
              <p class="mt-1 text-sm text-slate-500">Dữ liệu được lưu ở `NotifyDB.dbo.Users`; sau khi lưu hệ thống cấp lại JWT mới.</p>
            </div>
            <button
              type="button"
              @click="fillAvatarFromName"
              class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            >
              Tạo avatar theo tên
            </button>
          </div>

          <form class="mt-5 grid grid-cols-2 gap-4" @submit.prevent="saveProfile">
            <label class="space-y-2">
              <span class="text-xs font-black uppercase text-slate-500">Họ tên</span>
              <input
                v-model="profileForm.fullName"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                required
              />
            </label>

            <label class="space-y-2">
              <span class="text-xs font-black uppercase text-slate-500">Email đăng nhập</span>
              <input
                :value="taskStore.currentUser.email"
                class="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500"
                disabled
              />
            </label>

            <label class="col-span-2 space-y-2">
              <span class="text-xs font-black uppercase text-slate-500">Avatar URL</span>
              <input
                v-model="profileForm.avatarUrl"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </label>

            <div class="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs font-bold" :class="profileMessage.type === 'error' ? 'text-rose-600' : 'text-emerald-700'">
                {{ profileMessage.text }}
              </p>
              <button
                type="submit"
                :disabled="isSavingProfile"
                class="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700 disabled:bg-slate-300"
              >
                <Save class="h-4 w-4" />
                <span>{{ isSavingProfile ? 'Đang lưu...' : 'Lưu hồ sơ' }}</span>
              </button>
            </div>
          </form>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-base font-black text-slate-950">Đổi mật khẩu</h2>
            <p class="mt-1 text-sm text-slate-500">Endpoint nhóm 3: `PUT /api/users/me/password`.</p>

            <form class="mt-5 space-y-3" @submit.prevent="changePassword">
              <input
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="Mật khẩu hiện tại"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
                required
              />
              <input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="Mật khẩu mới"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
                required
              />
              <button class="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white transition hover:bg-blue-700">
                Cập nhật mật khẩu
              </button>
              <p class="min-h-4 text-xs font-bold" :class="passwordMessage.type === 'error' ? 'text-rose-600' : 'text-emerald-700'">
                {{ passwordMessage.text }}
              </p>
            </form>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-base font-black text-slate-950">Luồng nhóm 3</h2>
            <div class="mt-5 space-y-3">
              <router-link
                to="/notifications"
                class="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-rose-200 hover:bg-rose-50"
              >
                <span class="text-sm font-black text-slate-800">Xem Notification Service</span>
                <Bell class="h-5 w-5 text-rose-500" />
              </router-link>
              <router-link
                to="/kanban"
                class="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-amber-200 hover:bg-amber-50"
              >
                <span class="text-sm font-black text-slate-800">Mở Task Detail để bình luận</span>
                <MessageSquare class="h-5 w-5 text-amber-500" />
              </router-link>
              <router-link
                to="/settings"
                class="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-teal-200 hover:bg-teal-50"
              >
                <span class="text-sm font-black text-slate-800">Cài đặt thông báo</span>
                <Settings class="h-5 w-5 text-teal-500" />
              </router-link>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue';
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Save,
  Settings,
  ShieldCheck
} from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';

const taskStore = useTaskStore();
const isSavingProfile = ref(false);

const profileForm = reactive({
  fullName: '',
  avatarUrl: ''
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: ''
});

const profileMessage = reactive({ type: 'success', text: 'Sẵn sàng cập nhật hồ sơ tài khoản.' });
const passwordMessage = reactive({ type: 'success', text: '' });

watchEffect(() => {
  profileForm.fullName = taskStore.currentUser.fullName || '';
  profileForm.avatarUrl = taskStore.currentUser.avatarUrl || '';
});

const avatarPreview = computed(() => profileForm.avatarUrl || avatarFromName(profileForm.fullName || 'User'));

const assignedTasks = computed(() => {
  const id = taskStore.currentUser.id;
  return taskStore.tasks.filter(task => task.assigneeId?.split(',').map(item => item.trim()).includes(id));
});

const completedAssigned = computed(() => assignedTasks.value.filter(task => task.status === 'Done').length);

const visibleCommentsByMe = computed(() => {
  const id = taskStore.currentUser.id;
  return taskStore.tasks.reduce((total, task) => total + (task.comments || []).filter(comment => comment.userId === id).length, 0);
});

function avatarFromName(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f766e&color=fff`;
}

function fillAvatarFromName() {
  profileForm.avatarUrl = avatarFromName(profileForm.fullName || taskStore.currentUser.fullName || 'User');
}

async function saveProfile() {
  isSavingProfile.value = true;
  profileMessage.text = '';
  try {
    await taskStore.updateProfile({
      fullName: profileForm.fullName,
      avatarUrl: profileForm.avatarUrl
    });
    profileMessage.type = 'success';
    profileMessage.text = 'Đã lưu hồ sơ và làm mới JWT thành công.';
  } catch (error: any) {
    profileMessage.type = 'error';
    profileMessage.text = error.response?.data?.error || 'Không lưu được hồ sơ.';
  } finally {
    isSavingProfile.value = false;
  }
}

async function changePassword() {
  passwordMessage.text = '';
  try {
    await taskStore.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordMessage.type = 'success';
    passwordMessage.text = 'Đổi mật khẩu thành công.';
  } catch (error: any) {
    passwordMessage.type = 'error';
    passwordMessage.text = error.response?.data?.error || 'Không đổi được mật khẩu.';
  }
}
</script>
