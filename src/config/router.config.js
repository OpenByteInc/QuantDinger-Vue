// eslint-disable-next-line
import { UserLayout, BasicLayout, BlankLayout } from '@/layouts'

export const asyncRouterMap = [
  {
    path: '/',
    name: 'index',
    component: BasicLayout,
    meta: { title: 'menu.home' },
    redirect: '/ai-asset-analysis',
    children: [
      // AI asset analysis landing page.
      // keepAlive: true so the heavy market-data fetches (sentiment / indices /
      // heatmap / calendar / opportunities / watchlist prices) only run on the
      // first visit. The component handles its own "data is stale" refresh in
      // `activated()`. Disabling this again will reintroduce a 1~3s cold start
      // every time the user navigates back here.
      {
        path: '/ai-asset-analysis',
        name: 'AIAssetAnalysis',
        component: () => import('@/views/ai-asset-analysis'),
        meta: { title: 'menu.dashboard.aiAssetAnalysis', keepAlive: true, icon: 'appstore', permission: ['dashboard'] }
      },
      // Unified strategy workspace entry.
      {
        path: '/strategy-center',
        name: 'StrategyCenter',
        component: () => import('@/views/strategy-center'),
        meta: { title: 'menu.dashboard.strategyCenter', keepAlive: true, icon: 'cluster', permission: ['dashboard'] }
      },
      // Indicator marketplace.
      {
        path: '/indicator-community',
        name: 'IndicatorCommunity',
        component: () => import('@/views/indicator-community'),
        meta: { title: 'menu.dashboard.community', keepAlive: false, icon: 'shop', permission: ['dashboard'] }
      },
      // Strategy IDE.
      {
        path: '/strategy-ide',
        name: 'StrategyIDE',
        component: () => import('@/views/strategy-ide'),
        meta: { title: 'menu.dashboard.strategyIde', keepAlive: true, icon: 'code', permission: ['dashboard'] }
      },
      {
        path: '/backtest-center',
        name: 'BacktestCenter',
        component: () => import('@/views/backtest-center'),
        meta: { title: 'menu.dashboard.backtestCenter', keepAlive: true, icon: 'bar-chart', permission: ['dashboard'] }
      },
      {
        path: '/indicator-ide',
        name: 'IndicatorIDE',
        component: () => import('@/views/indicator-ide'),
        meta: { title: 'menu.dashboard.indicatorIde', keepAlive: true, icon: 'line-chart', permission: ['dashboard'] }
      },
      {
        path: '/universe-manager',
        name: 'UniverseManager',
        component: () => import('@/views/universe-manager'),
        hidden: true,
        meta: { title: 'menu.dashboard.universeManager', keepAlive: true, icon: 'database', permission: ['dashboard'] }
      },
      // Broker accounts.
      {
        path: '/broker-accounts',
        name: 'BrokerAccounts',
        component: () => import('@/views/broker-accounts'),
        meta: { title: 'menu.dashboard.brokerAccounts', keepAlive: true, icon: 'bank', permission: ['dashboard'] }
      },
      // Legacy chart route.
      {
        path: '/indicator-analysis',
        name: 'Indicator',
        redirect: '/indicator-ide',
        hidden: true,
        meta: { title: 'menu.dashboard.indicator', keepAlive: false, icon: 'line-chart', permission: ['dashboard'] }
      },
      // Legacy dashboard route.
      {
        path: '/dashboard',
        name: 'Dashboard',
        redirect: '/strategy-center',
        hidden: true,
        meta: { title: 'menu.dashboard', keepAlive: false, icon: 'dashboard', permission: ['dashboard'] }
      },
      // Hidden AI analysis route.
      {
        path: '/ai-analysis/:pageNo([1-9]\\d*)?',
        name: 'Analysis',
        component: () => import('@/views/ai-analysis'),
        hidden: true,
        meta: { title: 'menu.dashboard.analysis', keepAlive: false, icon: 'thunderbolt', permission: ['dashboard'] }
      },
      // Legacy portfolio bookmarks now open the unified live workspace.
      {
        path: '/portfolio',
        name: 'Portfolio',
        redirect: '/strategy-center',
        hidden: true,
        meta: { title: 'menu.dashboard.portfolio', keepAlive: false, icon: 'fund', permission: ['dashboard'] }
      },
      // Billing.
      {
        path: '/billing',
        name: 'Billing',
        component: () => import('@/views/billing'),
        meta: { title: 'menu.billing', keepAlive: false, icon: 'wallet', permission: ['dashboard'] }
      },
      // User profile. Admin-only items follow the menu divider.
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/profile'),
        meta: { title: 'menu.myProfile', keepAlive: false, icon: 'user', permission: ['dashboard'], menuDividerAfter: true }
      },
      // User management.
      {
        path: '/user-manage',
        name: 'UserManage',
        component: () => import('@/views/user-manage'),
        meta: { title: 'menu.userManage', keepAlive: false, icon: 'team', permission: ['admin'] }
      },
      // Agent token management.
      {
        path: '/agent-tokens',
        name: 'AgentTokens',
        component: () => import('@/views/agent-tokens'),
        meta: { title: 'menu.agentTokens', keepAlive: false, icon: 'api', permission: ['admin'] }
      },
      {
        path: '/ai-skills',
        name: 'AiSkills',
        component: () => import('@/views/ai-skills'),
        meta: { title: 'menu.aiSkills', keepAlive: false, icon: 'experiment', permission: ['admin'] }
      },
      // System settings. Keep it last in the admin menu.
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/settings'),
        meta: { title: 'menu.settings', keepAlive: false, icon: 'setting', permission: ['admin'] }
      }
    ]
  },
  {
    path: '*',
    redirect: '/404',
    hidden: true
  }
]

/**
 * Base routes.
 * @type { *[] }
 */
export const constantRouterMap = [
  {
    path: '/strategy-runtime',
    hidden: true,
    redirect: to => ({
      path: '/strategy-center',
      query: to.query && to.query.strategy_id ? { strategy_id: to.query.strategy_id } : {}
    })
  },
  {
    path: '/user',
    component: UserLayout,
    redirect: '/user/login',
    hidden: true,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import(/* webpackChunkName: "user" */ '@/views/user/Login')
      }
    ]
  },

  {
    path: '/legal',
    component: () => import('@/layouts/BlankLayout'),
    hidden: true,
    redirect: '/legal/user-agreement',
    children: [
      {
        path: 'user-agreement',
        name: 'UserAgreement',
        component: () => import('@/views/legal/UserAgreement')
      },
      {
        path: 'privacy-policy',
        name: 'PrivacyPolicy',
        component: () => import('@/views/legal/PrivacyPolicy')
      }
    ]
  },
  {
    path: '/404',
    meta: { title: 'menu.exception.not-find' },
    component: () => import(/* webpackChunkName: "fail" */ '@/views/exception/404')
  }
]
