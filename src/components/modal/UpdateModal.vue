<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="mx-4 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl">
          <div class="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-[var(--text-primary)]">{{ modalTitle }}</h2>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">{{ modalSubtitle }}</p>
            </div>
            <button @click="closeModal" class="rounded-lg p-1 transition-colors hover:bg-[var(--hover-bg)]">
              <X class="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <div class="space-y-5">
              <div class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="space-y-2">
                    <div class="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span>当前版本</span>
                      <span class="rounded-full bg-[var(--bg-primary)] px-3 py-1 font-medium text-[var(--text-primary)]">
                        {{ updateState.currentVersion }}
                      </span>
                    </div>
                    <div class="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span>最新版本</span>
                      <span class="rounded-full bg-[var(--theme-bg)] px-3 py-1 font-medium text-[var(--theme-text)]">
                        {{ updateState.availableVersion || updateState.currentVersion }}
                      </span>
                    </div>
                  </div>
                  <div v-if="updateState.releaseDate" class="text-sm text-[var(--text-secondary)]">
                    发布日期：{{ formatDate(updateState.releaseDate) }}
                  </div>
                </div>
              </div>

              <div v-if="updateState.releaseNotes.length" class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                <div class="mb-4 text-sm font-medium text-[var(--text-primary)]">更新内容</div>
                <div class="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  <div v-for="(note, index) in updateState.releaseNotes" :key="index" class="flex items-start gap-2">
                    <CheckCircle class="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span>{{ note }}</span>
                  </div>
                </div>
              </div>

              <div v-else class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 text-sm text-[var(--text-secondary)]">
                当前版本未提供详细更新内容。
              </div>

              <div v-if="updateState.status === 'downloading'" class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                <div class="mb-3 flex items-center justify-between text-sm text-[var(--text-secondary)]">
                  <span>下载进度</span>
                  <span>{{ progressText }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                  <div class="h-full bg-[var(--theme-bg)] transition-all duration-300" :style="{ width: `${updateState.downloadPercent}%` }" />
                </div>
              </div>

              <div v-if="updateState.status === 'downloaded'" class="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                更新已下载完成，点击下方按钮即可重启并安装。
              </div>

              <div v-if="updateState.errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {{ updateState.errorMessage }}
              </div>
            </div>
          </div>

          <div class="flex gap-3 border-t border-[var(--border-color)] px-6 py-4">
            <button
              @click="closeModal"
              class="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--hover-bg)]"
            >
              稍后处理
            </button>
            <button
              @click="emit('action')"
              :disabled="isActionDisabled"
              class="flex-1 rounded-lg bg-[var(--theme-bg)] px-4 py-2 text-[var(--theme-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div class="flex items-center justify-center gap-2">
                <RefreshCw v-if="updateState.status === 'downloading'" class="h-4 w-4 animate-spin" />
                <Download v-else-if="updateState.status === 'available'" class="h-4 w-4" />
                <RefreshCw v-else class="h-4 w-4" />
                <span>{{ actionLabel }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, Download, RefreshCw, X } from 'lucide-vue-next'
import type { AppUpdateState } from '@/electron.d'

interface Props {
  visible: boolean
  updateState: AppUpdateState
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  action: []
}>()

const modalTitle = computed(() => {
  if (props.updateState.status === 'downloading') {
    return '下载更新中'
  }

  if (props.updateState.status === 'downloaded') {
    return '更新已就绪'
  }

  return '发现新版本'
})

const modalSubtitle = computed(() => {
  if (props.updateState.status === 'downloading') {
    return '新版本正在下载，请稍候。'
  }

  if (props.updateState.status === 'downloaded') {
    return '安装包已准备完成，可以立即安装。'
  }

  return '发现了可用更新，下面是本次版本的更新摘要。'
})

const actionLabel = computed(() => {
  if (props.updateState.status === 'downloading') {
    return '下载中...'
  }

  if (props.updateState.status === 'downloaded') {
    return '重启安装'
  }

  return '立即下载'
})

const isActionDisabled = computed(() => props.updateState.status === 'downloading')

const progressText = computed(() => `${props.updateState.downloadPercent.toFixed(1)}%`)

function formatDate(dateString: string) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

function closeModal() {
  emit('update:visible', false)
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>
