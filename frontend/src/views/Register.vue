<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskStore } from '../stores/taskStore';
import { User, Mail, Lock, Briefcase, ArrowRight, AlertCircle, Eye, EyeOff } from '@lucide/vue';

const taskStore = useTaskStore();
const router = useRouter();

const fullName = ref('');
const email = ref('');
const password = ref('');
const role = ref('Developer / Member');
const errorMsg = ref('');
const isLoading = ref(false);
const showPassword = ref(false);

const roles = [
  'Project Manager',
  'Developer / Member',
  'Viewer'
];

// Hàm giả lập hiệu ứng Ripple của Vuetify
function handleButtonClick(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-span');

  const oldRipple = button.querySelector('.ripple-span');
  if (oldRipple) {
    oldRipple.remove();
  }

  button.appendChild(circle);
}

async function handleRegister() {
  if (!fullName.value || !email.value || !password.value) {
    errorMsg.value = 'Vui lòng điền đầy đủ các thông tin bắt buộc';
    return;
  }
  
  errorMsg.value = '';
  isLoading.value = true;
  
  try {
    const success = await taskStore.registerAction({
      fullName: fullName.value,
      email: email.value,
      password: password.value,
      role: role.value
    });
    if (success) {
      router.push('/');
    }
  } catch (error: any) {
    console.error(error);
    errorMsg.value = error.response?.data?.error || 'Đăng ký tài khoản thất bại. Vui lòng kiểm tra lại thông tin.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center relative bg-slate-950 overflow-hidden px-4">
    <!-- Background visual decorations -->
    <div class="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/10 to-transparent blur-3xl -top-20 -left-20 animate-pulse duration-[8000ms]"></div>
    <div class="absolute w-[600px] h-[600px] rounded-full bg-purple-500/10 to-transparent blur-3xl -bottom-40 -right-20 animate-pulse duration-[10000ms]"></div>
    
    <!-- Neon glowing outline card -->
    <div class="w-full max-w-md bg-slate-900/70 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden">
      <!-- Glow border top -->
      <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mx-auto mb-4 hover:scale-105 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-7 h-7">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        </div>
        <h2 class="text-2xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text">Đăng ký tài khoản</h2>
        <p class="text-xs text-slate-400 mt-2 font-semibold tracking-wide uppercase">Tạo tài khoản làm việc mới</p>
      </div>

      <!-- Notification Banner -->
      <Transition name="expand">
        <div v-if="errorMsg" class="mb-6 bg-red-950/30 border border-red-900/50 rounded-2xl p-4 flex items-start space-x-3 text-red-300 text-xs">
          <AlertCircle class="w-4.5 h-4.5 mt-0.5 shrink-0 text-red-400" />
          <span class="leading-relaxed font-semibold">{{ errorMsg }}</span>
        </div>
      </Transition>

      <form @submit.prevent="handleRegister" class="space-y-6">
        <!-- Outlined Floating Input: Full Name -->
        <div class="relative w-full group">
          <input 
            v-model="fullName"
            id="fullName_input"
            type="text" 
            placeholder=" "
            required
            class="peer w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
          />
          <User class="w-4.5 h-4.5 text-slate-500 peer-focus:text-indigo-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
          
          <label 
            for="fullName_input"
            class="absolute left-10 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                   peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:left-10
                   peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-indigo-400 peer-focus:px-2 peer-focus:bg-slate-900 peer-focus:left-3.5
                   peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:bg-slate-900 peer-[:not(:placeholder-shown)]:left-3.5"
          >
            Họ và Tên
          </label>
        </div>

        <!-- Outlined Floating Input: Email -->
        <div class="relative w-full group">
          <input 
            v-model="email"
            id="email_input"
            type="email" 
            placeholder=" "
            required
            class="peer w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
          />
          <Mail class="w-4.5 h-4.5 text-slate-500 peer-focus:text-indigo-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
          
          <label 
            for="email_input"
            class="absolute left-10 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                   peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:left-10
                   peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-indigo-400 peer-focus:px-2 peer-focus:bg-slate-900 peer-focus:left-3.5
                   peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:bg-slate-900 peer-[:not(:placeholder-shown)]:left-3.5"
          >
            Địa chỉ Email
          </label>
        </div>

        <!-- Outlined Floating Input Selector: Role -->
        <div class="relative w-full group">
          <select 
            v-model="role"
            id="role_input"
            class="peer w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-3.5 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold appearance-none cursor-pointer"
          >
            <option v-for="r in roles" :key="r" :value="r" class="bg-slate-900 text-white font-semibold">{{ r }}</option>
          </select>
          <Briefcase class="w-4.5 h-4.5 text-slate-500 peer-focus:text-indigo-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 peer-focus:text-indigo-400 transition-colors">
            <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
          
          <label 
            for="role_input"
            class="absolute left-10 top-0 -translate-y-1/2 text-xs font-semibold text-indigo-400 px-2 bg-slate-900 pointer-events-none"
          >
            Vai trò công việc
          </label>
        </div>

        <!-- Outlined Floating Input: Password -->
        <div class="relative w-full group">
          <input 
            v-model="password"
            id="password_input"
            :type="showPassword ? 'text' : 'password'" 
            placeholder=" "
            required
            class="peer w-full bg-slate-900/50 border border-slate-700/80 rounded-xl py-3.5 pl-10 pr-10 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
          />
          <Lock class="w-4.5 h-4.5 text-slate-500 peer-focus:text-indigo-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button 
            type="button" 
            @click="showPassword = !showPassword"
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none z-20"
          >
            <Eye v-if="!showPassword" class="w-4.5 h-4.5" />
            <EyeOff v-else class="w-4.5 h-4.5" />
          </button>
          
          <label 
            for="password_input"
            class="absolute left-10 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                   peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:left-10
                   peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-indigo-400 peer-focus:px-2 peer-focus:bg-slate-900 peer-focus:left-3.5
                   peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:bg-slate-900 peer-[:not(:placeholder-shown)]:left-3.5"
          >
            Mật khẩu
          </label>
        </div>

        <!-- Ripple Trigger Button -->
        <button 
          type="submit" 
          :disabled="isLoading"
          @mousedown="handleButtonClick"
          class="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 px-4 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4 relative overflow-hidden"
        >
          <span v-if="isLoading" class="border-2 border-white/30 border-t-white w-4 h-4 rounded-full animate-spin"></span>
          <span v-else class="relative z-10">Đăng ký</span>
          <ArrowRight v-if="!isLoading" class="w-4 h-4 relative z-10" />
        </button>
      </form>

      <!-- Footer navigation -->
      <div class="mt-8 text-center text-xs text-slate-400 font-medium">
        Đã có tài khoản? 
        <router-link to="/login" class="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Đăng nhập</router-link>
      </div>

    </div>
  </div>
</template>
