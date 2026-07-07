const STYLE_ID = 'qd-runtime-theme-color'

function normalizeColor (color) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#1890ff'
}

function hexToRgb (hex) {
  const value = normalizeColor(hex).slice(1)
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  }
}

function mix (color, target, weight) {
  const a = hexToRgb(color)
  const b = hexToRgb(target)
  const ratio = Math.max(0, Math.min(1, weight))
  const next = [a.r, a.g, a.b].map((channel, index) => {
    const targetChannel = [b.r, b.g, b.b][index]
    return Math.round(channel * (1 - ratio) + targetChannel * ratio)
      .toString(16)
      .padStart(2, '0')
  })
  return `#${next.join('')}`
}

function rgba (color, alpha) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getStyleElement () {
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  return style
}

function buildThemeCss (primaryColor) {
  const color = normalizeColor(primaryColor)
  const hover = mix(color, '#ffffff', 0.22)
  const active = mix(color, '#000000', 0.12)
  const soft = rgba(color, 0.1)
  const softStrong = rgba(color, 0.18)
  const ring = rgba(color, 0.22)

  return `
:root {
  --primary-color: ${color};
  --primary-color-hover: ${hover};
  --primary-color-active: ${active};
  --primary-color-soft: ${soft};
  --primary-color-soft-strong: ${softStrong};
  --primary-color-ring: ${ring};
}

.ant-btn-link,
.ant-tabs-nav .ant-tabs-tab-active,
.ant-tabs-nav .ant-tabs-tab:hover,
.ant-tabs-tab-active,
.ant-tabs-tab:hover,
.ant-menu-item-selected > a,
.ant-menu-item-selected > span,
.ant-menu-item-selected .anticon,
.ant-menu-item-selected .ant-menu-title-content,
.ant-menu-submenu-selected,
.ant-menu-submenu-selected .anticon,
.ant-menu-submenu-selected .ant-menu-title-content,
.ant-menu-horizontal > .ant-menu-item:hover,
.ant-menu-horizontal > .ant-menu-item-active,
.ant-menu-horizontal > .ant-menu-item-selected,
.ant-menu-horizontal > .ant-menu-submenu:hover,
.ant-menu-horizontal > .ant-menu-submenu-active,
.ant-menu-horizontal > .ant-menu-submenu-selected,
.ant-menu-horizontal > .ant-menu-item:hover > a,
.ant-menu-horizontal > .ant-menu-item-active > a,
.ant-menu-horizontal > .ant-menu-item-selected > a,
.ant-menu-horizontal > .ant-menu-item-selected > a > span,
.ant-menu-horizontal > .ant-menu-item-selected > span,
.ant-menu-horizontal > .ant-menu-item-selected .anticon,
.ant-menu-horizontal > .ant-menu-item-selected .ant-menu-title-content,
.ant-menu-horizontal > .ant-menu-submenu:hover > .ant-menu-submenu-title,
.ant-menu-horizontal > .ant-menu-submenu-active > .ant-menu-submenu-title,
.ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title,
.ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title > span,
.ant-menu-horizontal > .ant-menu-submenu:hover > .ant-menu-submenu-title .anticon,
.ant-menu-horizontal > .ant-menu-submenu-active > .ant-menu-submenu-title .anticon,
.ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon,
.ant-menu-horizontal > .ant-menu-submenu-selected .ant-menu-title-content,
body.dark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected > a,
body.dark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected > a > span,
body.dark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected > span,
body.dark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected .ant-menu-title-content,
body.dark .ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title,
body.dark .ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title > span,
body.dark .ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-selected .ant-menu-title-content,
body.realdark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected > a,
body.realdark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected > a > span,
body.realdark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected > span,
body.realdark .ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected .ant-menu-title-content,
body.realdark .ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title,
body.realdark .ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title > span,
body.realdark .ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-selected .ant-menu-title-content,
.basic-layout-wrapper.dark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected,
.basic-layout-wrapper.dark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected > a,
.basic-layout-wrapper.dark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected > a > span,
.basic-layout-wrapper.dark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected > span,
.basic-layout-wrapper.dark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-submenu-selected,
.basic-layout-wrapper.dark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title,
.basic-layout-wrapper.dark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title > span,
.basic-layout-wrapper.realdark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected,
.basic-layout-wrapper.realdark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected > a,
.basic-layout-wrapper.realdark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected > a > span,
.basic-layout-wrapper.realdark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-item-selected > span,
.basic-layout-wrapper.realdark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-submenu-selected,
.basic-layout-wrapper.realdark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title,
.basic-layout-wrapper.realdark .ant-pro-top-nav-header .ant-menu-horizontal > .ant-menu-submenu-selected > .ant-menu-submenu-title > span,
.ant-menu-light .ant-menu-item:hover,
.ant-menu-light .ant-menu-item-active,
.ant-menu-light .ant-menu-item-selected,
.ant-menu-light .ant-menu-item:hover > a,
.ant-menu-light .ant-menu-item-active > a,
.ant-menu-light .ant-menu-item-selected > a,
.ant-menu-light .ant-menu-item:hover .anticon,
.ant-menu-light .ant-menu-item-active .anticon,
.ant-menu-light .ant-menu-item-selected .anticon,
.ant-menu-light .ant-menu-item:hover .ant-menu-title-content,
.ant-menu-light .ant-menu-item-active .ant-menu-title-content,
.ant-menu-light .ant-menu-item-selected .ant-menu-title-content,
.ant-menu-light .ant-menu-submenu-title:hover,
.ant-menu-light .ant-menu-submenu-active > .ant-menu-submenu-title,
.ant-menu-light .ant-menu-submenu-selected > .ant-menu-submenu-title,
.ant-menu-light .ant-menu-submenu-title:hover .anticon,
.ant-menu-light .ant-menu-submenu-active > .ant-menu-submenu-title .anticon,
.ant-menu-light .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon,
.ant-dropdown-menu-item:hover,
.ant-dropdown-menu-item-active,
.ant-dropdown-menu-item-selected,
.ant-dropdown-menu-submenu-title:hover,
.ant-dropdown-menu-submenu-title-selected,
.ant-menu-submenu-popup .ant-menu-item:hover,
.ant-menu-submenu-popup .ant-menu-item-active,
.ant-menu-submenu-popup .ant-menu-item-selected,
.ant-menu-submenu-popup .ant-menu-item:hover > a,
.ant-menu-submenu-popup .ant-menu-item-active > a,
.ant-menu-submenu-popup .ant-menu-item-selected > a,
.ant-menu-submenu-popup .ant-menu-item:hover .anticon,
.ant-menu-submenu-popup .ant-menu-item-active .anticon,
.ant-menu-submenu-popup .ant-menu-item-selected .anticon,
.ant-menu-submenu-popup .ant-menu-item:hover .ant-menu-title-content,
.ant-menu-submenu-popup .ant-menu-item-active .ant-menu-title-content,
.ant-menu-submenu-popup .ant-menu-item-selected .ant-menu-title-content,
.ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-disabled),
.ant-select-dropdown-menu-item-selected,
.ant-radio-button-wrapper:hover,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled),
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):first-child,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):focus-within,
.ant-pagination-item:hover a,
.ant-pagination-item-active a,
.ant-pagination-prev:hover .ant-pagination-item-link,
.ant-pagination-next:hover .ant-pagination-item-link,
.ant-breadcrumb a:hover {
  color: ${color} !important;
}

.ant-btn-primary,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled),
.ant-switch-checked,
.ant-checkbox-checked .ant-checkbox-inner,
.ant-radio-checked .ant-radio-inner::after,
.ant-menu:not(.ant-menu-horizontal) .ant-menu-item-selected,
.ant-menu-dark:not(.ant-menu-horizontal) .ant-menu-item-selected,
.ant-menu-dark:not(.ant-menu-horizontal) .ant-menu-item-active,
.ant-tag-checkable-checked,
.ant-slider-track,
.ant-slider-handle,
.ant-tabs-ink-bar,
.ant-tabs-nav .ant-tabs-ink-bar,
.ant-menu-horizontal > .ant-menu-item-selected::after,
.ant-menu-horizontal > .ant-menu-submenu-selected::after,
.ant-menu-horizontal > .ant-menu-item-active::after,
.ant-menu-horizontal > .ant-menu-submenu-active::after,
.ant-menu-horizontal > .ant-menu-item:hover::after,
.ant-menu-horizontal > .ant-menu-submenu:hover::after,
.ant-progress-bg,
.ant-badge-status-processing::after {
  background-color: ${color} !important;
}

.ant-btn-primary,
.ant-btn-primary:hover,
.ant-btn-primary:focus,
.ant-checkbox-checked .ant-checkbox-inner,
.ant-checkbox-wrapper:hover .ant-checkbox-inner,
.ant-checkbox:hover .ant-checkbox-inner,
.ant-radio-checked .ant-radio-inner,
.ant-input:hover,
.ant-input:focus,
.ant-input-affix-wrapper:hover,
.ant-select-focused .ant-select-selection,
.ant-select-selection:hover,
.ant-pagination-item-active,
.ant-pagination-item:hover,
.ant-pagination-prev:hover .ant-pagination-item-link,
.ant-pagination-next:hover .ant-pagination-item-link,
.ant-slider-handle,
.ant-tabs-ink-bar,
.ant-radio-button-wrapper:hover,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled),
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):first-child,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover,
.ant-menu-horizontal > .ant-menu-item-selected,
.ant-menu-horizontal > .ant-menu-submenu-selected,
.ant-menu-horizontal > .ant-menu-item-active,
.ant-menu-horizontal > .ant-menu-submenu-active,
.ant-menu-horizontal > .ant-menu-item:hover,
.ant-menu-horizontal > .ant-menu-submenu:hover {
  border-color: ${color} !important;
}

.ant-tabs-ink-bar,
.ant-tabs-nav .ant-tabs-ink-bar {
  background: ${color} !important;
  background-color: ${color} !important;
}

.ant-btn-primary:hover,
.ant-btn-primary:focus {
  background-color: ${hover} !important;
  border-color: ${hover} !important;
}

.ant-btn-primary:active {
  background-color: ${active} !important;
  border-color: ${active} !important;
}

.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)::before,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover::before,
.ant-radio-button-wrapper:hover::before,
.ant-radio-button-wrapper:focus-within::before {
  background-color: ${color} !important;
}

.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
  box-shadow: -1px 0 0 0 ${color} !important;
  color: #fff !important;
}

.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) > span,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover > span,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):focus-within > span {
  color: #fff !important;
}

.ant-input:focus,
.ant-select-focused .ant-select-selection,
.ant-pagination-item-active,
.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):focus-within,
.ant-slider-handle {
  box-shadow: 0 0 0 2px ${ring} !important;
}

.ant-menu-horizontal > .ant-menu-item-selected,
.ant-menu-horizontal > .ant-menu-submenu-selected,
.ant-menu-horizontal > .ant-menu-item:hover,
.ant-menu-horizontal > .ant-menu-item-active,
.ant-menu-horizontal > .ant-menu-submenu:hover,
.ant-menu-horizontal > .ant-menu-submenu-active {
  color: ${color} !important;
  border-bottom-color: ${color} !important;
}

.ant-menu-horizontal > .ant-menu-item-selected::after,
.ant-menu-horizontal > .ant-menu-submenu-selected::after,
.ant-menu-horizontal > .ant-menu-item-active::after,
.ant-menu-horizontal > .ant-menu-submenu-active::after,
.ant-menu-horizontal > .ant-menu-item:hover::after,
.ant-menu-horizontal > .ant-menu-submenu:hover::after {
  border-bottom-color: ${color} !important;
  background: ${color} !important;
}

.ant-layout-header .ant-menu-horizontal > .ant-menu-item,
.ant-layout-header .ant-menu-horizontal > .ant-menu-submenu,
.ant-layout-header .ant-menu-horizontal > .ant-menu-item-selected,
.ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-selected,
.ant-layout-header .ant-menu-horizontal > .ant-menu-item:hover,
.ant-layout-header .ant-menu-horizontal > .ant-menu-item-active,
.ant-layout-header .ant-menu-horizontal > .ant-menu-submenu:hover,
.ant-layout-header .ant-menu-horizontal > .ant-menu-submenu-active,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-item,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-submenu,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-item-selected,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-submenu-selected,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-item:hover,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-item-active,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-submenu:hover,
.ant-menu-horizontal.ant-menu-dark > .ant-menu-submenu-active {
  background: transparent !important;
  background-color: transparent !important;
}

.ant-menu-light .ant-menu-item-selected,
.ant-menu-light .ant-menu-submenu-selected,
.ant-menu-light .ant-menu-item:hover,
.ant-menu-light .ant-menu-item-active,
.ant-menu-light .ant-menu-item:hover > a,
.ant-menu-light .ant-menu-item-active > a,
.ant-menu-light .ant-menu-item:hover .anticon,
.ant-menu-light .ant-menu-item-active .anticon,
.ant-menu-light .ant-menu-item:hover .ant-menu-title-content,
.ant-menu-light .ant-menu-item-active .ant-menu-title-content,
.ant-menu-light .ant-menu-submenu-title:hover,
.ant-menu-light .ant-menu-submenu-active > .ant-menu-submenu-title,
.ant-menu-light .ant-menu-submenu-title:hover .anticon,
.ant-menu-light .ant-menu-submenu-active > .ant-menu-submenu-title .anticon {
  color: ${color} !important;
}

.ant-menu-light:not(.ant-menu-horizontal) .ant-menu-item-selected {
  background: ${soft} !important;
}

.ant-menu-light:not(.ant-menu-horizontal) .ant-menu-item:hover,
.ant-menu-light:not(.ant-menu-horizontal) .ant-menu-item-active,
.ant-dropdown-menu-item:hover,
.ant-dropdown-menu-item-active,
.ant-dropdown-menu-item-selected,
.ant-dropdown-menu-submenu-title:hover,
.ant-dropdown-menu-submenu-title-selected,
.ant-menu-submenu-popup .ant-menu-item:hover,
.ant-menu-submenu-popup .ant-menu-item-active,
.ant-menu-submenu-popup .ant-menu-item-selected {
  background: ${soft} !important;
  color: ${color} !important;
}

.ant-menu-dark:not(.ant-menu-horizontal) .ant-menu-item-selected,
.ant-menu-dark:not(.ant-menu-horizontal) .ant-menu-submenu-selected,
body.dark .ant-menu:not(.ant-menu-horizontal) .ant-menu-item-selected,
body.realdark .ant-menu:not(.ant-menu-horizontal) .ant-menu-item-selected {
  background: ${softStrong} !important;
}

.setting-drawer-theme-color-swatch {
  color: #fff !important;
}
`
}

export default {
  getAntdSerials () {
    return []
  },
  changeColor (color) {
    const nextColor = normalizeColor(color)
    if (typeof document === 'undefined') {
      return Promise.resolve()
    }
    document.documentElement.style.setProperty('--primary-color', nextColor)
    getStyleElement().textContent = buildThemeCss(nextColor)
    return Promise.resolve()
  }
}
