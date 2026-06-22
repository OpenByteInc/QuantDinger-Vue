import { constantRouterMap } from '@/config/router.config'
import { generatorDynamicRouter } from '@/router/generator-routers'

const permission = {
  state: {
    routers: constantRouterMap,
    addRouters: []
  },
  mutations: {
    SET_ROUTERS: (state, routers) => {
      state.addRouters = routers
      state.routers = constantRouterMap.concat(routers)
    },
    // Reset routers to force regeneration (used on login/logout)
    RESET_ROUTERS: (state) => {
      state.addRouters = []
      state.routers = constantRouterMap
    }
  },
  actions: {
    GenerateRoutes ({ commit, rootState }, data) {
      return new Promise((resolve, reject) => {
        const { token } = data
        generatorDynamicRouter(token).then(routers => {
          commit('SET_ROUTERS', routers)
          resolve()
        }).catch(e => {
          reject(e)
        })
      })
    },
    // Reset routes action
    ResetRoutes ({ commit }) {
      commit('RESET_ROUTERS')
    }
  }
}

export default permission
