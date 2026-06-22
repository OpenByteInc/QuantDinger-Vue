import request from '@/utils/request'

const marketApi = {
  // Watchlist
  GetWatchlist: '/api/market/watchlist/get',
  AddWatchlist: '/api/market/watchlist/add',
  RemoveWatchlist: '/api/market/watchlist/remove',
  GetWatchlistPrices: '/api/market/watchlist/prices',
  // AI chat (optional)
  ChatMessage: '/api/ai/chat/message',
  ExportChatReportPdf: '/api/ai/chat/report/pdf',
  GetChatHistory: '/api/ai/chat/history',
  GetChatSessions: '/api/ai/chat/sessions',
  DeleteChatSession: '/api/ai/chat/sessions',
  SaveChatHistory: '/api/ai/chat/history/save',
  SaveCopilotMessage: '/api/ai/chat/message/local',
  AgentPreflight: '/api/ai/agent/preflight',
  AgentIntent: '/api/ai/agent/intent',
  AiSkills: '/api/ai/skills',
  AiTools: '/api/ai/tools',
  UserMemory: '/api/ai/memory',
  // Public config
  GetConfig: '/api/market/config',
  GetMenuFooterConfig: '/api/market/menuFooterConfig',
  // Market metadata
  GetMarketTypes: '/api/market/types',
  // Symbol search
  SearchSymbols: '/api/market/symbols/search',
  GetHotSymbols: '/api/market/symbols/hot'
}

export function getWatchlist (parameter) {
  return request({
    url: marketApi.GetWatchlist,
    method: 'get',
    params: parameter
  })
}

export function addWatchlist (parameter) {
  return request({
    url: marketApi.AddWatchlist,
    method: 'post',
    data: parameter
  })
}

export function removeWatchlist (parameter) {
  return request({
    url: marketApi.RemoveWatchlist,
    method: 'post',
    data: parameter
  })
}

export function getWatchlistPrices (parameter) {
  return request({
    url: marketApi.GetWatchlistPrices,
    method: 'get',
    params: {
      watchlist: JSON.stringify(parameter.watchlist || [])
    }
  })
}

export function chatMessage (parameter) {
  return request({
    url: marketApi.ChatMessage,
    method: 'post',
    data: parameter
  })
}

export function exportChatReportPdf (parameter) {
  return request({
    url: marketApi.ExportChatReportPdf,
    method: 'post',
    data: parameter,
    responseType: 'blob',
    timeout: 120000
  })
}

export function getChatHistory (parameter) {
  return request({
    url: marketApi.GetChatHistory,
    method: 'get',
    params: parameter
  })
}

export function getChatSessions (parameter) {
  return request({
    url: marketApi.GetChatSessions,
    method: 'get',
    params: parameter
  })
}

export function deleteChatSession (sessionId) {
  return request({
    url: `${marketApi.DeleteChatSession}/${sessionId}`,
    method: 'delete'
  })
}

export function saveChatHistory (parameter) {
  return request({
    url: marketApi.SaveChatHistory,
    method: 'post',
    data: parameter
  })
}

export function saveCopilotMessage (parameter) {
  return request({
    url: marketApi.SaveCopilotMessage,
    method: 'post',
    data: parameter
  })
}

export function getAgentPreflight () {
  return request({
    url: marketApi.AgentPreflight,
    method: 'get'
  })
}

export function classifyAgentIntent (parameter) {
  return request({
    url: marketApi.AgentIntent,
    method: 'post',
    data: parameter
  })
}

export function getAiSkills (parameter) {
  return request({
    url: marketApi.AiSkills,
    method: 'get',
    params: parameter
  })
}

export function getAiSkillPrompt (skillId, parameter) {
  return request({
    url: `${marketApi.AiSkills}/${skillId}/prompt`,
    method: 'post',
    data: parameter
  })
}

export function getAiTools (parameter) {
  return request({
    url: marketApi.AiTools,
    method: 'get',
    params: parameter
  })
}

export function installAiSkill (parameter) {
  return request({
    url: `${marketApi.AiSkills}/install`,
    method: 'post',
    data: parameter
  })
}

export function updateAiSkill (skillId, parameter) {
  return request({
    url: `${marketApi.AiSkills}/${skillId}`,
    method: 'patch',
    data: parameter
  })
}

export function deleteAiSkill (skillId) {
  return request({
    url: `${marketApi.AiSkills}/${skillId}`,
    method: 'delete'
  })
}

export function getUserMemory () {
  return request({
    url: marketApi.UserMemory,
    method: 'get'
  })
}

export function saveUserMemory (parameter) {
  return request({
    url: marketApi.UserMemory,
    method: 'post',
    data: parameter
  })
}

export function deleteUserMemory (memoryId) {
  return request({
    url: `${marketApi.UserMemory}/${memoryId}`,
    method: 'delete'
  })
}

export function getConfig () {
  return request({
    url: marketApi.GetConfig,
    method: 'get'
  })
}

export function getMenuFooterConfig () {
  return request({
    url: marketApi.GetMenuFooterConfig,
    method: 'get'
  })
}

export function getMarketTypes () {
  return request({
    url: marketApi.GetMarketTypes,
    method: 'get'
  })
}

export function searchSymbols (parameter) {
  return request({
    url: marketApi.SearchSymbols,
    method: 'get',
    params: parameter
  })
}

export function getHotSymbols (parameter) {
  return request({
    url: marketApi.GetHotSymbols,
    method: 'get',
    params: parameter
  })
}
