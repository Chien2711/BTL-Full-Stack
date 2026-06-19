<template>
  <div class="flex-1 flex flex-col items-center justify-center min-h-screen p-8 text-center space-y-6">
    <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 animate-pulse">
      <Wrench class="w-8 h-8" />
    </div>
    
    <div class="space-y-2 max-w-md">
      <h2 class="text-xl font-bold text-slate-800">Tính năng đang phát triển</h2>
      <p class="text-xs text-slate-400 leading-relaxed">
        Phân hệ này (thuộc các dịch vụ nền tảng Project & Member Service / Comment & Notify Service) đang được phát triển trong giai đoạn tiếp theo của dự án.
      </p>
    </div>

    <router-link
      to="/"
      class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all hover:-translate-y-0.5"
    >
      Quay lại Bảng điều khiển
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { Wrench } from '@lucide/vue';
</script>
