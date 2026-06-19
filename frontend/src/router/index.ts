import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Kanban from '../views/Kanban.vue';
import Stub from '../views/Stub.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Admin from '../views/Admin.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Đăng nhập - ProjectHub' }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { title: 'Đăng ký tài khoản - ProjectHub' }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Dashboard - ProjectHub', requiresAuth: true }
  },
  {
    path: '/kanban',
    name: 'Kanban',
    component: Kanban,
    meta: { title: 'Bảng Kanban - ProjectHub', requiresAuth: true }
  },
  {
    path: '/projects-stub',
    name: 'ProjectsStub',
    component: Stub,
    meta: { title: 'Dự án - ProjectHub', requiresAuth: true }
  },
  {
    path: '/alerts-stub',
    name: 'AlertsStub',
    component: Stub,
    meta: { title: 'Thông báo - ProjectHub', requiresAuth: true }
  },
  {
    path: '/profile-stub',
    name: 'ProfileStub',
    component: Stub,
    meta: { title: 'Hồ sơ cá nhân - ProjectHub', requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { title: 'Quản trị hệ thống - ProjectHub', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Update page title and check authentication on navigation
router.beforeEach((to, from, next) => {
  document.title = (to.meta.title as string) || 'ProjectHub';
  
  const token = localStorage.getItem('token');
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  if (requiresAuth && !token) {
    next('/login');
  } else if ((to.path === '/login' || to.path === '/register') && token) {
    next('/');
  } else {
    next();
  }
});

export default router;
