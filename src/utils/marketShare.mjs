const PLATFORM_URLS = {
  x: 'https://twitter.com/intent/tweet',
  linkedin: 'https://www.linkedin.com/sharing/share-offsite/',
  reddit: 'https://www.reddit.com/submit',
  medium: 'https://medium.com/new-story',
  substack: 'https://substack.com/home'
}

export function buildListingShareUrl ({ locationHref, listingId, assetType }) {
  const url = new URL(locationHref)
  if (url.hash.startsWith('#/')) {
    const route = new URL(url.hash.slice(1), url.origin)
    route.searchParams.set('listing', String(listingId))
    if (assetType) route.searchParams.set('asset_type', String(assetType))
    url.hash = `#${route.pathname}${route.search}`
    return url.toString()
  }
  url.searchParams.set('listing', String(listingId))
  if (assetType) url.searchParams.set('asset_type', String(assetType))
  return url.toString()
}

export function buildPlatformShareUrl (platform, { title = '', text = '', url = '' } = {}) {
  const target = PLATFORM_URLS[platform]
  if (!target) return ''

  const shareUrl = new URL(target)
  if (platform === 'x') {
    const postText = url && text.includes(url) ? text : [text, url].filter(Boolean).join('\n\n')
    shareUrl.searchParams.set('text', postText)
  } else if (platform === 'linkedin') {
    shareUrl.searchParams.set('url', url)
  } else if (platform === 'reddit') {
    shareUrl.searchParams.set('url', url)
    shareUrl.searchParams.set('title', title)
  }
  return shareUrl.toString()
}

export function safeShareFilename (value, suffix = 'share') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${normalized || 'quantdinger'}-${suffix}.png`
}
