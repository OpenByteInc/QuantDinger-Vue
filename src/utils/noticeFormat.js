/**
 * Render in-app notifications from payload.display (locale-aware) with legacy fallbacks.
 */

function stripHtml (input) {
  if (!input) return ''
  return String(input)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function parseLegacyLoginNickname (item) {
  const msg = stripHtml((item && item.message) || '')
  const zh = msg.match(/账号\s+(\S+)\s+于/)
  if (zh) return zh[1]
  const en = msg.match(/Account\s+(\S+)\s+signed/i)
  if (en) return en[1]
  return '—'
}

function displayOf (item) {
  const p = item && item.payload
  if (p && p.display) return p.display

  const st = (item && item.signal_type) || ''
  if (st === 'profile_test' || (p && p.event === 'qd.profile_test')) {
    return { template: 'profile.test', params: {} }
  }
  if (st === 'security_login' || (p && p.event === 'security.login')) {
    let reasonKey = 'unknown'
    if (p && p.is_new_device && p.is_new_region) reasonKey = 'both'
    else if (p && p.is_new_device) reasonKey = 'newDevice'
    else if (p && p.is_new_region) reasonKey = 'newRegion'
    else if ((item.title || '').includes('新设备') && (item.title || '').includes('新地区')) reasonKey = 'both'
    else if ((item.title || '').includes('新设备') || (item.title || '').includes('New device')) reasonKey = 'newDevice'
    else if ((item.title || '').includes('新地区') || (item.title || '').includes('New region')) reasonKey = 'newRegion'

    const det = (p && p.details) || {}
    return {
      template: 'security.login',
      params: {
        nickname: (p && (p.nickname || det.nickname)) || parseLegacyLoginNickname(item),
        action: (p && p.action) || det.action || '',
        provider: det.provider || (p && p.provider) || '',
        device: (p && p.device) || det.device_label || '',
        location: (p && p.location) || det.location || '',
        ip: (p && (p.ip || p.ip_address)) || '—',
        reasonKey
      }
    }
  }
  if (p && p.event === 'qd.signal') {
    const strategy = p.strategy || {}
    const instrument = p.instrument || {}
    const sig = p.signal || {}
    const order = p.order || {}
    const trace = p.trace || {}
    return {
      template: 'signal.trade',
      params: {
        strategyName: strategy.name || '',
        strategyId: strategy.id || 0,
        symbol: instrument.symbol || item.symbol || '',
        signalType: sig.type || st || '',
        action: (sig.action || '').toUpperCase(),
        side: (sig.side || '').toUpperCase(),
        price: order.ref_price != null ? String(order.ref_price) : '',
        stake: order.stake_amount != null ? String(order.stake_amount) : '',
        pendingOrderId: trace.pending_order_id || '',
        mode: trace.mode || '',
        timestampDisplay: p.timestamp_display || '',
        timeLabel: p.time_label || ''
      }
    }
  }
  return null
}

function loginReasonLabel (reasonKey, t) {
  const key = reasonKey || 'unknown'
  const map = {
    newDevice: 'notice.event.login.reason.newDevice',
    newRegion: 'notice.event.login.reason.newRegion',
    both: 'notice.event.login.reason.both',
    unknown: 'notice.event.login.reason.unknown'
  }
  return t(map[key] || map.unknown)
}

function loginMethodLabel (params, t) {
  const action = (params.action || '').trim()
  const provider = (params.provider || 'OAuth').trim()
  if (action === 'login_via_code') {
    return t('notice.event.login.method.code')
  }
  if (action === 'oauth_login') {
    return t('notice.event.login.method.oauth', { provider })
  }
  return t('notice.event.login.method.password')
}

function renderFromDisplay (item, t, { html = false } = {}) {
  const d = displayOf(item)
  if (!d || !d.template) return null
  const p = d.params || {}
  const template = d.template

  if (template === 'security.login') {
    const reason = loginReasonLabel(p.reasonKey, t)
    const title = t('notice.event.login.title', { reason })
    const lines = [
      t('notice.event.login.line.account', { name: p.nickname || '—' }),
      t('notice.event.login.line.method', { method: loginMethodLabel(p, t) }),
      t('notice.event.login.line.device', { device: p.device || '—' }),
      t('notice.event.login.line.location', { location: p.location || '—' }),
      t('notice.event.login.line.ip', { ip: p.ip || '—' }),
      t('notice.event.login.footer')
    ]
    const message = html ? lines.map(l => escapeHtml(l)).join('<br>') : lines.join('\n')
    return { title, message }
  }

  if (template === 'profile.test') {
    const title = t('notice.event.profileTest.title')
    const body = t('notice.event.profileTest.body')
    return {
      title,
      message: html ? escapeHtml(body) : body
    }
  }

  if (template === 'signal.trade') {
    const action = String(p.action || '').trim().toUpperCase()
    const side = String(p.side || '').trim().toUpperCase()
    const title = t('notice.event.signal.title', {
      symbol: p.symbol || '—',
      action: action || '—',
      side: side || ''
    }).replace(/\s+/g, ' ').trim()
    const lines = [
      t('notice.event.signal.line.strategy', {
        name: p.strategyName || '—',
        id: p.strategyId || 0
      }),
      t('notice.event.signal.line.symbol', { symbol: p.symbol || '—' }),
      t('notice.event.signal.line.signal', { signal: p.signalType || '—' })
    ]
    if (p.price) {
      lines.push(t('notice.event.signal.line.price', { price: p.price }))
    }
    if (p.stake) {
      lines.push(t('notice.event.signal.line.stake', { stake: p.stake }))
    }
    if (p.pendingOrderId) {
      lines.push(t('notice.event.signal.line.pending', { id: p.pendingOrderId }))
    }
    if (p.mode) {
      lines.push(t('notice.event.signal.line.mode', { mode: p.mode }))
    }
    if (p.timestampDisplay) {
      lines.push(t('notice.event.signal.line.time', {
        label: p.timeLabel || t('notice.event.signal.timeLabel'),
        time: p.timestampDisplay
      }))
    }
    const message = html ? lines.map(l => escapeHtml(l)).join('<br>') : lines.join('\n')
    return { title, message }
  }

  return null
}

function escapeHtml (text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function noticeTitle (item, t) {
  const rendered = renderFromDisplay(item, t)
  if (rendered && rendered.title) return rendered.title
  return (item && item.title) || ''
}

export function noticeMessage (item, t, { html = false } = {}) {
  const rendered = renderFromDisplay(item, t, { html })
  if (rendered && rendered.message) return rendered.message
  const raw = (item && item.message) || ''
  if (html) {
    if (raw.includes('<div class="qd-report">') || raw.includes('<style>')) {
      return raw
    }
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      return raw
    }
    return escapeHtml(raw).replace(/\n/g, '<br>')
  }
  return stripHtml(raw)
}

export function noticePreview (item, t, maxLen = 80) {
  const text = noticeMessage(item, t, { html: false })
  if (!text) return ''
  const oneLine = text.replace(/\s*\n+\s*/g, ' · ')
  return oneLine.length > maxLen ? `${oneLine.substring(0, maxLen)}...` : oneLine
}

export function noticeMessageHtml (item, t) {
  const raw = (item && item.message) || ''
  if (raw.includes('<div class="qd-report">') || raw.includes('<style>')) {
    return raw
  }
  const rendered = renderFromDisplay(item, t, { html: true })
  if (rendered && rendered.message) {
    return rendered.message
  }
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return raw
  }
  return escapeHtml(stripHtml(raw)).replace(/\n/g, '<br>')
}

export function noticeTypeLabel (signalType, t) {
  const map = {
    ai_monitor: 'notice.type.aiMonitor',
    price_alert: 'notice.type.priceAlert',
    signal: 'notice.type.signal',
    buy: 'notice.type.buy',
    sell: 'notice.type.sell',
    hold: 'notice.type.hold',
    trade: 'notice.type.trade',
    security_login: 'notice.type.securityLogin',
    profile_test: 'notice.type.profileTest'
  }
  return t(map[signalType] || 'notice.type.notification')
}
