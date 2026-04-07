<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="handleCancel"></div>
      <div
        class="relative w-full max-w-md rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-lg">
        <h3 class="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          {{ title }}
        </h3>

        <div class="mb-6">
          <p class="leading-relaxed text-[var(--text-secondary)]">
            {{ message }}
          </p>
          <p v-if="description" class="mt-2 text-sm text-[var(--text-tertiary)]">
            {{ description }}
          </p>
        </div>

        <div class="flex justify-end gap-3">
          <button type="button" @click="handleCancel"
            class="rounded-lg border border-[var(--border-color)] px-4 py-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover-bg)]"
            :disabled="loading">
            {{ cancelText }}
          </button>
          <button type="button" @click="handleConfirm" :disabled="loading"
            class="rounded-lg px-4 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50" :class="dangerous
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-[var(--theme-bg)] text-[var(--theme-text)] hover:bg-[var(--theme-hover)]'">
            {{ loading ? confirmLoadingText : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'

interface Props {
  visible: boolean
  title?: string
  message: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmLoadingText?: string
  dangerous?: boolean
  loading?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '确认操作',
  confirmText: '确认',
  cancelText: '取消',
  confirmLoadingText: '处理中...',
  dangerous: false,
  loading: false
})

const emit = defineEmits<Emits>()

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.visible) return

  if (event.key === 'Escape') {
    handleCancel()
  } else if (event.key === 'Enter' && !props.loading) {
    handleConfirm()
  }
}

// 生命周期管理
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 监听visible变化，处理焦点和滚动
watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}
</script>
