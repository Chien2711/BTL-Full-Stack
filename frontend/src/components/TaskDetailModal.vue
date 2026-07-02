<template>
  <Transition name="modal">
    <div v-if="isOpen && localTask" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <!-- Modal Panel -->
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] transition-all transform duration-300">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center space-x-2">
            <span
              class="px-2.5 py-0.5 rounded-full text-xs font-semibold"
              :class="[
                localTask.priority === 'High' ? 'bg-rose-50 text-rose-600' :
                localTask.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              ]"
            >
              Độ ưu tiên: {{ localTask.priority === 'High' ? 'Cao' : localTask.priority === 'Medium' ? 'Trung bình' : 'Thấp' }}
            </span>
            <span class="text-xs text-slate-400">• Đã tạo: {{ localTask.createdAt }}</span>
          </div>
          <button @click="close" class="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Title & Project -->
          <div class="space-y-1">
            <input
              v-model="localTask.title"
              @change="saveChanges"
              type="text"
              :disabled="!isManager"
              class="w-full text-xl font-bold text-slate-900 bg-transparent border-b border-transparent disabled:hover:border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none py-1 transition-all disabled:cursor-default"
            />
            <div class="text-sm text-slate-500 flex items-center space-x-1.5">
              <span>Thuộc dự án:</span>
              <span class="font-semibold text-slate-800">{{ getProjectName(localTask.projectId) }}</span>
            </div>
          </div>

          <!-- Configuration Grid -->
          <div class="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <!-- Status -->
            <div class="relative w-full">
              <select
                v-model="localTask.status"
                @change="saveChanges"
                id="detail_status"
                :disabled="isViewer"
                class="peer w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold appearance-none disabled:cursor-default"
                :class="isViewer ? '' : 'cursor-pointer'"
              >
                <option value="Backlog">Tích lũy (Backlog)</option>
                <option value="ToDo">Cần làm</option>
                <option value="InProgress">Đang làm</option>
                <option value="Review">Kiểm tra</option>
                <option value="Done">Hoàn thành</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
              <label
                for="detail_status"
                class="absolute left-3 top-0 -translate-y-1/2 text-[10px] font-bold text-indigo-500 px-1 bg-slate-50"
              >
                Trạng thái
              </label>
            </div>

            <!-- Assignee (Multi-Select) -->
            <div class="relative w-full">
              <div class="flex flex-wrap gap-1.5 mt-2">
                <!-- If Viewer or Not Manager: Just show list of avatars/names -->
                <template v-if="!isManager">
                  <span v-if="assigneesList.length === 0" class="text-xs text-slate-400 italic">Chưa phân công</span>
                  <div 
                    v-for="user in assigneesList" 
                    :key="user.id"
                    class="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <img :src="user.avatarUrl" class="w-4 h-4 rounded-full" />
                    <span>{{ user.fullName }}</span>
                  </div>
                </template>

                <!-- If Manager: Show interactive checklist -->
                <template v-else>
                  <button
                    v-for="user in taskStore.users"
                    :key="user.id"
                    type="button"
                    @click="toggleDetailAssignee(user.id)"
                    class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none hover:scale-102 cursor-pointer"
                    :class="[
                      (localTask.assigneeId || '').split(',').includes(user.id)
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-650'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    ]"
                  >
                    <img :src="user.avatarUrl" class="w-4.5 h-4.5 rounded-full" />
                    <span>{{ user.fullName }}</span>
                  </button>
                </template>
              </div>
              <label
                class="absolute left-3 top-0 -translate-y-1/2 text-[10px] font-bold text-indigo-500 px-1 bg-slate-50"
              >
                Người thực hiện
              </label>
            </div>

            <!-- Priority & Estimated Hours -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Priority -->
              <div class="relative w-full">
                <select
                  v-model="localTask.priority"
                  @change="saveChanges"
                  id="detail_priority"
                  :disabled="!isManager"
                  class="peer w-full px-2 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 transition-all font-semibold appearance-none disabled:cursor-default"
                  :class="isManager ? 'cursor-pointer' : ''"
                >
                  <option value="Low">Thấp</option>
                  <option value="Medium">Trung bình</option>
                  <option value="High">Cao</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <svg class="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
                <label
                  for="detail_priority"
                  class="absolute left-2.5 top-0 -translate-y-1/2 text-[9px] font-bold text-indigo-500 px-1 bg-slate-50"
                >
                  Ưu tiên
                </label>
              </div>

              <!-- Estimated Hours -->
              <div class="relative w-full">
                <input
                  v-model.number="localTask.estimatedHours"
                  @change="saveChanges"
                  id="detail_hours"
                  type="number"
                  min="0"
                  placeholder=" "
                  :disabled="!isManager"
                  class="peer w-full px-2 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-850 text-xs focus:outline-none focus:border-indigo-500 transition-all font-semibold disabled:cursor-default"
                />
                <label
                  for="detail_hours"
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                         peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
                         peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[9px] peer-focus:text-indigo-500 peer-focus:px-1 peer-focus:bg-slate-50
                         peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[9px] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:bg-slate-50"
                >
                  Ước lượng (h)
                </label>
              </div>
            </div>

            <!-- Due Date -->
            <div class="relative w-full">
              <input
                v-model="localTask.dueDate"
                @change="saveChanges"
                id="detail_duedate"
                type="date"
                :disabled="!isManager"
                class="peer w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold disabled:cursor-default"
              />
              <label
                for="detail_duedate"
                class="absolute left-3 top-0 -translate-y-1/2 text-[10px] font-bold text-indigo-500 px-1 bg-slate-50"
              >
                Hạn hoàn thành
              </label>
            </div>
          </div>

          <!-- Nhãn công việc (Labels) -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nhãn nhãn màu</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="lbl in availableLabels"
                :key="lbl.name"
                @click="isManager && toggleLabel(lbl.name)"
                class="px-3 py-1 rounded-xl text-xs font-semibold border transition-all select-none"
                :class="[
                  (localTask.labels || []).includes(lbl.name)
                    ? `${lbl.bg} ${lbl.text} ${lbl.border}`
                    : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50',
                  isManager ? 'cursor-pointer hover:scale-102' : 'cursor-default'
                ]"
              >
                {{ lbl.name }}
              </button>
            </div>
          </div>

          <!-- Description -->
          <div class="relative w-full">
            <textarea
              v-model="localTask.description"
              @change="saveChanges"
              id="detail_description"
              rows="3"
              placeholder=" "
              :disabled="!isManager"
              class="peer w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none font-semibold disabled:cursor-default"
            ></textarea>
            <label
              for="detail_description"
              class="absolute left-3.5 top-5 text-xs font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                     peer-placeholder-shown:top-5 peer-placeholder-shown:text-xs 
                     peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-indigo-500 peer-focus:px-1.5 peer-focus:bg-white
                     peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-white"
            >
              Mô tả chi tiết công việc
            </label>
          </div>

          <!-- Two Column Sections: Sub-tasks and Time Tracking -->
          <div class="grid grid-cols-2 gap-8 border-t border-slate-100 pt-6">
            <!-- Left: Sub-tasks checklist -->
            <div class="space-y-4">
              <h4 class="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <CheckSquare class="w-4 h-4 text-indigo-500" />
                <span>Công việc con ({{ subTasksList.length }})</span>
              </h4>

              <!-- Progress bar for sub-tasks -->
              <div v-if="subTasksList.length > 0" class="space-y-1">
                <div class="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Tiến độ hoàn thành</span>
                  <span>{{ subTasksProgress }}%</span>
                </div>
                <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 rounded-full transition-all duration-300" :style="{ width: subTasksProgress + '%' }"></div>
                </div>
              </div>

              <!-- List of subtasks -->
              <div v-if="subTasksList.length > 0" class="space-y-2 max-h-48 overflow-y-auto pr-1">
                <div
                  v-for="sub in subTasksList"
                  :key="sub.id"
                  class="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl border border-slate-50 group transition-colors"
                >
                  <label class="flex items-center space-x-2.5 flex-1 min-w-0" :class="isViewer ? 'cursor-default' : 'cursor-pointer'">
                    <input
                      type="checkbox"
                      :checked="sub.isCompleted"
                      @change="toggleSubTask(sub.id)"
                      :disabled="isViewer"
                      class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      :class="isViewer ? 'cursor-default' : 'cursor-pointer'"
                    />
                    <span
                      class="text-xs text-slate-700 truncate"
                      :class="{ 'line-through text-slate-400': sub.isCompleted }"
                    >
                      {{ sub.title }}
                    </span>
                  </label>
                  <button
                    v-if="isManager"
                    @click="deleteSubTask(sub.id)"
                    class="text-slate-400 hover:text-rose-500 p-1 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="text-xs text-slate-400 italic py-2">Chưa có công việc con nào.</div>

              <!-- Add Sub-task Form -->
              <form v-if="isManager" @submit.prevent="submitSubTask" class="flex space-x-2 relative items-center">
                <div class="relative flex-1">
                  <input
                    v-model="newSubTaskTitle"
                    id="detail_subtask"
                    type="text"
                    placeholder=" "
                    required
                    class="peer w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                  />
                  <label
                    for="detail_subtask"
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                           peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
                           peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:text-indigo-500 peer-focus:px-1 peer-focus:bg-white
                           peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:bg-white"
                  >
                    Thêm việc con...
                  </label>
                </div>
                <button
                  type="submit"
                  @mousedown="handleButtonClick"
                  class="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all relative overflow-hidden cursor-pointer"
                >
                  Thêm
                </button>
              </form>
            </div>

            <!-- Right: Time Tracking Work Logs -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <Clock class="w-4 h-4 text-emerald-500" />
                  <span>Log thời gian làm việc</span>
                </h4>

                <!-- Timer Controls -->
                <div v-if="!isViewer" class="flex items-center space-x-2">
                  <template v-if="taskStore.activeTimerTaskId === localTask?.id">
                    <span class="text-xs font-mono font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">
                      {{ formatTime(taskStore.activeTimerElapsedSeconds) }}
                    </span>
                    <button
                      @click="handleStopTimer"
                      class="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                      title="Dừng đếm giờ"
                    >
                      <Square class="w-3.5 h-3.5 fill-current" />
                    </button>
                  </template>
                  <template v-else-if="!taskStore.activeTimerTaskId">
                    <button
                      @click="taskStore.startTimer(localTask?.id || '')"
                      class="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                    >
                      <Play class="w-3.5 h-3.5 fill-current" />
                      <span>Bắt đầu làm</span>
                    </button>
                  </template>
                  <template v-else>
                    <span class="text-[10px] text-slate-400 italic px-2">Đang đếm giờ task khác...</span>
                  </template>
                </div>
              </div>

              <!-- Progress bar logs vs estimation -->
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Ước lượng: {{ localTask.estimatedHours || 0 }} giờ</span>
                  <span class="font-bold text-emerald-600">Đã làm: {{ localTask.loggedHours || 0 }} giờ</span>
                </div>
                <div class="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :class="timeProgressExceeded ? 'bg-amber-500' : 'bg-emerald-500'"
                    :style="{ width: Math.min(timePercentRatio, 100) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Logs list -->
              <div v-if="workLogsList.length > 0" class="space-y-2 max-h-36 overflow-y-auto pr-1">
                <div v-for="log in workLogsList" :key="log.id" class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                  <div class="flex items-center justify-between text-slate-400">
                    <span class="font-bold text-slate-700">{{ log.userName }}</span>
                    <span>{{ log.createdAt }}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span class="italic">"{{ log.description }}"</span>
                    <span class="font-extrabold text-emerald-600">+{{ log.hours }}h</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-xs text-slate-400 italic py-2">Chưa ghi nhận giờ làm việc nào.</div>

              <!-- Log hour quick form -->
              <form v-if="!isViewer" @submit.prevent="submitWorkLog" class="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3.5">
                <div class="grid grid-cols-3 gap-2">
                  <div class="col-span-1 relative">
                    <input
                      v-model.number="newLogHours"
                      id="log_hours"
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      placeholder=" "
                      class="peer w-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                    <label
                      for="log_hours"
                      class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
                             peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:text-indigo-500 peer-focus:px-1 peer-focus:bg-white
                             peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:bg-white"
                    >
                      Số giờ
                    </label>
                  </div>
                  <div class="col-span-2 relative">
                    <input
                      v-model="newLogDescription"
                      id="log_desc"
                      type="text"
                      required
                      placeholder=" "
                      class="peer w-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                    <label
                      for="log_desc"
                      class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 pointer-events-none transition-all duration-200 ease-out 
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
                             peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:text-indigo-500 peer-focus:px-1 peer-focus:bg-white
                             peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:bg-white"
                    >
                      Mô tả...
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  @mousedown="handleButtonClick"
                  class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1 relative overflow-hidden cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Log giờ làm việc</span>
                </button>
              </form>
            </div>

            <!-- Blocked By (Dependencies) -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Công việc ràng buộc (Blocked by)</h4>
              <div v-if="!isViewer" class="relative">
                <select
                  v-model="newBlockerId"
                  @change="addBlocker"
                  class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2 cursor-pointer transition-colors"
                >
                  <option value="" disabled selected>Thêm ràng buộc...</option>
                  <option v-for="task in availableTasksToBlock" :key="task.id" :value="task.id">
                    {{ task.title }}
                  </option>
                </select>
              </div>

              <!-- List of Blockers -->
              <div v-if="localTask?.blockedBy && localTask.blockedBy.length > 0" class="flex flex-wrap gap-2 mt-2">
                <div
                  v-for="blockerId in localTask.blockedBy"
                  :key="blockerId"
                  class="flex items-center bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 rounded-lg shadow-sm group"
                >
                  <div class="flex items-center space-x-1.5">
                    <Lock class="w-3 h-3 text-rose-500" />
                    <span class="text-xs font-bold max-w-[120px] truncate" :title="getTaskTitle(blockerId)">
                      {{ getTaskTitle(blockerId) }}
                    </span>
                  </div>
                  <button
                    v-if="!isViewer"
                    @click="removeBlocker(blockerId)"
                    class="ml-1.5 p-0.5 rounded hover:bg-rose-200 text-rose-500 hover:text-rose-700 transition-colors"
                    title="Xóa ràng buộc"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div v-else class="text-[10px] text-slate-400 italic px-1">
                Không bị ràng buộc bởi công việc nào.
              </div>
            </div>
          </div>

          <!-- Comments Section -->
          <div class="border-t border-slate-100 pt-6 space-y-4">
            <h4 class="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
              <MessageSquare class="w-4 h-4 text-slate-500" />
              <span>Bình luận thảo luận ({{ commentsList.length }})</span>
            </h4>

            <!-- Comments List -->
            <div class="space-y-4">
              <div v-for="comment in (localTask?.comments || [])" :key="comment.id" class="flex space-x-3">
                <img :src="comment.userAvatar" alt="User Avatar" class="w-8 h-8 rounded-full shadow-sm ring-2 ring-slate-100/50" />
                <div class="flex-1 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm hover:shadow-md transition-shadow group relative">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="font-bold text-slate-800 text-xs">{{ comment.userName }}</span>
                    <span class="text-[10px] font-medium text-slate-400">{{ formatCommentDate(comment.createdAt) }}</span>
                  </div>
                  <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap" v-html="formatCommentContent(comment.content)"></p>
                  
                  <button
                    v-if="!isViewer && canManageComment(comment)"
                    @click="taskStore.deleteComment(localTask?.id || '', comment.id)"
                    class="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-100 transition-all shadow-sm"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Comment Input -->
            <div v-if="!isViewer" class="relative mt-2">
              <textarea
                v-model="newCommentText"
                rows="2"
                placeholder="Viết bình luận của bạn..."
                class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-2xl focus:ring-indigo-500 focus:border-indigo-500 p-3 pr-10 resize-none transition-colors"
                @keydown.enter.prevent="submitComment"
              ></textarea>
              
              <!-- Mention Control Actions -->
              <div class="flex items-center justify-between mt-1">
                <!-- Mention Dropdown -->
                <div class="relative">
                  <button
                    @click="isMentionMenuOpen = !isMentionMenuOpen"
                    class="flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors text-[10px] font-bold"
                  >
                    <AtSign class="w-3 h-3" />
                    <span>Tag thành viên</span>
                  </button>
                  
                  <!-- Mention Users Menu -->
                  <div
                    v-if="isMentionMenuOpen"
                    class="absolute bottom-full left-0 mb-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div class="max-h-40 overflow-y-auto">
                      <div
                        v-for="user in mentionableUsers"
                        :key="user.id"
                        @click="insertMention(user.fullName)"
                        class="flex items-center space-x-2 px-3 py-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                      >
                        <img :src="user.avatarUrl" class="w-5 h-5 rounded-full" />
                        <span class="text-xs font-bold text-slate-700">{{ user.fullName }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  @click="submitComment"
                  class="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  :disabled="!newCommentText.trim()"
                >
                  <Send class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer / Actions -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            v-if="isManager"
            @click="triggerDelete"
            @mousedown="handleButtonClick"
            class="px-4 py-2 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 text-rose-600 hover:text-rose-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <Trash2 class="w-4 h-4 z-10" />
            <span class="z-10">Xóa công việc</span>
          </button>
          <div v-else></div>
          
          <button
            @click="close"
            @mousedown="handleButtonClick"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all relative overflow-hidden cursor-pointer"
          >
            <span class="z-10">Đóng</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, MessageSquare, Send, Trash2, CheckSquare, Clock, Plus, Play, Square, Lock, AtSign } from '@lucide/vue';
