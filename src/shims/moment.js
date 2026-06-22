//
//   import { isMoment } from 'moment'        -> named export

import moment from 'moment/moment.js'

export default moment

export const version = moment.version
export const fn = moment.fn

export const utc = moment.utc.bind(moment)
export const unix = moment.unix.bind(moment)
export const parseZone = moment.parseZone.bind(moment)
export const invalid = moment.invalid.bind(moment)
export const duration = moment.duration.bind(moment)

export const isMoment = moment.isMoment
export const isDate = moment.isDate
export const isDuration = moment.isDuration

export const locale = moment.locale.bind(moment)
export const localeData = moment.localeData.bind(moment)
export const locales = moment.locales.bind(moment)
export const defineLocale = moment.defineLocale.bind(moment)
export const updateLocale = moment.updateLocale.bind(moment)
export const months = moment.months.bind(moment)
export const monthsShort = moment.monthsShort.bind(moment)
export const weekdays = moment.weekdays.bind(moment)
export const weekdaysMin = moment.weekdaysMin.bind(moment)
export const weekdaysShort = moment.weekdaysShort.bind(moment)
export const normalizeUnits = moment.normalizeUnits
export const relativeTimeRounding = moment.relativeTimeRounding
export const relativeTimeThreshold = moment.relativeTimeThreshold
export const calendarFormat = moment.calendarFormat
export const ISO_8601 = moment.ISO_8601
export const RFC_2822 = moment.RFC_2822

export const min = moment.min
export const max = moment.max
export const now = moment.now
