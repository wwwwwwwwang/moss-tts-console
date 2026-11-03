import { createRouter, createWebHashHistory } from 'vue-router'
import OverviewView from '../views/OverviewView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'overview',
      component: OverviewView,
      meta: { title: '运行概览' },
    },
    {
      path: '/workbench',
      name: 'workbench',
      component: () => import('../views/WorkbenchView.vue'),
      meta: { title: '合成工作台' },
    },
    {
      path: '/voices',
      name: 'voices',
      component: () => import('../views/VoicesView.vue'),
      meta: { title: '音色库' },
    },
    {
      path: '/records',
      name: 'records',
      component: () => import('../views/RecordsView.vue'),
      meta: { title: '请求记录' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { title: '系统设置' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title || '控制台')} · MOSS TTS`
})

export default router
