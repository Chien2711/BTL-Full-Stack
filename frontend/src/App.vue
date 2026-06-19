<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTaskStore } from './stores/taskStore';
import Sidebar from './components/Sidebar.vue';
import { Radio, Terminal, X, ZapOff } from '@lucide/vue';

const taskStore = useTaskStore();
const isEventHubOpen = ref(false);

onMounted(() => {
  taskStore.init();
});
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
    <!-- Sidebar Navigation -->
    <Sidebar v-if="taskStore.currentUser && taskStore.currentUser.id" />

    <!-- Main Workspace -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <!-- Main Content Router View -->
      <main class="flex-1 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Global Floating Event Hub Console Trigger Button -->
    <button
      v-if="taskStore.currentUser && taskStore.currentUser.id"
      @click="isEventHubOpen = !isEventHubOpen"
      class="fixed bottom-6 right-6 z-40 w-14 h-14 bg-slate-950 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 group border border-slate-800"
      title="Mở Event Broker Console"
    >
      <Radio class="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 animate-pulse" />
      <span
        v-if="taskStore.events.length > 0"
        class="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9.5px] font-extrabold w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-slate-950"
      >
        {{ taskStore.events.length }}
      </span>
    </button>

    <!-- Event Hub Slide-out Console Panel -->
    <Transition name="slide">
      <div v-if="isEventHubOpen" class="fixed right-0 top-0 h-screen w-96 bg-slate-950 border-l border-slate-900 z-50 shadow-2xl flex flex-col text-slate-100">
        <!-- Panel Header -->
        <div class="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-900/30">
          <div class="flex items-center space-x-2">
            <Terminal class="w-5 h-5 text-indigo-400" />
            <h3 class="text-xs font-bold tracking-wider uppercase text-slate-200">Event Hub Broker</h3>
          </div>
          <button @click="isEventHubOpen = false" class="text-slate-400 hover:text-white p-1.5 hover:bg-slate-900 rounded-lg transition-colors">
            <X class="w-4.5 h-4.5" />
          </button>
        </div>
        
        <!-- Panel Body -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div v-if="taskStore.events.length > 0" class="space-y-3">
            <div
              v-for="evt in taskStore.events"
              :key="evt.id"
              class="bg-slate-900/40 rounded-xl p-3 border border-slate-900/80 space-y-2 hover:border-slate-800/80 transition-colors"
            >
              <div class="flex items-center justify-between text-[9px] font-bold">
                <span
                  class="px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wider"
                  :class="evt.eventType === 'task.status.changed' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/30'"
                >
                  {{ evt.eventType }}
                </span>
                <span class="text-slate-500 font-medium">{{ evt.timestamp }}</span>
              </div>
              <p class="text-xs text-slate-200 font-semibold leading-relaxed">{{ evt.details }}</p>
              <pre class="text-[9.5px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-900/60 overflow-x-auto text-emerald-400/90 leading-normal">{{ evt.payload }}</pre>
            </div>
          </div>
          
          <div v-else class="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-500">
            <ZapOff class="w-10 h-10 stroke-[1.5]" />
            <div class="space-y-1">
              <h4 class="text-xs font-bold text-slate-400">Chưa có sự kiện nào</h4>
              <p class="text-[10px] max-w-[200px] leading-relaxed mx-auto">Hãy thử kéo thả công việc trên bảng Kanban hoặc đổi người thực hiện để xem JSON payload.</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Global Floating Toast Container -->
    <div class="fixed top-6 right-6 z-[9999] flex flex-col space-y-3 pointer-events-none w-80">
      <TransitionGroup name="toast">
        <div
          v-for="toast in taskStore.toasts"
          :key="toast.id"
          class="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl flex items-start space-x-3 border border-slate-800/60 pointer-events-auto animate-toast-in"
        >
          <div class="mt-1 w-2 h-2 rounded-full shrink-0" :class="toast.type === 'task.status.changed' ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500 animate-ping'"></div>
          <span class="text-xs text-slate-200 leading-snug font-medium">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style>
/* Page transition effects */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Event Hub Slide animation */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Toast animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}
</style>
