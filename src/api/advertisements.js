import request from '@/utils/request'

export const getAdvertisements = () => request({ url: '/api/settings/advertisements', method: 'get' })
export const saveAdvertisements = data => request({ url: '/api/settings/advertisements', method: 'put', data })
