<template>
  <div class="space-y-6 p-6">
    <div class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
      <div class="mb-6 flex items-start justify-between">
        <div class="flex-shrink-0">
          <img src="/logo.png" alt="AI Writer Logo" class="h-16 w-16 rounded-2xl border-1 border-[var(--border-color)]" />
        </div>

        <div class="ml-6 flex-1">
          <h1 class="mb-2 text-2xl font-bold text-[var(--text-primary)]">神笔写作</h1>
          <p class="text-[var(--text-secondary)]">让创作更智能，让写作更高效</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 rounded-full border border-[var(--theme-bg)] bg-[var(--theme-bg)] px-3 py-1.5 text-[var(--theme-text)]">
            <Tag class="h-4 w-4" />
            <span class="text-sm font-medium">{{ appVersion }}</span>
          </div>
          <div v-if="updateStore.hasUpdate" class="rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
            新版本 {{ updateStore.state.availableVersion }}
          </div>
        </div>

        <button
          @click="checkForUpdates"
          class="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="updateStore.isChecking"
        >
          <RefreshCw v-if="updateStore.isChecking" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          <span class="text-sm font-medium">{{ updateStore.isChecking ? '检查中...' : '检查更新' }}</span>
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
      <h3 class="mb-4 text-lg font-semibold text-[var(--text-primary)]">更多信息</h3>
      <div class="space-y-3">
        <div class="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
          <div class="flex items-center">
            <Globe class="mr-3 h-5 w-5 text-[var(--text-secondary)]" />
            <span class="font-medium text-[var(--text-primary)]">官方网站</span>
          </div>
          <button @click="openOfficialWebsite" class="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--hover-bg)]">
            <span class="text-sm font-medium">访问</span>
          </button>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
          <div class="flex items-center">
            <BookOpen class="mr-3 h-5 w-5 text-[var(--text-secondary)]" />
            <span class="font-medium text-[var(--text-primary)]">使用教程</span>
          </div>
          <button @click="openTutorial" class="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--hover-bg)]">
            <span class="text-sm font-medium">查看</span>
          </button>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
          <div class="flex items-center">
            <ScrollText class="mr-3 h-5 w-5 text-[var(--text-secondary)]" />
            <span class="font-medium text-[var(--text-primary)]">更新日志</span>
          </div>
          <button
            @click="openReleaseNotes"
            class="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="releaseNotesLoading"
          >
            <RefreshCw v-if="releaseNotesLoading && !showReleaseNotesModal" class="h-4 w-4 animate-spin" />
            <span class="text-sm font-medium">查看最新</span>
          </button>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
          <div class="flex items-center">
            <Users class="mr-3 h-5 w-5 text-[var(--text-secondary)]" />
            <span class="font-medium text-[var(--text-primary)]">官方社区</span>
          </div>
          <button @click="openCommunity" class="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--hover-bg)]">
            <span class="text-sm font-medium">加入</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <UpdateModal v-model:visible="showUpdateModal" :updateState="updateStore.state" @action="handleUpdateAction" />
  <ReleaseNotesModal
    v-model:visible="showReleaseNotesModal"
    :release="latestReleaseNotes"
    :loading="releaseNotesLoading"
    :error="releaseNotesError"
    @retry="loadLatestReleaseNotes"
    @open-link="openLatestReleaseOnGitHub"
  />
  <Toast :visible="toastVisible" :message="toastMessage" :type="toastType" @update:visible="toastVisible = $event" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookOpen, Download, Globe, RefreshCw, ScrollText, Tag, Users } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import ReleaseNotesModal from '@/components/modal/ReleaseNotesModal.vue'
import UpdateModal from '@/components/modal/UpdateModal.vue'
import Toast from '@/components/shared/Toast.vue'
import { useUpdateStore } from '@/stores/update'
import type { LatestReleaseNotes } from '@/electron.d'

const updateStore = useUpdateStore()
const showUpdateModal = ref(false)
const showReleaseNotesModal = ref(false)
const latestReleaseNotes = ref<LatestReleaseNotes | null>(null)
const releaseNotesLoading = ref(false)
const releaseNotesError = ref<string | null>(null)
const { toastVisible, toastMessage, toastType, showToast } = useToast()

const appVersion = computed(() => updateStore.state.currentVersion || '0.0.0')

watch(
  () => updateStore.state.status,
  (status) => {
    if (status === 'available' || status === 'downloading' || status === 'downloaded') {
      showUpdateModal.value = true
    }
  }
)

async function checkForUpdates() {
  const result = await updateStore.checkForUpdates()

  if (result.status === 'not-available') {
    showToast({
      message: '当前已是最新版本！',
      type: 'info'
    })
  }

  if (result.status === 'error') {
    showToast({
      message: result.errorMessage || '检查更新失败，请稍后重试',
      type: 'error'
    })
  }
}

async function loadLatestReleaseNotes() {
  try {
    releaseNotesLoading.value = true
    releaseNotesError.value = null
    latestReleaseNotes.value = await window.electronAPI.getLatestReleaseNotes()
  } catch (error) {
    releaseNotesError.value = error instanceof Error ? error.message : '获取更新日志失败，请稍后重试'
  } finally {
    releaseNotesLoading.value = false
  }
}

async function openReleaseNotes() {
  showReleaseNotesModal.value = true
  await loadLatestReleaseNotes()
}

async function openLatestReleaseOnGitHub() {
  if (!latestReleaseNotes.value?.url) {
    return
  }

  try {
    await window.electronAPI.openExternal(latestReleaseNotes.value.url)
  } catch (error) {
    console.error('打开 GitHub 更新日志失败:', error)
  }
}

async function handleUpdateAction() {
  if (updateStore.state.status === 'available') {
    await updateStore.downloadUpdate()
    return
  }

  if (updateStore.state.status === 'downloaded') {
    await updateStore.installUpdate()
  }
}

async function openOfficialWebsite() {
  try {
    await window.electronAPI.openExternal('https://github.com/qgming/aiwriter')
  } catch (error) {
    console.error('打开官方网站失败:', error)
  }
}

async function openTutorial() {
  try {
    await window.electronAPI.openExternal('https://shenbi.qgming.com/software/introduction.html')
  } catch (error) {
    console.error('打开使用教程失败:', error)
  }
}

async function openCommunity() {
  try {
    await window.electronAPI.openExternal('https://pd.qq.com/g/shenbixiezuo0')
  } catch (error) {
    console.error('打开官方社区失败:', error)
  }
}

onMounted(async () => {
  await updateStore.initialize()
  if (updateStore.hasUpdate) {
    showUpdateModal.value = true
  }
})
</script>
