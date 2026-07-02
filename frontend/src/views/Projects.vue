<template>
  <div class="min-h-screen bg-[#f6f8fb]">
    <header class="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-8 py-5 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Project & Member Service</p>
          <h1 class="mt-1 text-2xl font-black text-slate-950">Không gian dự án</h1>
          <p class="mt-1 text-sm text-slate-500">Theo dõi ProjectDB, thành viên, tiến độ và các task liên quan.</p>
        </div>

        <button
          v-if="isManager"
          type="button"
          @click="isCreateOpen = true"
          class="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-orange-100 transition hover:bg-orange-700"
        >
          <FolderPlus class="h-4 w-4" />
          <span>Tạo dự án</span>
        </button>
      </div>
    </header>

    <main class="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-8 py-7">
      <section class="col-span-12 grid grid-cols-4 gap-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Tổng dự án</p>
          <p class="mt-2 text-3xl font-black text-slate-950">{{ taskStore.projects.length }}</p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p class="text-[10px] font-black uppercase tracking-wider text-emerald-700">Đang chạy</p>
          <p class="mt-2 text-3xl font-black text-emerald-700">{{ activeProjects }}</p>
        </div>
        <div class="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p class="text-[10px] font-black uppercase tracking-wider text-blue-700">Task trong dự án</p>
          <p class="mt-2 text-3xl font-black text-blue-700">{{ scopedTasks.length }}</p>
        </div>
        <div class="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <p class="text-[10px] font-black uppercase tracking-wider text-amber-700">Thành viên</p>
          <p class="mt-2 text-3xl font-black text-amber-700">{{ taskStore.users.length }}</p>
        </div>
      </section>

      <section class="col-span-5 space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-orange-500 focus:bg-white"
              placeholder="Tìm dự án theo tên, mô tả, trạng thái..."
            />
          </div>
        </div>

        <div class="space-y-3">
          <article
            v-for="project in filteredProjects"
            :key="project.id"
            @click="selectedProjectId = project.id"
            class="cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            :class="selectedProjectId === project.id ? 'border-orange-300 ring-4 ring-orange-100' : 'border-slate-200'"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl text-white" :class="projectTheme(project.color).solid">
                  <FolderKanban class="h-5 w-5" />
                </div>
                <div>
                  <h2 class="text-base font-black text-slate-950">{{ project.name }}</h2>
                  <p class="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">{{ project.description }}</p>
                </div>
              </div>
              <span class="rounded-full px-2.5 py-1 text-[10px] font-black" :class="statusTheme(project.status)">
                {{ project.statusText }}
              </span>
            </div>

            <div class="mt-5">
              <div class="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                <span>Tiến độ</span>
                <span>{{ progressFor(project.id) }}%</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full" :class="projectTheme(project.color).solid" :style="{ width: progressFor(project.id) + '%' }"></div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <div class="flex -space-x-2">
                <img
                  v-for="member in project.members.slice(0, 5)"
                  :key="member.id"
                  :src="member.avatarUrl"
                  class="h-8 w-8 rounded-full border-2 border-white object-cover"
                  :alt="member.fullName"
                />
                <span
                  v-if="project.members.length > 5"
                  class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-black text-slate-500"
                >
                  +{{ project.members.length - 5 }}
                </span>
              </div>
              <p class="text-xs font-bold text-slate-400">{{ tasksByProject(project.id).length }} task</p>
            </div>
          </article>
        </div>
      </section>

      <section class="col-span-7">
        <div v-if="selectedProject" class="space-y-6">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="h-28" :class="projectTheme(selectedProject.color).banner"></div>
            <div class="-mt-8 p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white text-white shadow-lg" :class="projectTheme(selectedProject.color).solid">
                    <FolderKanban class="h-8 w-8" />
                  </div>
                  <h2 class="mt-4 text-2xl font-black text-slate-950">{{ selectedProject.name }}</h2>
                  <p class="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">{{ selectedProject.description }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    v-if="isManager"
                    type="button"
                    @click="openEditModal"
                    class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    Sửa dự án
                  </button>
                  <router-link
                    to="/kanban"
                    class="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    Mở Kanban
                  </router-link>
                </div>
              </div>

              <div class="mt-6 grid grid-cols-3 gap-3">
                <div class="rounded-xl bg-slate-50 p-4">
                  <p class="text-[10px] font-black uppercase text-slate-400">Thời gian hoạt động</p>
                  <p class="mt-1 text-xs font-black text-slate-900 leading-tight">
                    Bắt đầu: {{ selectedProject.startDate || 'Chưa đặt' }}<br/>
                    Kết thúc: {{ selectedProject.endDate || 'Chưa đặt' }}
                  </p>
                </div>
                <div class="rounded-xl bg-slate-50 p-4">
                  <p class="text-[10px] font-black uppercase text-slate-400">Tiến độ</p>
                  <p class="mt-1 text-sm font-black text-slate-900">{{ progressFor(selectedProject.id) }}%</p>
                </div>
                <div class="rounded-xl bg-slate-50 p-4">
                  <p class="text-[10px] font-black uppercase text-slate-400">Task</p>
                  <p class="mt-1 text-sm font-black text-slate-900">{{ selectedProjectTasks.length }} công việc</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabs Navigation -->
          <div class="flex border-b border-slate-200 mb-6 bg-slate-50 p-1 rounded-xl">
            <button
              type="button"
              @click="activeTab = 'details'"
              class="flex-1 py-2 text-xs font-black transition-all rounded-lg"
              :class="activeTab === 'details' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-800'"
            >
              Thành viên & Công việc
            </button>
            <button
              type="button"
              @click="activeTab = 'attendance'"
              class="flex-1 py-2 text-xs font-black transition-all rounded-lg"
              :class="activeTab === 'attendance' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-800'"
            >
              Chấm công & Điểm danh
            </button>
            <button
              type="button"
              @click="activeTab = 'dashboard'"
              class="flex-1 py-2 text-xs font-black transition-all rounded-lg"
              :class="activeTab === 'dashboard' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-800'"
            >
              Báo cáo & Phân tích (Dashboard)
            </button>
          </div>

          <div v-if="activeTab === 'details'" class="grid grid-cols-2 gap-6">
            <div class="space-y-6">
              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-black text-slate-950">Thành viên dự án</h3>
                  <button
                    v-if="isManager"
                    type="button"
                    @click="saveMembers"
                    class="rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white transition hover:bg-orange-700"
                  >
                    Lưu thành viên
                  </button>
                </div>

                <div class="mt-4 space-y-2">
                  <div
                    v-for="user in taskStore.users"
                    :key="user.id"
                    class="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                  >
                    <!-- Dòng 1: Checkbox, Avatar, Tên và Vai trò hệ thống -->
                    <div class="flex items-center gap-3">
                      <input v-model="selectedMemberIds" :value="user.id" type="checkbox" class="h-5 w-5 accent-orange-600 shrink-0" :disabled="!isManager" />
                      <img :src="user.avatarUrl" class="h-9 w-9 rounded-full object-cover shrink-0" :alt="user.fullName" />
                      <div class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-black text-slate-900 leading-tight">{{ user.fullName }}</span>
                        <span class="block text-[10px] font-bold text-slate-400 leading-none mt-0.5">Hệ thống: {{ user.role }}</span>
                      </div>
                    </div>
                    
                    <!-- Dòng 2: Thiết lập vai trò & lương (chỉ hiển thị khi thành viên được chọn tham gia dự án) -->
                    <div v-if="selectedMemberIds.includes(user.id)" class="flex flex-wrap items-center gap-4 pl-8 pt-2 border-t border-slate-100">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-black text-slate-400 uppercase shrink-0">Vai trò:</span>
                        <select
                          v-model="memberRoles[user.id]"
                          :disabled="!isManager"
                          class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:bg-white cursor-pointer shrink-0"
                        >
                          <option value="Owner">Owner</option>
                          <option value="Manager">Manager</option>
                          <option value="Member">Member</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      </div>

                      <div class="flex items-center gap-1">
                        <span class="text-[10px] font-black text-slate-400 uppercase shrink-0">Lương:</span>
                        <input
                          v-model.number="memberHourlyRates[user.id]"
                          type="number"
                          min="0"
                          :disabled="!isManager"
                          class="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:bg-white text-center shrink-0"
                          placeholder="50"
                        />
                        <span class="text-[10px] font-black text-slate-400 shrink-0">$/h</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sprints của dự án -->
              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-black text-slate-950">Sprints của dự án</h3>
                  <button
                    v-if="isManager"
                    type="button"
                    @click="isCreateSprintOpen = true"
                    class="rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white transition hover:bg-orange-700"
                  >
                    Tạo Sprint
                  </button>
                </div>

                <div class="mt-4 space-y-3">
                  <article
                    v-for="sprint in taskStore.sprints"
                    :key="sprint.id"
                    class="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition"
                  >
                    <div>
                      <h4 class="text-sm font-black text-slate-900">{{ sprint.name }}</h4>
                      <p class="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">{{ sprint.goal || 'Không có mục tiêu' }}</p>
                    </div>
                    <div class="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-2">
                      <span>Bắt đầu: {{ sprint.startDate }}</span>
                      <span>Kết thúc: {{ sprint.endDate }}</span>
                    </div>
                  </article>

                  <div v-if="taskStore.sprints.length === 0" class="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                    <p class="text-xs font-bold text-slate-400">Dự án này chưa có Sprint nào.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 class="text-base font-black text-slate-950">Task trong dự án</h3>
              <div class="mt-4 space-y-3">
                <article
                  v-for="task in selectedProjectTasks"
                  :key="task.id"
                  class="rounded-xl border border-slate-200 p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-black text-slate-900">{{ task.title }}</p>
                      <p class="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{{ task.description }}</p>
                    </div>
                    <span class="rounded-full px-2 py-1 text-[10px] font-black" :class="taskStatusTheme(task.status)">
                      {{ task.status }}
                    </span>
                  </div>
                  <div class="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>Deadline: {{ task.dueDate }}</span>
                    <span>{{ assigneeNames(task.assigneeId) }}</span>
                  </div>
                </article>

                <div v-if="selectedProjectTasks.length === 0" class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                  <ClipboardList class="mx-auto h-8 w-8 text-slate-300" />
                  <p class="mt-2 text-sm font-black text-slate-600">Dự án này chưa có task.</p>
                  <router-link to="/kanban" class="mt-3 inline-block text-xs font-black text-orange-600 hover:text-orange-700">
                    Tạo task ở Kanban
                  </router-link>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'dashboard'" class="space-y-6">
            <!-- Thống kê Tài chính -->
            <div class="grid grid-cols-4 gap-4">
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Ngân sách dự toán</p>
                <p class="mt-2 text-2xl font-black text-slate-950">${{ selectedProject.budget?.toLocaleString() || '0' }}</p>
              </div>
              <div class="rounded-2xl border p-5" :class="isOverBudget ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'">
                <p class="text-[10px] font-black uppercase tracking-wider" :class="isOverBudget ? 'text-red-700' : 'text-slate-400'">Chi phí theo Chấm công (Payroll)</p>
                <p class="mt-2 text-2xl font-black" :class="isOverBudget ? 'text-red-700' : 'text-slate-950'">${{ attendanceCost.toLocaleString() }}</p>
              </div>
              <div class="rounded-2xl border p-5 border-slate-200 bg-white">
                <p class="text-[10px] font-black uppercase tracking-wider text-slate-400">Chi phí theo Task (Kanban)</p>
                <p class="mt-2 text-2xl font-black text-slate-950">${{ actualCost.toLocaleString() }}</p>
              </div>
              <div class="rounded-2xl border p-5 flex flex-col justify-center" :class="isOverBudget ? 'border-red-200 bg-red-100/50' : 'border-emerald-200 bg-emerald-50'">
                <p class="text-[10px] font-black uppercase tracking-wider" :class="isOverBudget ? 'text-red-700' : 'text-emerald-700'">Ngân sách còn lại (Payroll)</p>
                <p class="mt-2 text-2xl font-black" :class="isOverBudget ? 'text-red-700' : 'text-emerald-700'">${{ ((selectedProject.budget || 0) - attendanceCost).toLocaleString() }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <!-- Phân bổ khối lượng công việc thành viên (Workload) -->
              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 class="text-base font-black text-slate-950">Phân bổ công việc thành viên</h3>
                <p class="text-xs text-slate-500 mt-1">Khối lượng task đang giao cho từng người (Cảnh báo quá tải nếu > 3 task).</p>
                
                <div class="mt-5 space-y-4">
                  <div v-for="member in selectedProject.members" :key="member.id" class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs font-bold">
                      <span class="flex items-center gap-2">
                        <img :src="member.avatarUrl" class="h-6 w-6 rounded-full object-cover" />
                        <span class="text-slate-900 font-bold">{{ member.fullName }}</span>
                      </span>
                      <span class="flex items-center gap-2">
                        <span class="font-extrabold text-slate-700">{{ getMemberTasksCount(member.id) }} task</span>
                        <span 
                          class="rounded px-1.5 py-0.5 text-[9px] font-black uppercase"
                          :class="getMemberTasksCount(member.id) > 3 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'"
                        >
                          {{ getMemberTasksCount(member.id) > 3 ? 'Quá tải' : 'Bình thường' }}
                        </span>
                      </span>
                    </div>
                    <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        class="h-full rounded-full transition-all duration-500"
                        :class="getMemberTasksCount(member.id) > 3 ? 'bg-red-500' : 'bg-indigo-600'"
                        :style="{ width: Math.min((getMemberTasksCount(member.id) / 5) * 100, 100) + '%' }"
                      ></div>
                    </div>
                  </div>

                  <div v-if="selectedProject.members.length === 0" class="text-center py-8 text-xs font-bold text-slate-400">
                    Dự án này chưa có thành viên.
                  </div>
                </div>
              </div>

              <!-- Thống kê đóng góp chi phí (Task-based) -->
              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 class="text-base font-black text-slate-950">Chi phí dự án theo Task</h3>
                <p class="text-xs text-slate-500 mt-1">Chi phí nhân sự dựa trên số giờ đã Log vào các Task (Logged Hours).</p>

                <div class="mt-4 overflow-x-auto">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="border-b border-slate-100 text-slate-400 font-black uppercase text-[10px]">
                        <th class="py-2">Thành viên</th>
                        <th class="py-2 text-right">Lương/giờ</th>
                        <th class="py-2 text-right">Giờ Log</th>
                        <th class="py-2 text-right">Chi phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="member in selectedProject.members" :key="member.id" class="border-b border-slate-50 font-semibold text-slate-700">
                        <td class="py-3 flex items-center gap-2">
                          <img :src="member.avatarUrl" class="h-6 w-6 rounded-full object-cover" />
                          <span class="truncate max-w-[120px] font-bold text-slate-900">{{ member.fullName }}</span>
                        </td>
                        <td class="py-3 text-right font-bold">${{ member.hourlyRate || 0 }}/h</td>
                        <td class="py-3 text-right font-black text-slate-900">{{ getMemberLoggedHours(member.id) }}h</td>
                        <td class="py-3 text-right font-black text-indigo-600">${{ (getMemberLoggedHours(member.id) * (member.hourlyRate || 0)).toLocaleString() }}</td>
                      </tr>
                      <tr v-if="selectedProject.members.length === 0">
                        <td colspan="4" class="text-center py-6 text-slate-400 font-bold">Chưa có thành viên nào.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Bảng tổng hợp lương theo Chấm công (Payroll Summary) -->
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 class="text-base font-black text-slate-950">Bảng tổng hợp lương tích lũy theo Chấm công</h3>
              <p class="text-xs text-slate-500 mt-1">Tổng hợp số ngày đi làm, nghỉ phép, tổng số giờ tích lũy (hành chính + OT) và tổng số tiền công thực tế của từng thành viên dựa trên lịch sử điểm danh đã lưu.</p>

              <div class="mt-4 overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                      <th class="py-3 px-2">Thành viên</th>
                      <th class="py-3 px-2 text-center">Số ngày đi làm</th>
                      <th class="py-3 px-2 text-center">Số ngày nghỉ</th>
                      <th class="py-3 px-2 text-right">Đơn giá lương</th>
                      <th class="py-3 px-2 text-right">Tổng giờ làm</th>
                      <th class="py-3 px-2 text-right">Tổng tiền công nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="member in selectedProject.members" 
                      :key="member.id" 
                      class="border-b border-slate-100 font-semibold text-slate-700 hover:bg-slate-50/55 transition"
                    >
                      <td class="py-4 px-2 flex items-center gap-3">
                        <img :src="member.avatarUrl" class="h-8 w-8 rounded-full object-cover shrink-0" />
                        <div>
                          <span class="block font-bold text-slate-900">{{ member.fullName }}</span>
                          <span class="block text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">{{ member.role }}</span>
                        </div>
                      </td>
                      <td class="py-4 px-2 text-center font-bold text-emerald-600">
                        {{ getMemberAttendanceDays(member.id, 'Present') }} ngày
                      </td>
                      <td class="py-4 px-2 text-center font-bold text-red-500">
                        {{ getMemberAttendanceDays(member.id, 'Absent') }} ngày
                      </td>
                      <td class="py-4 px-2 text-right font-bold text-slate-900">
                        ${{ member.hourlyRate || 30 }}/h
                      </td>
                      <td class="py-4 px-2 text-right font-black text-slate-900">
                        {{ getMemberAttendanceHours(member.id) }} giờ
                      </td>
                      <td class="py-4 px-2 text-right font-black text-indigo-600 text-sm">
                        ${{ getMemberAttendancePay(member.id, member.hourlyRate || 30).toLocaleString() }}
                      </td>
                    </tr>
                    <tr v-if="selectedProject.members.length === 0">
                      <td colspan="6" class="text-center py-8 text-slate-400 font-bold text-sm">
                        Dự án chưa có thành viên.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'attendance'" class="space-y-6">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 class="text-base font-black text-slate-950">Bảng Chấm Công Hàng Ngày</h3>
                  <p class="text-xs text-slate-500 mt-1">
                    Ngày hoạt động dự án: <span class="font-extrabold text-orange-600">{{ selectedProject.startDate || 'Chưa đặt' }}</span>
                    <span v-if="selectedProject.endDate"> đến <span class="font-extrabold text-orange-600">{{ selectedProject.endDate }}</span></span>.
                    Mặc định đi làm là 8 giờ.
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-slate-500">Chọn ngày:</span>
                    <input 
                      v-model="attendanceDate" 
                      type="date" 
                      :min="projectStartDate"
                      :max="todayStr"
                      class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-orange-500 focus:bg-white"
                      @change="handleDateChange"
                    />
                  </div>
                  <button
                    v-if="isManager"
                    type="button"
                    @click="saveAttendanceData"
                    class="rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-700"
                  >
                    Lưu chấm công
                  </button>
                </div>
              </div>

              <div class="mt-6 overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                      <th class="py-3 px-2">Thành viên</th>
                      <th class="py-3 px-2">Lương/giờ</th>
                      <th class="py-3 px-2 text-center">Trạng thái</th>
                      <th class="py-3 px-2 text-center">Tăng ca (OT)</th>
                      <th class="py-3 px-2">Ghi chú</th>
                      <th class="py-3 px-2 text-right">Tổng giờ</th>
                      <th class="py-3 px-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="member in selectedProject.members" 
                      :key="member.id" 
                      class="border-b border-slate-100 font-semibold text-slate-700 hover:bg-slate-50/55 transition"
                    >
                      <td class="py-4 px-2 flex items-center gap-3">
                        <img :src="member.avatarUrl" class="h-8 w-8 rounded-full object-cover shrink-0" />
                        <div class="min-w-0">
                          <span class="block truncate font-bold text-slate-900">{{ member.fullName }}</span>
                          <span class="block text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">{{ member.role }}</span>
                        </div>
                      </td>

                      <td class="py-4 px-2 font-bold text-slate-900">
                        ${{ member.hourlyRate || 30 }}/h
                      </td>

                      <td class="py-4 px-2 text-center">
                        <div class="inline-flex rounded-lg bg-slate-100 p-0.5">
                          <button
                            type="button"
                            @click="setMemberStatus(member.id, 'Present')"
                            :disabled="!isManager"
                            class="rounded-md px-2.5 py-1 text-[10px] font-black transition-all"
                            :class="getMemberStatus(member.id) === 'Present' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'"
                          >
                            Đi làm
                          </button>
                          <button
                            type="button"
                            @click="setMemberStatus(member.id, 'Absent')"
                            :disabled="!isManager"
                            class="rounded-md px-2.5 py-1 text-[10px] font-black transition-all"
                            :class="getMemberStatus(member.id) === 'Absent' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'"
                          >
                            Nghỉ
                          </button>
                        </div>
                      </td>

                      <td class="py-4 px-2 text-center">
                        <div v-if="attendanceForm[member.id]" class="inline-flex items-center gap-1">
                          <input
                            v-model.number="attendanceForm[member.id].overtimeHours"
                            type="number"
                            min="0"
                            max="16"
                            :disabled="!isManager"
                            class="w-12 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center font-bold text-slate-700 outline-none focus:bg-white"
                          />
                          <span class="text-[10px] text-slate-400 font-bold">giờ</span>
                        </div>
                      </td>

                      <td class="py-4 px-2">
                        <input
                          v-if="attendanceForm[member.id]"
                          v-model="attendanceForm[member.id].notes"
                          type="text"
                          :disabled="!isManager"
                          class="w-full min-w-[120px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500 focus:bg-white"
                          placeholder="Lý do nghỉ, ghi chú công việc..."
                        />
                      </td>

                      <td class="py-4 px-2 text-right font-black text-slate-900">
                        {{ calculateTotalHours(member.id) }}h
                      </td>

                      <td class="py-4 px-2 text-right font-black text-indigo-600">
                        ${{ calculateTotalPay(member.id, member.hourlyRate || 30).toLocaleString() }}
                      </td>
                    </tr>

                    <tr v-if="selectedProject.members.length === 0">
                      <td colspan="7" class="text-center py-8 text-slate-400 font-bold text-sm">
                        Dự án này chưa có thành viên. Hãy thêm thành viên trong tab "Thành viên & Công việc" trước.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Summary Section -->
              <div v-if="selectedProject.members.length > 0" class="mt-6 flex flex-wrap items-center justify-between border-t border-slate-200 pt-5 gap-4">
                <div class="flex items-center gap-5 text-xs font-bold text-slate-600">
                  <div>
                    Số người đi làm: <span class="font-extrabold text-emerald-600">{{ dailyPresentCount }}</span> / {{ selectedProject.members.length }}
                  </div>
                  <div class="h-4 w-px bg-slate-200"></div>
                  <div>
                    Số người nghỉ: <span class="font-extrabold text-red-600">{{ dailyAbsentCount }}</span>
                  </div>
                  <div class="h-4 w-px bg-slate-200"></div>
                  <div>
                    Tổng số giờ làm: <span class="font-extrabold text-slate-900">{{ dailyTotalHours }} giờ</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-xs font-black uppercase text-slate-400">Tổng tiền công ngày:</span>
                  <p class="text-xl font-black text-indigo-600">${{ dailyTotalPay.toLocaleString() }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
          <FolderKanban class="mx-auto h-10 w-10 text-slate-300" />
          <p class="mt-3 text-base font-black text-slate-700">Chưa có dự án phù hợp.</p>
        </div>
      </section>
    </main>

    <div v-if="isCreateOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
      <form class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="createProject">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-950">Tạo dự án mới</h2>
            <p class="mt-1 text-sm text-slate-500">Gửi `POST /api/projects` qua Gateway vào Project Service.</p>
          </div>
          <button type="button" @click="isCreateOpen = false" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-4">
          <input v-model="projectForm.name" required class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" placeholder="Tên dự án" />
          <select v-model="projectForm.status" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white">
            <option value="New">Mới</option>
            <option value="Active">Đang thực hiện</option>
            <option value="OnHold">Tạm dừng</option>
            <option value="Completed">Hoàn thành</option>
          </select>
          <div class="col-span-2 text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngân sách dự án ($)</label>
            <input v-model.number="projectForm.budget" type="number" min="0" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" placeholder="Ví dụ: 5000" />
          </div>
          <textarea v-model="projectForm.description" required rows="3" class="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" placeholder="Mô tả dự án"></textarea>
          <div class="text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngày bắt đầu</label>
            <input v-model="projectForm.startDate" type="date" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
          </div>
          <div class="text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngày kết thúc</label>
            <input v-model="projectForm.endDate" type="date" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
          </div>
        </div>

        <div class="mt-5">
          <p class="text-xs font-black uppercase text-slate-500">Màu nhận diện</p>
          <div class="mt-2 flex gap-2">
            <button
              v-for="color in projectColors"
              :key="color"
              type="button"
              @click="projectForm.color = color"
              class="h-9 w-9 rounded-xl border-2 transition"
              :class="[projectTheme(color).solid, projectForm.color === color ? 'border-slate-950 scale-110' : 'border-white']"
              :title="color"
            ></button>
          </div>
        </div>

        <div class="mt-5">
          <p class="text-xs font-black uppercase text-slate-500">Thành viên ban đầu</p>
          <div class="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
            <label v-for="user in taskStore.users" :key="user.id" class="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <input v-model="projectForm.members" :value="user.id" type="checkbox" class="h-4 w-4 accent-orange-600" />
              <img :src="user.avatarUrl" class="h-8 w-8 rounded-full" :alt="user.fullName" />
              <span class="text-xs font-black text-slate-800">{{ user.fullName }}</span>
            </label>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" @click="isCreateOpen = false" class="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button class="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white hover:bg-orange-700">
            Tạo dự án
          </button>
        </div>
      </form>
    </div>

    <!-- Dialog Chỉnh sửa Dự án -->
    <div v-if="isEditOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
      <form class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="updateProject">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-950">Chỉnh sửa dự án</h2>
            <p class="mt-1 text-sm text-slate-500">Cập nhật thông tin chi tiết và ngân sách dự án.</p>
          </div>
          <button type="button" @click="isEditOpen = false" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-4">
          <div class="text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Tên dự án</label>
            <input v-model="editForm.name" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
          </div>
          <div class="text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Trạng thái</label>
            <select v-model="editForm.status" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white">
              <option value="New">Mới</option>
              <option value="Active">Đang thực hiện</option>
              <option value="OnHold">Tạm dừng</option>
              <option value="Completed">Hoàn thành</option>
            </select>
          </div>
          <div class="col-span-2 text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngân sách dự án ($)</label>
            <input v-model.number="editForm.budget" type="number" min="0" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
          </div>
          <div class="col-span-2 text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Mô tả dự án</label>
            <textarea v-model="editForm.description" required rows="3" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white"></textarea>
          </div>
          <div class="text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngày bắt đầu</label>
            <input v-model="editForm.startDate" type="date" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
          </div>
          <div class="text-left">
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngày kết thúc</label>
            <input v-model="editForm.endDate" type="date" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
          </div>
        </div>

        <div class="mt-5 text-left">
          <p class="text-xs font-black uppercase text-slate-500">Màu nhận diện</p>
          <div class="mt-2 flex gap-2">
            <button
              v-for="color in projectColors"
              :key="color"
              type="button"
              @click="editForm.color = color"
              class="h-9 w-9 rounded-xl border-2 transition"
              :class="[projectTheme(color).solid, editForm.color === color ? 'border-slate-950 scale-110' : 'border-white']"
              :title="color"
            ></button>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" @click="isEditOpen = false" class="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button class="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white hover:bg-orange-700">
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>

    <!-- Dialog Tạo Sprint -->
    <div v-if="isCreateSprintOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
      <form class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" @submit.prevent="createSprint">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-950">Tạo Sprint mới</h2>
            <p class="mt-1 text-sm text-slate-500">Thêm Sprint với mục tiêu và thời gian chạy cho dự án.</p>
          </div>
          <button type="button" @click="isCreateSprintOpen = false" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Tên Sprint</label>
            <input v-model="sprintForm.name" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" placeholder="Ví dụ: Sprint 1" />
          </div>
          <div>
            <label class="block text-xs font-black uppercase text-slate-500 mb-1">Mục tiêu Sprint</label>
            <textarea v-model="sprintForm.goal" rows="3" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white" placeholder="Mục tiêu của Sprint này..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngày bắt đầu</label>
              <input v-model="sprintForm.startDate" type="date" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Ngày kết thúc</label>
              <input v-model="sprintForm.endDate" type="date" required class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white" />
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" @click="isCreateSprintOpen = false" class="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button class="rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white hover:bg-orange-700">
            Tạo Sprint
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ClipboardList, FolderKanban, FolderPlus, Search, X } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';
import type { Project, Task, AttendanceRecord } from '../services/mockData';

const taskStore = useTaskStore();
const searchQuery = ref('');
const selectedProjectId = ref('');
const selectedMemberIds = ref<string[]>([]);
const isCreateOpen = ref(false);

const memberRoles = reactive<Record<string, string>>({});
const memberHourlyRates = reactive<Record<string, number>>({});
const activeTab = ref('details');

// Chấm công & Điểm danh states
const attendanceDate = ref(new Date().toISOString().split('T')[0]);
const attendanceForm = ref<Record<string, { status: 'Present' | 'Absent'; overtimeHours: number; notes: string }>>({});
const projectAttendanceList = ref<AttendanceRecord[]>([]);

const projectStartDate = computed(() => {
  if (!selectedProject.value) return '';
  return selectedProject.value.startDate || selectedProject.value.createdAt?.substring(0, 10) || '';
});

const todayStr = computed(() => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const projectColors = ['orange', 'teal', 'blue', 'rose', 'violet', 'emerald'];

const projectForm = reactive({
  name: '',
  description: '',
  status: 'Active' as Project['status'],
  color: 'orange',
  members: [] as string[],
  budget: 1000,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
});

const isCreateSprintOpen = ref(false);
const sprintForm = reactive({
  name: '',
  goal: '',
  startDate: '',
  endDate: ''
});

async function createSprint() {
  if (!selectedProject.value) return;
  await taskStore.addSprint(selectedProject.value.id, {
    name: sprintForm.name,
    goal: sprintForm.goal,
    startDate: sprintForm.startDate,
    endDate: sprintForm.endDate
  });
  Object.assign(sprintForm, {
    name: '',
    goal: '',
    startDate: '',
    endDate: ''
  });
  isCreateSprintOpen.value = false;
}

// Chỉnh sửa dự án states & methods
const isEditOpen = ref(false);
const editForm = reactive({
  name: '',
  description: '',
  status: 'Active' as Project['status'],
  color: 'orange',
  budget: 0,
  startDate: '',
  endDate: ''
});

function openEditModal() {
  if (!selectedProject.value) return;
  Object.assign(editForm, {
    name: selectedProject.value.name,
    description: selectedProject.value.description,
    status: selectedProject.value.status,
    color: selectedProject.value.color || 'orange',
    budget: selectedProject.value.budget || 0,
    startDate: selectedProject.value.startDate || selectedProject.value.createdAt?.substring(0, 10) || new Date().toISOString().split('T')[0],
    endDate: selectedProject.value.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  isEditOpen.value = true;
}

async function updateProject() {
  if (!selectedProject.value) return;
  await taskStore.updateProject(selectedProject.value.id, {
    name: editForm.name,
    description: editForm.description,
    status: editForm.status,
    statusText: statusText(editForm.status),
    color: editForm.color,
    budget: editForm.budget,
    startDate: editForm.startDate,
    endDate: editForm.endDate
  });
  isEditOpen.value = false;
  alert('Cập nhật thông tin dự án thành công!');
}

const isManager = computed(() => ['Admin', 'Project Manager'].includes(taskStore.currentUser.role));
const activeProjects = computed(() => taskStore.projects.filter(project => String(project.status).toLowerCase() === 'active').length);
const scopedTasks = computed(() => taskStore.tasks.filter(task => taskStore.projects.some(project => project.id === task.projectId)));

const filteredProjects = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return taskStore.projects;
  return taskStore.projects.filter(project =>
    [project.name, project.description, project.statusText].join(' ').toLowerCase().includes(q)
  );
});

const selectedProject = computed(() => taskStore.projects.find(project => project.id === selectedProjectId.value) || filteredProjects.value[0]);
const selectedProjectTasks = computed(() => selectedProject.value ? tasksByProject(selectedProject.value.id) : []);

watch(
  [() => selectedProject.value?.id, () => taskStore.users.length],
  async () => {
    if (selectedProject.value) {
      selectedProjectId.value = selectedProject.value.id;
      selectedMemberIds.value = selectedProject.value.members.map(member => member.id);
      
      // Khởi tạo vai trò và đơn giá giờ làm của từng thành viên trong dự án
      taskStore.users.forEach(user => {
        const projMember = selectedProject.value!.members.find(m => m.id === user.id);
        memberRoles[user.id] = projMember?.role || 'Member';
        memberHourlyRates[user.id] = projMember?.hourlyRate || user.hourlyRate || 30;
      });

      await taskStore.refreshProjectSprints(selectedProject.value.id);
      await refreshProjectAttendanceList();
      
      // Đồng bộ hóa ngày chấm công với khoảng thời gian hoạt động của dự án và hôm nay
      if (projectStartDate.value && attendanceDate.value < projectStartDate.value) {
        attendanceDate.value = projectStartDate.value;
      } else if (attendanceDate.value > todayStr.value) {
        attendanceDate.value = todayStr.value;
      }
      await loadAttendanceData();
    }
  },
  { immediate: true }
);

const actualCost = computed(() => {
  if (!selectedProject.value) return 0;
  let total = 0;
  selectedProjectTasks.value.forEach(task => {
    if (task.loggedHours && task.assigneeId) {
      const ids = task.assigneeId.split(',').map(id => id.trim());
      ids.forEach(assigneeId => {
        const member = selectedProject.value!.members.find(m => m.id === assigneeId);
        const rate = member?.hourlyRate || memberHourlyRates[assigneeId] || 30;
        total += (task.loggedHours! / ids.length) * rate;
      });
    }
  });
  return Math.round(total);
});

const isOverBudget = computed(() => {
  if (!selectedProject.value) return false;
  return attendanceCost.value > (selectedProject.value.budget || 0);
});

// Chấm công & Điểm danh computed & methods
const attendanceCost = computed(() => {
  let total = 0;
  if (!selectedProject.value) return 0;
  projectAttendanceList.value.forEach(record => {
    const member = selectedProject.value!.members.find(m => m.id === record.userId);
    const rate = member?.hourlyRate || 30;
    const hours = record.status === 'Present' ? 8 + record.overtimeHours : record.overtimeHours;
    total += hours * rate;
  });
  return total;
});

const dailyPresentCount = computed(() => {
  return Object.values(attendanceForm.value).filter(r => r.status === 'Present').length;
});

const dailyAbsentCount = computed(() => {
  return Object.values(attendanceForm.value).filter(r => r.status === 'Absent').length;
});

const dailyTotalHours = computed(() => {
  let total = 0;
  if (!selectedProject.value) return 0;
  selectedProject.value.members.forEach(member => {
    total += calculateTotalHours(member.id);
  });
  return total;
});

const dailyTotalPay = computed(() => {
  let total = 0;
  if (!selectedProject.value) return 0;
  selectedProject.value.members.forEach(member => {
    total += calculateTotalPay(member.id, member.hourlyRate || 30);
  });
  return total;
});

async function loadAttendanceData() {
  if (!selectedProject.value) return;
  
  const initialForm: Record<string, { status: 'Present' | 'Absent'; overtimeHours: number; notes: string }> = {};
  selectedProject.value.members.forEach(member => {
    initialForm[member.id] = {
      status: 'Present',
      overtimeHours: 0,
      notes: ''
    };
  });
  
  const data = await taskStore.getAttendance(selectedProject.value.id, attendanceDate.value);
  if (data && data.length > 0) {
    data.forEach(record => {
      if (initialForm[record.userId]) {
        initialForm[record.userId] = {
          status: record.status as 'Present' | 'Absent',
          overtimeHours: record.overtimeHours,
          notes: record.notes
        };
      }
    });
  }
  
  attendanceForm.value = initialForm;
}

function handleDateChange() {
  if (projectStartDate.value && attendanceDate.value < projectStartDate.value) {
    alert(`Không thể chấm công trước ngày bắt đầu hoạt động của dự án (${projectStartDate.value})!`);
    attendanceDate.value = projectStartDate.value;
  } else if (attendanceDate.value > todayStr.value) {
    alert(`Không thể chấm công cho ngày trong tương lai (${todayStr.value})!`);
    attendanceDate.value = todayStr.value;
  }
  loadAttendanceData();
}

async function saveAttendanceData() {
  if (!selectedProject.value) return;
  const records = Object.keys(attendanceForm.value).map(userId => ({
    userId,
    status: attendanceForm.value[userId].status,
    overtimeHours: attendanceForm.value[userId].overtimeHours,
    notes: attendanceForm.value[userId].notes
  }));
  
  await taskStore.saveAttendance(selectedProject.value.id, attendanceDate.value, records);
  alert('Lưu chấm công thành công!');
  await refreshProjectAttendanceList();
}

async function refreshProjectAttendanceList() {
  if (!selectedProject.value) {
    projectAttendanceList.value = [];
    return;
  }
  projectAttendanceList.value = await taskStore.getAllProjectAttendance(selectedProject.value.id);
}

function getMemberStatus(memberId: string): 'Present' | 'Absent' {
  return attendanceForm.value[memberId]?.status || 'Present';
}

function setMemberStatus(memberId: string, status: 'Present' | 'Absent') {
  if (attendanceForm.value[memberId]) {
    attendanceForm.value[memberId].status = status;
  }
}

function calculateTotalHours(memberId: string): number {
  const status = getMemberStatus(memberId);
  const ot = attendanceForm.value[memberId]?.overtimeHours || 0;
  return status === 'Present' ? 8 + ot : ot;
}

function calculateTotalPay(memberId: string, hourlyRate: number): number {
  const hours = calculateTotalHours(memberId);
  return hours * hourlyRate;
}

function getMemberAttendanceDays(memberId: string, status: 'Present' | 'Absent'): number {
  return projectAttendanceList.value.filter(r => r.userId === memberId && r.status === status).length;
}

function getMemberAttendanceHours(memberId: string): number {
  let total = 0;
  projectAttendanceList.value.filter(r => r.userId === memberId).forEach(record => {
    total += record.status === 'Present' ? 8 + record.overtimeHours : record.overtimeHours;
  });
  return total;
}

function getMemberAttendancePay(memberId: string, hourlyRate: number): number {
  return getMemberAttendanceHours(memberId) * hourlyRate;
}

function getMemberTasksCount(memberId: string): number {
  return selectedProjectTasks.value.filter(task => {
    if (!task.assigneeId) return false;
    return task.assigneeId.split(',').map(id => id.trim()).includes(memberId);
  }).length;
}

function getMemberLoggedHours(memberId: string): number {
  let total = 0;
  selectedProjectTasks.value.forEach(task => {
    if (!task.assigneeId || !task.loggedHours) return;
    const ids = task.assigneeId.split(',').map(id => id.trim());
    if (ids.includes(memberId)) {
      total += task.loggedHours / ids.length;
    }
  });
  return Math.round(total);
}

function tasksByProject(projectId: string) {
  return taskStore.tasks.filter(task => task.projectId === projectId);
}

function progressFor(projectId: string) {
  return taskStore.getProjectProgress(projectId);
}

function assigneeNames(assigneeId?: string) {
  if (!assigneeId) return 'Chưa phân công';
  return assigneeId
    .split(',')
    .map(id => taskStore.users.find(user => user.id === id.trim())?.fullName)
    .filter(Boolean)
    .join(', ') || 'Chưa phân công';
}

async function saveMembers() {
  if (!selectedProject.value) return;
  const membersWithRolesAndRates = selectedMemberIds.value.map(id => ({
    userId: id,
    role: memberRoles[id] || 'Member',
    hourlyRate: memberHourlyRates[id] || 30
  }));
  await taskStore.updateProjectMembers(selectedProject.value.id, membersWithRolesAndRates);
}

async function createProject() {
  const members = taskStore.users.filter(user => projectForm.members.includes(user.id)).map(u => ({
    id: u.id,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    role: 'Member',
    isOnline: u.isOnline,
    hourlyRate: memberHourlyRates[u.id] || u.hourlyRate || 30
  }));
  const project = await taskStore.addProject({
    name: projectForm.name,
    description: projectForm.description,
    status: projectForm.status,
    statusText: statusText(projectForm.status),
    color: projectForm.color,
    members,
    budget: projectForm.budget || 1000,
    startDate: projectForm.startDate,
    endDate: projectForm.endDate
  });
  selectedProjectId.value = project.id;
  Object.assign(projectForm, {
    name: '',
    description: '',
    status: 'Active',
    color: 'orange',
    members: [],
    budget: 1000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  isCreateOpen.value = false;
}

function statusText(status: Project['status']) {
  const labels: Record<string, string> = {
    New: 'Mới khởi tạo',
    Active: 'Đang thực hiện',
    OnHold: 'Tạm dừng',
    Completed: 'Hoàn thành',
    active: 'Đang thực hiện'
  };
  return labels[status] || status;
}

function projectTheme(color: string) {
  const themes: Record<string, { solid: string; banner: string }> = {
    orange: { solid: 'bg-orange-600', banner: 'bg-[linear-gradient(135deg,#ea580c,#f59e0b)]' },
    teal: { solid: 'bg-teal-600', banner: 'bg-[linear-gradient(135deg,#0f766e,#14b8a6)]' },
    blue: { solid: 'bg-blue-600', banner: 'bg-[linear-gradient(135deg,#2563eb,#38bdf8)]' },
    rose: { solid: 'bg-rose-600', banner: 'bg-[linear-gradient(135deg,#e11d48,#fb7185)]' },
    violet: { solid: 'bg-violet-600', banner: 'bg-[linear-gradient(135deg,#7c3aed,#a78bfa)]' },
    emerald: { solid: 'bg-emerald-600', banner: 'bg-[linear-gradient(135deg,#059669,#34d399)]' },
    indigo: { solid: 'bg-blue-600', banner: 'bg-[linear-gradient(135deg,#2563eb,#38bdf8)]' },
    amber: { solid: 'bg-orange-600', banner: 'bg-[linear-gradient(135deg,#ea580c,#f59e0b)]' }
  };
  return themes[color] || themes.orange;
}

function statusTheme(status: string) {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'OnHold') return 'bg-amber-100 text-amber-700';
  if (status === 'New') return 'bg-blue-100 text-blue-700';
  return 'bg-orange-100 text-orange-700';
}

function taskStatusTheme(status: Task['status']) {
  if (status === 'Done') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Review') return 'bg-amber-100 text-amber-700';
  if (status === 'InProgress') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}
</script>
