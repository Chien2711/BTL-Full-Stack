<template>
  <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative group overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <TrendingDown class="w-4 h-4" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-slate-800">Tiến độ Sprint (Burndown Chart)</h2>
          <p class="text-[10px] text-slate-400">Khối lượng công việc còn lại trong 7 ngày qua</p>
        </div>
      </div>
      <div class="flex items-center space-x-3 text-[10px] font-bold">
        <div class="flex items-center space-x-1.5">
          <div class="w-2 h-2 rounded-full bg-slate-300"></div>
          <span class="text-slate-500">Kế hoạch (Ideal)</span>
        </div>
        <div class="flex items-center space-x-1.5">
          <div class="w-2 h-2 rounded-full bg-indigo-600"></div>
          <span class="text-indigo-600">Thực tế (Actual)</span>
        </div>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="relative h-64 w-full">
      <Line
        v-if="chartData.labels && chartData.labels.length > 0"
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TrendingDown } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const taskStore = useTaskStore();

const chartData = computed(() => {
  const data = taskStore.getBurndownData;
  return {
    labels: data.labels,
    datasets: [
      {
        label: 'Thực tế (Actual Remaining)',
        data: data.actual,
        borderColor: '#4f46e5', // indigo-600
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3 // Smooth curves
      },
      {
        label: 'Kế hoạch (Ideal Remaining)',
        data: data.ideal,
        borderColor: '#cbd5e1', // slate-300
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0
      }
    ]
  };
});

const chartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)', // slate-900
      titleFont: { size: 11, family: 'Inter, sans-serif' },
      bodyFont: { size: 12, family: 'Inter, sans-serif', weight: 'bold' },
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: (context: any) => `${context.parsed.y} tasks còn lại`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#f1f5f9', // slate-100
        drawBorder: false
      },
      ticks: {
        color: '#94a3b8', // slate-400
        font: { size: 10, family: 'Inter, sans-serif', weight: 'bold' },
        stepSize: 1
      },
      border: { display: false }
    },
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        color: '#94a3b8',
        font: { size: 10, family: 'Inter, sans-serif', weight: 'bold' }
      },
      border: { display: false }
    }
  },
  interaction: {
    mode: 'index',
    intersect: false,
  }
};
</script>
