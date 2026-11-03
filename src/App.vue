<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { watch } from 'vue'
import LoginView from './components/LoginView.vue'
import AppLayout from './components/AppLayout.vue'
import { themeOverrides } from './theme'
import { useStatsQuery } from './composables/useStatsQuery'
import { provideAppContext } from './composables/appContext'
import {
  clearAuth,
  isAuthenticated,
  setUnauthorizedHandler,
} from './auth/session'
import { releaseAllAudio } from './audio/synthesis'
import { studio } from './stores/studio'

const statsQuery = useStatsQuery()
provideAppContext({ statsQuery })

setUnauthorizedHandler(() => {
  clearAuth('API Token 已过期或服务端 Token 已更换。')
  releaseAllAudio()
  studio.result = null
})

watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    releaseAllAudio()
    studio.result = null
  }
})
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NMessageProvider placement="bottom-right" :max="3">
      <LoginView v-if="!isAuthenticated" />
      <AppLayout v-else />
    </NMessageProvider>
  </NConfigProvider>
</template>
