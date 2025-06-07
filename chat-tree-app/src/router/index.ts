import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/chats'
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/chats',
      name: 'ChatList',
      component: () => import('@/views/ChatListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/chats/:chatUuid',
      name: 'Chat',
      component: () => import('@/views/ChatView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/templates',
      name: 'Templates',
      component: () => import('@/views/TemplatesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/presets',
      name: 'Presets',
      component: () => import('@/views/PresetsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/analytics',
      name: 'Analytics',
      component: () => import('@/views/AnalyticsView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  // Development mode: skip authentication for now
  if (import.meta.env.DEV) {
    console.log('Development mode: skipping authentication')
    next()
    return
  }

  const authStore = useAuthStore()
  
  // Initialize auth from storage if not already done
  if (!authStore.user && localStorage.getItem('access_token')) {
    await authStore.initializeFromStorage()
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const isAuthenticated = authStore.isAuthenticated

  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (!requiresAuth && isAuthenticated && (to.name === 'Login' || to.name === 'Register')) {
    next('/chats')
  } else {
    next()
  }
})

export default router