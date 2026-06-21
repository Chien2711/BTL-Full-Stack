import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Kanban from '../views/Kanban.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Admin from '../views/Admin.vue';
import Notifications from '../views/Notifications.vue';
import Projects from '../views/Projects.vue';
import Profile from '../views/Profile.vue';
import Settings from '../views/Settings.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Đăng nhập - SprintFlow' }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { title: 'Đăng ký tài khoản - SprintFlow' }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Tổng quan - SprintFlow', requiresAuth: true }
  },
  {
    path: '/kanban',
    name: 'Kanban',
    component: Kanban,
    meta: { title: 'Bảng Kanban - SprintFlow', requiresAuth: true }
  },
  {
    path: '/projects',
    name: 'Projects',
    component: Projects,
    meta: { title: 'Dự án - SprintFlow', requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: { title: 'Thông báo - SprintFlow', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { title: 'Hồ sơ cá nhân - SprintFlow', requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: 'Cài đặt - SprintFlow', requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { title: 'Quản trị hệ thống - SprintFlow', requiresAuth: true }
  },
  {
    path: '/projects-stub',
    redirect: '/projects'
  },
  {
    path: '/profile-stub',
    redirect: '/profile'
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
router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || 'SprintFlow';
  
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
