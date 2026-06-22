import Vue from 'vue'
import Vuex from 'vuex'

import app from './modules/app'
import user from './modules/user'
import brand from './modules/brand'
import policy from './modules/policy'

// dynamic router permission control
import permission from './modules/async-router'

// static router permission control (NO filtering)
// import permission from './modules/static-router'

import getters from './getters'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    app,
    user,
    brand,
    policy,
    permission
  },
  state: {},
  mutations: {},
  actions: {},
  getters
})
