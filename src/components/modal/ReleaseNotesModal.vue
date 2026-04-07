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
              <h2 class="text-xl font-semibold text-[var(--text-primary)]">更新日志</h2>
              <p class="mt-1 text-sm text-[var(--text-secondary)]">查看 GitHub 上最新发布版本的更新内容</p>
            </div>
            <button @click="closeModal" class="rounded-lg p-1 transition-colors hover:bg-[var(--hover-bg)]">
              <X class="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
              <div class="flex items-center gap-3 text-[var(--text-secondary)]">
                <RefreshCw class="h-5 w-5 animate-spin" />
                <span>正在加载最新更新日志...</span>
              </div>
            </div>

            <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <div class="flex items-start gap-3">
                <AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <div class="font-medium">获取更新日志失败</div>
                  <p class="mt-1 text-sm leading-6">{{ error }}</p>
                </div>
              </div>
            </div>

            <div v-else-if="release" class="space-y-5">
              <div class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div class="text-lg font-semibold text-[var(--text-primary)]">{{ release.title }}</div>
                    <div class="mt-1 text-sm text-[var(--text-secondary)]">版本 {{ release.version }}</div>
                  </div>
                  <div v-if="release.publishedAt" class="text-sm text-[var(--text-secondary)]">
                    发布日期：{{ formatDate(release.publishedAt) }}
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                <div class="mb-4 text-sm font-medium text-[var(--text-primary)]">更新内容</div>
                <div class="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  <template v-for="(block, index) in releaseBlocks" :key="`${block.kind}-${index}`">
                    <div v-if="block.kind === 'spacer'" class="h-2"></div>
                    <div v-else-if="block.kind === 'heading1'" class="text-xl font-semibold text-[var(--text-primary)]">{{ block.text }}</div>
                    <div v-else-if="block.kind === 'heading2'" class="text-lg font-semibold text-[var(--text-primary)]">{{ block.text }}</div>
                    <div v-else-if="block.kind === 'heading3'" class="text-base font-semibold text-[var(--text-primary)]">{{ block.text }}</div>
                    <div v-else-if="block.kind === 'bullet'" class="flex items-start gap-2">
                      <CheckCircle class="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                      <span>{{ block.text }}</span>
                    </div>
                    <div v-else-if="block.kind === 'numbered'" class="flex items-start gap-2">
                      <span class="mt-0.5 min-w-5 text-center font-medium text-[var(--text-primary)]">{{ block.marker }}</span>
                      <span>{{ block.text }}</span>
                    </div>
                    <p v-else class="whitespace-pre-wrap break-words">{{ block.text }}</p>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 border-t border-[var(--border-color)] px-6 py-4">
            <button
              v-if="error"
              @click="emit('retry')"
              class="flex-1 rounded-lg bg-[var(--theme-bg)] px-4 py-2 text-[var(--theme-text)] transition-opacity hover:opacity-90"
            >
              重试
            </button>
            <button
              v-else-if="release"
              @click="emit('open-link')"
              class="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--hover-bg)]"
            >
              在 GitHub 查看
            </button>
            <button
              @click="closeModal"
              class="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--hover-bg)]"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-vue-next'
import type { LatestReleaseNotes } from '@/electron.d'

type ReleaseBlock = {
  kind: 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'paragraph' | 'spacer'
  text: string
  marker?: string
}

interface Props {
  visible: boolean
  release: LatestReleaseNotes | null
  loading: boolean
  error: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  retry: []
  'open-link': []
}>()

const releaseBlocks = computed<ReleaseBlock[]>(() => {
  const body = props.release?.body?.replace(/\r\n/g, '\n').trim() || ''
  if (!body) {
    return [{ kind: 'paragraph', text: '暂无更新日志内容。' }]
  }

  return body.split('\n').map((rawLine) => {
    const line = rawLine.trim()

    if (!line) {
      return { kind: 'spacer', text: '' }
    }

    if (line.startsWith('### ')) {
      return { kind: 'heading3', text: line.slice(4).trim() }
    }

    if (line.startsWith('## ')) {
      return { kind: 'heading2', text: line.slice(3).trim() }
    }

    if (line.startsWith('# ')) {
      return { kind: 'heading1', text: line.slice(2).trim() }
    }

    if (/^[-*]\s+/.test(line)) {
      return { kind: 'bullet', text: line.replace(/^[-*]\s+/, '').trim() }
    }

    const numberedMatch = line.match(/^(\d+\.)\s+(.*)$/)
    if (numberedMatch) {
      return {
        kind: 'numbered',
        marker: numberedMatch[1],
        text: numberedMatch[2].trim()
      }
    }

    return { kind: 'paragraph', text: line }
  })
})

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
