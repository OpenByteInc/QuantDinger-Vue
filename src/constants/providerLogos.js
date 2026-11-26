import forthrightLogo from '@/assets/provider-logos/forthright.jpg'
import alpacaLogo from '@/assets/provider-logos/alpaca.png'
import interactiveBrokersLogo from '@/assets/provider-logos/interactive-brokers.png'
import binanceLogo from '@/assets/provider-logos/binance.svg'
import okxLogo from '@/assets/provider-logos/okx.ico'
import bybitLogo from '@/assets/provider-logos/bybit.ico'
import bitgetLogo from '@/assets/provider-logos/bitget.svg'
import gateLogo from '@/assets/provider-logos/gate.svg'
import htxLogo from '@/assets/provider-logos/htx.ico'
import tigerLogo from '@/assets/provider-logos/tiger-official.png'
import webullLogo from '@/assets/provider-logos/webull.ico'

export const PROVIDER_LOGOS = Object.freeze({
  forthright: forthrightLogo,
  alpaca: alpacaLogo,
  ibkr: interactiveBrokersLogo,
  binance: binanceLogo,
  okx: okxLogo,
  bybit: bybitLogo,
  bitget: bitgetLogo,
  gate: gateLogo,
  htx: htxLogo,
  tiger: tigerLogo,
  webull: webullLogo
})

export function getProviderLogo (provider) {
  return PROVIDER_LOGOS[String(provider || '').trim().toLowerCase()] || ''
}
