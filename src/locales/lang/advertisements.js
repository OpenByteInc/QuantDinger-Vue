const en = {
  title: 'Advertisement settings', help: 'Image links only; no upload required. Recommended ratio 3:1 (900 × 300 px). Ads rotate every 6 seconds, in ascending order. Navigation and account ads display independently.',
  add: 'Add advertisement', empty: 'No advertisements. Both placements remain hidden until enabled.', preview: 'Preview', content: 'Advertisement & links', position: 'Placement', sort: 'Order', enabled: 'Enabled', actions: 'Actions',
  name: 'Ad name / image description', imageUrl: 'Image URL (HTTPS recommended)', targetUrl: 'Destination URL', sidebar: 'Navigation bottom', accounts: 'Account list bottom', delete: 'Delete advertisement', confirmDelete: 'Remove this advertisement? Save to apply.',
  sponsored: 'Sponsored', newWindow: 'Opens in a new tab', previous: 'Previous advertisement', next: 'Next advertisement', pause: 'Pause rotation', play: 'Resume rotation',
  save: 'Save advertisements', saved: 'Advertisements saved', failed: 'Unable to load or save advertisements. Please retry.', invalid: 'Enter a name, valid HTTP(S) image and destination URLs, and an order between 0 and 9999 for each ad.', conflict: 'Another administrator changed these ads. Reload before saving again.',
  unsaved: 'Unsaved changes · Saved separately from brand settings', hint: 'Lower numbers appear first · New ads are disabled by default · Up to 40 ads', reload: 'Reload', discard: 'Discard unsaved advertisement changes and reload?'
}
const zh = {
  title: '广告设置', help: '直接引用图片链接，无需上传。建议比例 3:1（900 × 300 px）。多张图片按排序每 6 秒轮播；导航与账户广告独立显示。',
  add: '添加广告', empty: '暂无广告，启用前两个位置均不显示。', preview: '预览', content: '广告与链接', position: '展示位置', sort: '排序', enabled: '启用', actions: '操作',
  name: '广告名称 / 图片说明', imageUrl: '图片 URL（推荐 HTTPS）', targetUrl: '跳转 URL', sidebar: '导航栏底部', accounts: '账户列表底部', delete: '删除广告', confirmDelete: '移除此广告？保存后生效。',
  sponsored: '推广', newWindow: '在新窗口打开', previous: '上一张广告', next: '下一张广告', pause: '暂停轮播', play: '继续轮播',
  save: '保存广告', saved: '广告已保存', failed: '广告加载或保存失败，请重试。', invalid: '请为每条广告填写名称、有效的 HTTP(S) 图片和跳转链接，以及 0–9999 的排序数字。', conflict: '其他管理员已修改广告，请重新加载后再保存。',
  unsaved: '有未保存的修改 · 广告与品牌设置独立保存', hint: '数字越小越靠前 · 新广告默认停用 · 最多 40 条', reload: '重新加载', discard: '放弃未保存的广告修改并重新加载？'
}
const tw = {
  ...zh, title: '廣告設定', help: '直接引用圖片連結，無需上傳。建議比例 3:1（900 × 300 px）。多張圖片依排序每 6 秒輪播；導覽與帳戶廣告獨立顯示。',
  add: '新增廣告', empty: '尚無廣告，啟用前兩個位置均不顯示。', preview: '預覽', content: '廣告與連結', position: '顯示位置', enabled: '啟用',
  name: '廣告名稱 / 圖片說明', imageUrl: '圖片 URL（建議 HTTPS）', targetUrl: '跳轉 URL', sidebar: '導覽列底部', accounts: '帳戶列表底部', delete: '刪除廣告', confirmDelete: '移除此廣告？儲存後生效。',
  sponsored: '推廣', newWindow: '在新視窗開啟', previous: '上一張廣告', next: '下一張廣告', pause: '暫停輪播', play: '繼續輪播', save: '儲存廣告', saved: '廣告已儲存',
  failed: '廣告載入或儲存失敗，請重試。', invalid: '請為每條廣告填寫名稱、有效的 HTTP(S) 圖片與跳轉連結，以及 0–9999 的排序數字。', conflict: '其他管理員已修改廣告，請重新載入後再儲存。',
  unsaved: '有未儲存的修改 · 廣告與品牌設定獨立儲存', hint: '數字越小越靠前 · 新廣告預設停用 · 最多 40 條', reload: '重新載入', discard: '放棄未儲存的廣告修改並重新載入？'
}
const prefix = messages => Object.fromEntries(Object.entries(messages).map(([key, value]) => ['advertisements.' + key, value]))
export default { 'en-US': prefix(en), 'zh-CN': prefix(zh), 'zh-TW': prefix(tw) }
