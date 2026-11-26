export const AD_POSITIONS = ['sidebar', 'accounts']

export function isAdvertisementUrl (value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\s\\]/.test(value) || Array.from(value).some(char => char.charCodeAt(0) < 32)) return false
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password
  } catch (_) { return false }
}

export function activeAdvertisements (items, position) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && item.enabled === true && item.position === position && isAdvertisementUrl(item.image_url) && isAdvertisementUrl(item.target_url))
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
}

export function validAdvertisement (item) {
  return !!(item && typeof item.name === 'string' && item.name.trim() && item.name.length <= 80 &&
    AD_POSITIONS.includes(item.position) && Number.isInteger(item.sort_order) && item.sort_order >= 0 && item.sort_order <= 9999 &&
    typeof item.enabled === 'boolean' && isAdvertisementUrl(item.image_url) && isAdvertisementUrl(item.target_url))
}

export function showSidebarAdvertisement (items) {
  return activeAdvertisements(items, 'sidebar').length > 0
}
