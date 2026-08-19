<template>
  <div class="legal-page">
    <div class="legal-wrap">
      <h1>QuantDinger 隐私政策</h1>
      <p class="updated">最后更新:2026-08-13</p>

      <div class="highlight-box">
        <strong>核心承诺:</strong>我们仅收集为提供服务所必需的最少数据。券商 API Key/Secret 采用 AES-256 加密存储,前端仅展示掩码。除法律强制要求外,我们不会向第三方出售用户数据。
      </div>

      <h2>1. 我们收集哪些数据</h2>
      <table>
        <thead><tr><th>数据类型</th><th>用途</th><th>存储方式</th></tr></thead>
        <tbody>
          <tr><td>注册信息(邮箱、密码)</td><td>账户登录与身份验证</td><td>密码 bcrypt 哈希</td></tr>
          <tr><td>券商/交易所 API 授权</td><td>执行实盘下单</td><td>AES-256 加密</td></tr>
          <tr><td>会话与操作日志</td><td>安全审计与故障排查</td><td>加密存储,限期保留</td></tr>
          <tr><td>策略源码与回测结果</td><td>提供研究与执行服务</td><td>加密存储</td></tr>
          <tr><td>AI 对话记录</td><td>提供 AI 辅助分析</td><td>加密存储,用户可删</td></tr>
        </tbody>
      </table>

      <h2>2. 数据加密</h2>
      <p>所有敏感数据(券商 API Key/Secret、策略源码)在传输层使用 TLS/HTTPS,在存储层使用 AES-256 加密。前端在任何情况下都不会返回 API Secret 明文,仅展示掩码(如 <code>****1234</code>)。</p>

      <h2>3. 数据使用</h2>
      <p>数据仅用于:提供、维护和改进服务;处理实盘下单与监控;安全审计与反欺诈;遵守法律义务。我们不会将用户的交易策略、持仓数据出售给任何第三方。</p>

      <h2>4. 第三方共享</h2>
      <p>除以下情形外,我们不向第三方共享用户数据:(a) 用户授权对接的券商/交易所(仅 API Key 用于下单);(b) 法律强制要求;(c) 完成支付所需支付服务商(仅交易金额)。</p>

      <h2>5. Cookie 与本地存储</h2>
      <p>平台使用必要的 Cookie(localStorage)维持登录状态、语言偏好、界面主题。这些数据存储在用户本地,用户可随时清除。不使用用于跨站追踪的广告 Cookie。</p>

      <h2>6. 用户权利</h2>
      <ul>
        <li><strong>访问与导出:</strong>用户可随时申请导出其全部数据。</li>
        <li><strong>删除:</strong>用户可随时删除账户及相关数据,删除后不可恢复。</li>
        <li><strong>撤销授权:</strong>用户可随时撤销券商 API 授权,平台将立即停止使用该 Key。</li>
        <li><strong>更正:</strong>用户可更正其个人资料。</li>
      </ul>

      <h2>7. 数据保留</h2>
      <p>操作日志与安全审计日志保留期限为 12 个月,期满自动删除或匿名化。账户删除后,除法律要求保留的记录外,个人数据在 30 日内清除。</p>

      <h2>8. 安全措施</h2>
      <p>我们实施:TLS 强制传输、敏感数据 AES-256 加密存储、CSP 内容安全策略、HSTS、API 频率限制、账户回撤熔断等风控规则、定期安全审计。但互联网传输无绝对安全,我们不对数据绝对安全作担保。</p>

      <h2>9. 儿童隐私</h2>
      <p>本服务不面向 18 岁以下未成年人。如发现未成年人注册,我们将删除其账户。</p>

      <h2>10. 政策变更</h2>
      <p>本政策可能更新,重大变更将通过站内通知或邮件告知用户。继续使用服务视为接受更新。</p>

      <h2>11. 联系方式</h2>
      <p>邮箱:support@quantdinger.com | Telegram:https://t.me/quantdinger</p>

      <div class="legal-nav">
        <router-link to="/legal/user-agreement">用户协议</router-link>
        <a href="/">返回首页</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PrivacyPolicy'
}
</script>

<style lang="less" scoped>
.legal-page {
  min-height: 100vh;
  background: #f8fbff;
  padding: 40px 0;
}
.legal-wrap {
  max-width: 780px;
  margin: 0 auto;
  padding: 0 24px 80px;
  color: #1f2937;
  line-height: 1.7;
}
h1 { font-size: 28px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; }
h2 { font-size: 20px; margin-top: 36px; color: #2563eb; }
p { color: #374151; font-size: 15px; }
.updated { color: #9ca3af; font-size: 13px; margin-top: -8px; }
.highlight-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 16px;
  margin: 24px 0;
  color: #1e40af;
}
table { width: 100%; border-collapse: collapse; margin: 16px 0; }
th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; color: #374151; font-size: 14px; }
th { background: #f9fafb; color: #2563eb; }
ul { color: #374151; }
code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.legal-nav {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding-top: 40px;
  border-top: 1px solid #e5e7eb;
  margin-top: 40px;
}
.legal-nav a { color: #2563eb; }
@media (prefers-color-scheme: dark) {
  .legal-page { background: #0b1120; }
  .legal-wrap { color: #e5e7eb; }
  p, th, td, ul { color: #cbd5e1; }
  h2 { color: #14b8a6; }
  h1 { border-color: #1f2937; }
  th, td { border-color: #1f2937; }
  th { background: #111827; }
  .highlight-box { background: #0f2937; border-color: #1e3a5f; }
  code { background: #1f2937; }
  .legal-nav { border-color: #1f2937; }
}
</style>