import { useTaskStore } from '../stores/taskStore';

// Sóng nước ripple cho các nút bấm trong modal chi tiết
function handleButtonClick(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement;
  const circle = document.createElement('span');
  const diameter = Math.max(el.clientWidth, el.clientHeight);
  const radius = diameter / 2;

  const rect = el.getBoundingClientRect();
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-span-detail');

  const oldRipple = el.querySelector('.ripple-span-detail');
  if (oldRipple) {
    oldRipple.remove();
  }

  el.appendChild(circle);
}
import type { Task, Comment } from '../services/mockData';

const props = defineProps<{
  isOpen: boolean;
  taskId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const taskStore = useTaskStore();
const localTask = ref<Task | null>(null);

const isManager = computed(() => {
  const role = taskStore.currentUser.role;
  return role === 'Project Manager' || role === 'Admin';
});

const isViewer = computed(() => {
  return taskStore.currentUser.role === 'Viewer';
});

// Form / inputs state
const newCommentText = ref('');
const newSubTaskTitle = ref('');
const newLogHours = ref<number | null>(null);
const newLogDescription = ref('');
const editingCommentId = ref<string | null>(null);
const editingCommentText = ref('');

// Available Labels config
const availableLabels = [
  { name: 'Phân tích', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  { name: 'Thiết kế', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  { name: 'Lập trình', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { name: 'Kiểm thử', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { name: 'Họp hành', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  { name: 'Tài liệu', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' }
];

// Load task data when taskId changes
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.taskId) {
      loadTaskData();
    } else {
      localTask.value = null;
    }
  }
);

function loadTaskData() {
  const task = taskStore.tasks.find(t => t.id === props.taskId);
  if (task) {
    localTask.value = JSON.parse(JSON.stringify(task)); // Deep clone
    newSubTaskTitle.value = '';
    newLogHours.value = null;
    newLogDescription.value = '';
    editingCommentId.value = null;
    editingCommentText.value = '';
    void taskStore.refreshTaskComments(task.id);
  }
}

// Subtasks list (always read from store to maintain reactivity)
const subTasksList = computed(() => {
  if (!localTask.value) return [];
  const storeTask = taskStore.tasks.find(t => t.id === localTask.value?.id);
  return storeTask?.subTasks || [];
});

const subTasksProgress = computed(() => {
  if (subTasksList.value.length === 0) return 0;
  const completed = subTasksList.value.filter(s => s.isCompleted).length;
  return Math.round((completed / subTasksList.value.length) * 100);
});

// Work logs list
const workLogsList = computed(() => {
  if (!localTask.value) return [];
  const storeTask = taskStore.tasks.find(t => t.id === localTask.value?.id);
  return storeTask?.workLogs || [];
});

const timePercentRatio = computed(() => {
  if (!localTask.value || !localTask.value.estimatedHours) return 0;
  const ratio = ((localTask.value.loggedHours || 0) / localTask.value.estimatedHours) * 100;
  return Math.round(ratio);
});

const timeProgressExceeded = computed(() => {
  if (!localTask.value || !localTask.value.estimatedHours) return false;
  return (localTask.value.loggedHours || 0) > localTask.value.estimatedHours;
});

// Comments list
const commentsList = computed(() => {
  if (!localTask.value) return [];
  const storeTask = taskStore.tasks.find(t => t.id === localTask.value?.id);
  return storeTask?.comments || [];
});

const assigneesList = computed(() => {
  if (!localTask.value || !localTask.value.assigneeId) return [];
  const ids = localTask.value.assigneeId.split(',');
  return taskStore.users.filter(u => ids.includes(u.id));
});

function toggleDetailAssignee(userId: string) {
  if (localTask.value) {
    const currentIds = localTask.value.assigneeId ? localTask.value.assigneeId.split(',').filter(Boolean) : [];
    let newIds: string[];
    if (currentIds.includes(userId)) {
      newIds = currentIds.filter(id => id !== userId);
    } else {
      newIds = [...currentIds, userId];
    }
    localTask.value.assigneeId = newIds.join(',');
    saveChanges();
  }
}

function getProjectName(projectId: string) {
  const p = taskStore.projects.find(proj => proj.id === projectId);
  return p ? p.name : 'Dự án khác';
}

function saveChanges() {
  if (localTask.value) {
    taskStore.updateTask(localTask.value);
  }
}

// Label management
function toggleLabel(labelName: string) {
  if (localTask.value) {
    if (!localTask.value.labels) localTask.value.labels = [];
    
    if (localTask.value.labels.includes(labelName)) {
      localTask.value.labels = localTask.value.labels.filter(l => l !== labelName);
    } else {
      localTask.value.labels.push(labelName);
    }
    
    saveChanges();
  }
}

// Sub-task actions
function submitSubTask() {
  if (localTask.value && newSubTaskTitle.value.trim()) {
    taskStore.addSubTask(localTask.value.id, newSubTaskTitle.value.trim());
    newSubTaskTitle.value = '';
    
    // Refresh local model values
    const task = taskStore.tasks.find(t => t.id === localTask.value?.id);
    if (task && localTask.value) {
      localTask.value.subTasks = [...(task.subTasks || [])];
    }
  }
}

function toggleSubTask(subTaskId: string) {
  if (localTask.value) {
    taskStore.toggleSubTask(localTask.value.id, subTaskId);
  }
}

function deleteSubTask(subTaskId: string) {
  if (localTask.value) {
    taskStore.deleteSubTask(localTask.value.id, subTaskId);
    // Refresh local model
    const task = taskStore.tasks.find(t => t.id === localTask.value?.id);
    if (task && localTask.value) {
      localTask.value.subTasks = [...(task.subTasks || [])];
    }
  }
}

// Work log action
function submitWorkLog() {
  if (localTask.value && newLogHours.value && newLogHours.value > 0 && newLogDescription.value.trim()) {
    taskStore.addWorkLog(localTask.value.id, newLogHours.value, newLogDescription.value.trim());
    
    // Reset inputs
    newLogHours.value = null;
    newLogDescription.value = '';
    
    // Sync local state
    const task = taskStore.tasks.find(t => t.id === localTask.value?.id);
    if (task && localTask.value) {
      localTask.value.workLogs = [...(task.workLogs || [])];
      localTask.value.loggedHours = task.loggedHours;
    }
  }
}

// Timer helpers
function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function handleStopTimer() {
  const result = taskStore.stopTimer();
  if (result.taskId === localTask.value?.id) {
    newLogHours.value = result.hours;
    newLogDescription.value = 'Đã hoàn thành phiên làm việc (Pomodoro)';
    // Highlight or scroll to form could be done here
  }
}

// Comments actions
const isMentionMenuOpen = ref(false);
const mentionableUsers = computed(() => taskStore.users);

function insertMention(fullName: string) {
  const formattedName = fullName.replace(/\s+/g, '_');
  newCommentText.value += `@${formattedName} `;
  isMentionMenuOpen.value = false;
}

function formatCommentContent(text: string) {
  if (!text) return '';
  // Convert @Name_Surname to bold colored span
  return text.replace(/@(\S+)/g, (match, _name) => {
    return `<span class="text-indigo-600 font-extrabold bg-indigo-50 px-1 rounded cursor-pointer hover:underline">${match}</span>`;
  });
}

async function submitComment() {
  if (localTask.value && newCommentText.value.trim()) {
    const rawText = newCommentText.value;
    await taskStore.addComment(localTask.value.id, rawText.trim());
    
    // Check for mentions and trigger notifications
    const mentions = rawText.match(/@(\S+)/g);
    if (mentions) {
      mentions.forEach(mention => {
        // e.g. @Ngọc_Bảo -> Ngọc Bảo
        const nameToFind = mention.substring(1).replace(/_/g, ' ').toLowerCase();
        const taggedUser = taskStore.users.find(u => u.fullName.toLowerCase() === nameToFind);
        if (taggedUser && taggedUser.id !== taskStore.currentUser.id) {
          taskStore.notifyUser(taggedUser.id, 'Bạn được nhắc đến!', `${taskStore.currentUser.fullName} đã nhắc đến bạn trong task "${localTask.value?.title}".`, localTask.value?.id);
        }
      });
    }

    newCommentText.value = '';
    
    // Re-fetch or sync comments natively
    const task = taskStore.tasks.find(t => t.id === localTask.value?.id);
    if (task && localTask.value) {
      localTask.value.comments = [...(task.comments || [])];
    }
  }
}

function canManageComment(comment: Comment) {
  if (isManager.value) return true;
  const currentUser = taskStore.currentUser;
  return comment.userId === currentUser.id || (!comment.userId && comment.userName === currentUser.fullName);
}

function formatCommentDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`;
  } catch (e) {
    return dateStr;
  }
}

function triggerDelete() {
  if (localTask.value && confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
    taskStore.deleteTask(localTask.value.id);
    close();
  }
}

function close() {
  emit('close');
}

// --- Task Dependencies (Blocked By) ---
const newBlockerId = ref('');

const availableTasksToBlock = computed(() => {
  if (!localTask.value) return [];
  // Can block by any task in the same project, EXCEPT itself, and EXCEPT those already blocking it
  return taskStore.tasks.filter(t => 
    t.projectId === localTask.value?.projectId &&
    t.id !== localTask.value?.id &&
    !(localTask.value?.blockedBy || []).includes(t.id)
  );
});

function getTaskTitle(taskId: string) {
  const t = taskStore.tasks.find(x => x.id === taskId);
  return t ? t.title : 'Unknown Task';
}

function addBlocker() {
  if (newBlockerId.value && localTask.value) {
    const updatedBlockedBy = [...(localTask.value.blockedBy || []), newBlockerId.value];
    taskStore.updateBlockedBy(localTask.value.id, updatedBlockedBy);
    localTask.value.blockedBy = updatedBlockedBy;
    newBlockerId.value = ''; // Reset select
  }
}

function removeBlocker(blockerId: string) {
  if (localTask.value) {
    const updatedBlockedBy = (localTask.value.blockedBy || []).filter(id => id !== blockerId);
    taskStore.updateBlockedBy(localTask.value.id, updatedBlockedBy);
    localTask.value.blockedBy = updatedBlockedBy;
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.9);
}

/* Modal details ripple styles */
:deep(.ripple-span-detail) {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple-animation 500ms linear;
  background-color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 0;
}
:deep(button.hover\:bg-rose-50 .ripple-span-detail) {
  background-color: rgba(244, 63, 94, 0.15); /* Pink ripple on delete button */
}
:deep(button.bg-indigo-50 .ripple-span-detail) {
  background-color: rgba(99, 102, 241, 0.15); /* Indigo ripple on light buttons */
}
</style>
