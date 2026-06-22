export const CRYPTO_SIGNUP_CARDS = [
  {
    id: 'binance',
    name: 'Binance',
    short: 'BN',
    brandBg: 'rgba(243, 186, 47, 0.16)',
    brandColor: '#f0b90b',
    signupUrl: 'https://www.bsmkweb.cc/register?ref=QUANTDINGER'
  },
  {
    id: 'bitget',
    name: 'Bitget',
    short: 'BG',
    brandBg: 'rgba(0, 193, 255, 0.14)',
    brandColor: '#00c1ff',
    signupUrl: 'https://partner.hdmune.cn/bg/7r4xz8kd'
  },
  {
    id: 'bybit',
    name: 'Bybit',
    short: 'BY',
    brandBg: 'rgba(247, 166, 0, 0.14)',
    brandColor: '#f7a600',
    signupUrl: 'https://partner.bybit.com/b/DINGER'
  },
  {
    id: 'okx',
    name: 'OKX',
    short: 'OK',
    brandBg: 'rgba(17, 24, 39, 0.08)',
    brandColor: '#111827',
    signupUrl: 'https://www.xqmnobxky.com/join/QUANTDINGER'
  },
  {
    id: 'gate',
    name: 'Gate.io',
    short: 'GT',
    brandBg: 'rgba(42, 93, 255, 0.12)',
    brandColor: '#2a5dff',
    signupUrl: 'https://www.gateport.business/share/DINGER'
  },
  {
    id: 'htx',
    name: 'HTX',
    short: 'HX',
    brandBg: 'rgba(22, 119, 255, 0.12)',
    brandColor: '#1677ff',
    signupUrl: 'https://www.htx.com/invite/zh-cn/1f?invite_code=dinger'
  }
]

export const FOREX_SIGNUP_CARDS = [
  {
    id: 'tmgm',
    name: 'TMGM',
    subtitle: 'MetaTrader 5',
    short: 'TG',
    brandBg: 'rgba(0, 82, 155, 0.12)',
    brandColor: '#0052a3',
    signupUrl: 'https://portal.tmgm.com/register?node=MTM0Mzc5&language=en',
    tags: ['Forex', 'CFD', 'MT5']
  }
]

/** @deprecated Use CRYPTO_SIGNUP_CARDS + FOREX_SIGNUP_CARDS */
export const EXCHANGE_SIGNUP_CARDS = [...CRYPTO_SIGNUP_CARDS, ...FOREX_SIGNUP_CARDS]
