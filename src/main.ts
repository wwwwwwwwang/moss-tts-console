import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import './styles.css'

createApp(App)
  .use(router)
  .use(VueQueryPlugin, {
    queryClientConfig: {
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: true,
        },
      },
    },
  })
  .mount('#app')
