<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="close"></div>
      
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[85vh]">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-800">Thống kê khối lượng công việc</h2>
              <p class="text-xs text-slate-500">Xem phân bổ task và thời gian của từng thành viên</p>
            </div>
          </div>
          <button @click="close" class="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto">
          <div v-if="workloadStats.length === 0" class="text-center py-10 text-slate-400">
            <p>Chưa có dữ liệu công việc được phân công.</p>
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="stat in workloadStats" 
              :key="stat.id"
              class="bg-white border rounded-xl p-4 flex items-center space-x-4 transition-all"
              :class="stat.isOverloaded ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'"
            >
              <!-- Avatar -->
              <img :src="stat.avatarUrl" :alt="stat.fullName" class="w-12 h-12 rounded-full ring-2 ring-white shadow-sm" />
              
              <!-- Info -->
              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-bold text-slate-800 text-sm">{{ stat.fullName }}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                      <span class="font-semibold text-slate-700">{{ stat.activeTasksCount }}</span> task đang xử lý
                    </p>
                  </div>
                  <div class="text-right">
                    <span 
                      class="text-[10px] font-bold px-2 py-1 rounded-lg"
                      :class="stat.isOverloaded ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
                    >
                      {{ stat.totalEstimatedHours }}h dự kiến
                    </span>
                  </div>
                </div>
                
                <!-- Progress bar (Max ~40h) -->
                <div class="mt-3 relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-500"
                    :class="stat.isOverloaded ? 'bg-rose-500' : 'bg-indigo-500'"
                    :style="{ width: Math.min((stat.totalEstimatedHours / 40) * 100, 100) + '%' }"
                  ></div>
                </div>
                <p v-if="stat.isOverloaded" class="text-[10px] text-rose-600 font-medium mt-1.5 flex items-center">
                  <AlertCircle class="w-3 h-3 mr-1" /> Có dấu hiệu quá tải (Overloaded)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X, Users, AlertCircle } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';

const props = defineProps<{
  isOpen: boolean
}>();

const emit = defineEmits(['close']);
const taskStore = useTaskStore();

const workloadStats = computed(() => taskStore.getWorkloadStats);

function close() {
  emit('close');
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
