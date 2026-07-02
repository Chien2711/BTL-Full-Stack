<template>
  <Transition name="fade-slide">
    <div
      v-if="taskStore.activeTimerTaskId && activeTask"
      class="fixed bottom-6 right-6 z-[60] bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center space-x-4 border border-slate-700 w-80 backdrop-blur-md bg-opacity-90 cursor-pointer hover:bg-slate-800 transition-colors"
      @click="openTaskDetails"
    >
      <!-- Pulsing Icon -->
      <div class="relative flex items-center justify-center w-10 h-10 bg-indigo-500/20 rounded-xl shrink-0">
        <Play class="w-5 h-5 text-indigo-400" />
        <span class="absolute inset-0 rounded-xl ring-2 ring-indigo-500 animate-ping opacity-20"></span>
      </div>

      <!-- Task Info & Timer -->
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold text-slate-100 truncate">{{ activeTask.title }}</h4>
        <div class="flex items-center space-x-1.5 mt-0.5">
          <span class="text-sm font-mono font-bold text-emerald-400">
            {{ formattedTime }}
          </span>
          <span class="text-[10px] text-slate-400 font-medium">đang làm...</span>
        </div>
      </div>

      <!-- Quick Stop Button -->
      <button
        @click.stop="quickStop"
        class="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 flex items-center justify-center transition-all shrink-0"
        title="Dừng đếm giờ nhanh"
      >
        <Square class="w-4 h-4 fill-current" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Play, Square } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';

const emit = defineEmits(['open-task']);
const taskStore = useTaskStore();

const activeTask = computed(() => {
  if (!taskStore.activeTimerTaskId) return null;
  return taskStore.tasks.find(t => t.id === taskStore.activeTimerTaskId) || null;
});

const formattedTime = computed(() => {
  const totalSeconds = taskStore.activeTimerElapsedSeconds;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

function quickStop() {
  const result = taskStore.stopTimer();
  // We can open the task details so they can save the log
  if (result.taskId) {
    emit('open-task', result.taskId);
  }
}

function openTaskDetails() {
  if (taskStore.activeTimerTaskId) {
    emit('open-task', taskStore.activeTimerTaskId);
  }
}
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
