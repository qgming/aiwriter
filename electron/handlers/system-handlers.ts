import { ipcMain, app, shell, dialog, type OpenDialogOptions } from 'electron'
import fs from 'fs'
import path from 'path'
import { BackupService } from '../services/backup-service'
import { VectorService } from '../services/vector-service'
import { updateService } from '../services/update-service'

const GITHUB_RELEASE_API_URL = 'https://api.github.com/repos/qgming/aiwriter/releases/latest'
const GITHUB_RELEASE_ATOM_URL = 'https://github.com/qgming/aiwriter/releases.atom'
const GITHUB_API_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'aiwriter-desktop'
}

interface GitHubReleaseResponse {
  tag_name?: string
  name?: string
  body?: string | null
  html_url?: string
  published_at?: string | null
  message?: string
}

interface LatestReleaseNotesPayload {
  version: string
  title: string
  body: string
  publishedAt: string | null
  url: string
}

export function registerSystemHandlers(): void {
  console.log('Registering system handlers...')

  // 获取应用版本
  ipcMain.handle('get-app-version', () => {
    try {
      return app.getVersion()
    } catch (error) {
      console.error('Error in get-app-version handler:', error)
      throw error
    }
  })

  // 获取应用更新状态
  ipcMain.handle('app-update:get-state', () => {
    try {
      return updateService.getState()
    } catch (error) {
      console.error('Error in app-update:get-state handler:', error)
      throw error
    }
  })

  // 手动检查更新
  ipcMain.handle('app-update:check', async () => {
    try {
      return await updateService.checkForUpdates(true)
    } catch (error) {
      console.error('Error in app-update:check handler:', error)
      throw error
    }
  })

  // 下载更新
  ipcMain.handle('app-update:download', async () => {
    try {
      return await updateService.downloadUpdate()
    } catch (error) {
      console.error('Error in app-update:download handler:', error)
      throw error
    }
  })

  // 安装更新
  ipcMain.handle('app-update:install', () => {
    try {
      return updateService.installUpdate()
    } catch (error) {
      console.error('Error in app-update:install handler:', error)
      throw error
    }
  })

  // 获取 GitHub 最新发布日志
  ipcMain.handle('get-latest-release-notes', async () => {
    try {
      return await fetchLatestReleaseNotes()
    } catch (error) {
      console.error('Error in get-latest-release-notes handler:', error)
      throw error
    }
  })

  // 打开外部链接
  ipcMain.handle('open-external', async (_event, url: string) => {
    try {
      await shell.openExternal(url)
    } catch (error) {
      console.error('Error in open-external handler:', error)
      throw error
    }
  })

  // 显示打开文件对话框
  ipcMain.handle('show-open-dialog', async (_event, options: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: OpenDialogOptions['properties'];
  }) => {
    try {
      const result = await dialog.showOpenDialog({
        title: options.title || '选择文件',
        filters: options.filters || [],
        properties: options.properties || ['openFile']
      })
      return result
    } catch (error) {
      console.error('Error in show-open-dialog handler:', error)
      throw error
    }
  })

  // 读取文件内容
  ipcMain.handle('read-file', async (_event, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error('Error in read-file handler:', error)
      throw error
    }
  })

  // 获取应用数据目录路径
  ipcMain.handle('get-app-data-path', () => {
    try {
      return app.getPath('userData')
    } catch (error) {
      console.error('Error in get-app-data-path handler:', error)
      throw error
    }
  })

  // 打开文件夹
  ipcMain.handle('open-folder', async (_event, folderPath: string) => {
    try {
      await shell.openPath(folderPath)
      return { success: true }
    } catch (error) {
      console.error('Error in open-folder handler:', error)
      throw error
    }
  })

  // 获取文件大小
  ipcMain.handle('get-file-size', async (_event, filePath: string) => {
    try {
      const stats = fs.statSync(filePath)
      return { size: stats.size, success: true }
    } catch (error) {
      console.error('Failed to get file size:', error)
      return { size: 0, success: false }
    }
  })

  // 获取文件夹大小
  ipcMain.handle('get-folder-size', async (_event, folderPath: string) => {
    try {
      const size = getFolderSize(folderPath)
      return { size, success: true }
    } catch (error) {
      console.error('Failed to get folder size:', error)
      return { size: 0, success: false }
    }
  })

  // 数据备份
  ipcMain.handle('backup-data', async () => {
    try {
      return await BackupService.backupData()
    } catch (error) {
      console.error('Error in backup-data handler:', error)
      throw error
    }
  })

  // 数据恢复
  ipcMain.handle('restore-data', async () => {
    try {
      return await BackupService.restoreData()
    } catch (error) {
      console.error('Error in restore-data handler:', error)
      throw error
    }
  })

  // 重置数据
  ipcMain.handle('reset-data', async () => {
    try {
      return await BackupService.resetData()
    } catch (error) {
      console.error('Error in reset-data handler:', error)
      throw error
    }
  })

  // 向量相关处理器
  ipcMain.handle('create-chapter-vector', async (_event, data: {
    book_id: number;
    chapter_id: number;
    chunk_index: number;
    chunk_text: string;
    embedding: Buffer;
    token_count: number
  }) => {
    try {
      return await VectorService.createChapterVector(data)
    } catch (error) {
      console.error('Error in create-chapter-vector handler:', error)
      throw error
    }
  })

  ipcMain.handle('get-chapter-vectors-by-book-id', async (_event, bookId: number) => {
    try {
      return await VectorService.getChapterVectorsByBookId(bookId)
    } catch (error) {
      console.error('Error in get-chapter-vectors-by-book-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('get-chapter-vectors-by-chapter-id', async (_event, chapterId: number) => {
    try {
      return await VectorService.getChapterVectorsByChapterId(chapterId)
    } catch (error) {
      console.error('Error in get-chapter-vectors-by-chapter-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('delete-chapter-vectors-by-chapter-id', async (_event, chapterId: number) => {
    try {
      await VectorService.deleteChapterVectorsByChapterId(chapterId)
      return { success: true }
    } catch (error) {
      console.error('Error in delete-chapter-vectors-by-chapter-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('delete-chapter-vectors-by-book-id', async (_event, bookId: number) => {
    try {
      await VectorService.deleteChapterVectorsByBookId(bookId)
      return { success: true }
    } catch (error) {
      console.error('Error in delete-chapter-vectors-by-book-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('search-similar-chapter-vectors', async (_event, bookId: number, queryEmbedding: Buffer, limit: number, excludeChapterId?: number) => {
    try {
      return await VectorService.searchSimilarChapterVectors(bookId, queryEmbedding, limit, excludeChapterId)
    } catch (error) {
      console.error('Error in search-similar-chapter-vectors handler:', error)
      throw error
    }
  })

  ipcMain.handle('create-setting-vector', async (_event, data: {
    book_id: number;
    setting_id: number;
    setting_content: string;
    embedding: Buffer;
    token_count: number
  }) => {
    try {
      return await VectorService.createSettingVector(data)
    } catch (error) {
      console.error('Error in create-setting-vector handler:', error)
      throw error
    }
  })

  ipcMain.handle('get-setting-vector-by-setting-id', async (_event, settingId: number) => {
    try {
      return await VectorService.getSettingVectorBySettingId(settingId)
    } catch (error) {
      console.error('Error in get-setting-vector-by-setting-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('get-setting-vectors-by-book-id', async (_event, bookId: number) => {
    try {
      return await VectorService.getSettingVectorsByBookId(bookId)
    } catch (error) {
      console.error('Error in get-setting-vectors-by-book-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('update-setting-vector', async (_event, settingId: number, data: {
    setting_content?: string;
    embedding?: Buffer;
    token_count?: number
  }) => {
    try {
      return await VectorService.updateSettingVector(settingId, data)
    } catch (error) {
      console.error('Error in update-setting-vector handler:', error)
      throw error
    }
  })

  ipcMain.handle('delete-setting-vector-by-setting-id', async (_event, settingId: number) => {
    try {
      await VectorService.deleteSettingVectorBySettingId(settingId)
      return { success: true }
    } catch (error) {
      console.error('Error in delete-setting-vector-by-setting-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('delete-setting-vectors-by-book-id', async (_event, bookId: number) => {
    try {
      await VectorService.deleteSettingVectorsByBookId(bookId)
      return { success: true }
    } catch (error) {
      console.error('Error in delete-setting-vectors-by-book-id handler:', error)
      throw error
    }
  })

  ipcMain.handle('search-similar-setting-vectors', async (_event, bookId: number, queryEmbedding: Buffer, limit: number) => {
    try {
      return await VectorService.searchSimilarSettingVectors(bookId, queryEmbedding, limit)
    } catch (error) {
      console.error('Error in search-similar-setting-vectors handler:', error)
      throw error
    }
  })

  console.log('System handlers registered')
}

function getDefaultReleaseUrl(): string {
  return 'https://github.com/qgming/aiwriter/releases/latest'
}

async function fetchLatestReleaseNotes(): Promise<LatestReleaseNotesPayload> {
  try {
    return await fetchLatestReleaseNotesFromApi()
  } catch (apiError) {
    console.warn('GitHub API 获取更新日志失败，尝试 Atom feed 回退:', apiError)
    return fetchLatestReleaseNotesFromAtom()
  }
}

async function fetchLatestReleaseNotesFromApi(): Promise<LatestReleaseNotesPayload> {
  const response = await fetch(GITHUB_RELEASE_API_URL, {
    headers: GITHUB_API_HEADERS
  })

  if (!response.ok) {
    let errorMessage = `GitHub 请求失败（${response.status}）`
    try {
      const errorData = await response.json() as GitHubReleaseResponse
      if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // 忽略错误响应解析失败，保留默认提示
    }
    throw new Error(errorMessage)
  }

  const release = await response.json() as GitHubReleaseResponse
  return {
    version: release.tag_name || release.name || 'latest',
    title: release.name || release.tag_name || '最新更新日志',
    body: release.body?.trim() || '暂无更新日志内容。',
    publishedAt: release.published_at || null,
    url: release.html_url || getDefaultReleaseUrl()
  }
}

async function fetchLatestReleaseNotesFromAtom(): Promise<LatestReleaseNotesPayload> {
  const response = await fetch(GITHUB_RELEASE_ATOM_URL, {
    headers: {
      'User-Agent': GITHUB_API_HEADERS['User-Agent']
    }
  })

  if (!response.ok) {
    throw new Error(`GitHub Atom feed 请求失败（${response.status}）`)
  }

  const xml = await response.text()
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/)
  if (!entryMatch) {
    throw new Error('未找到最新发布日志内容')
  }

  const entry = entryMatch[1]
  const version = extractXmlText(entry, 'title') || 'latest'
  const publishedAt = extractXmlText(entry, 'updated') || null
  const urlMatch = entry.match(/<link[^>]*href="([^"]+)"/)
  const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)
  const body = contentMatch
    ? convertGitHubHtmlToMarkdownish(decodeHtmlEntities(contentMatch[1]))
    : '暂无更新日志内容。'

  return {
    version,
    title: getFirstHeading(body) || version,
    body,
    publishedAt,
    url: urlMatch?.[1] || getDefaultReleaseUrl()
  }
}

function extractXmlText(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`))
  return match ? decodeHtmlEntities(match[1]).trim() : ''
}

function getFirstHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function convertGitHubHtmlToMarkdownish(html: string): string {
  return html
    .replace(/<h1>([\s\S]*?)<\/h1>/gi, (_match, content) => `# ${content.trim()}\n\n`)
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, (_match, content) => `## ${content.trim()}\n\n`)
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, (_match, content) => `### ${content.trim()}\n\n`)
    .replace(/<p>([\s\S]*?)<\/p>/gi, (_match, content) => `${content.trim()}\n\n`)
    .replace(/<li>([\s\S]*?)<\/li>/gi, (_match, content) => `- ${content.trim()}\n`)
    .replace(/<hr\s*\/?>/gi, '---\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<code>([\s\S]*?)<\/code>/gi, (_match, content) => `\`${content.trim()}\``)
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
// 递归计算文件夹大小
function getFolderSize(folderPath: string): number {
  let totalSize = 0
  try {
    const files = fs.readdirSync(folderPath)
    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const stats = fs.statSync(filePath)
      if (stats.isDirectory()) {
        totalSize += getFolderSize(filePath)
      } else {
        totalSize += stats.size
      }
    }
  } catch (error) {
    console.error('Failed to calculate folder size:', error)
  }
  return totalSize
}

