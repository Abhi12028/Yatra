import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Quasar, Notify, Loading } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './app.css'
import App from './App.vue'
import { me, loadMe } from './supabase'

const router = createRouter({
  history: createWebHashHistory(), // ponytail: hash history needs no server rewrites inside Capacitor
  routes: [
    { path: '/', component: () => import('./pages/Home.vue') },
    { path: '/map', component: () => import('./pages/Map.vue') },
    { path: '/money', component: () => import('./pages/Money.vue') },
    { path: '/games', component: () => import('./pages/Games.vue') },
    { path: '/docs', component: () => import('./pages/Docs.vue') },
    { path: '/car/:id', component: () => import('./pages/Car.vue') },
    { path: '/join', component: () => import('./pages/Join.vue') },
  ],
})

let checked = false
router.beforeEach(async (to) => {
  if (!checked) { checked = true; await loadMe() }
  if (!me.value && to.path !== '/join') return '/join'
  if (me.value && to.path === '/join') return '/'
})

createApp(App)
  .use(Quasar, { plugins: { Notify, Loading }, config: { brand: { primary: '#5A0B16', secondary: '#E8890C', positive: '#1F8A4C', negative: '#B5121B' } } })
  .use(router)
  .mount('#app')
