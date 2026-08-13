<template>
  <div class="legal-page">
    <div class="legal-wrap">
      <h1>QuantDinger 用户协议</h1>
      <p class="updated">最后更新:2026-08-13</p>

      <div class="risk-box">
        <strong>风险提示:</strong>本平台为量化研究、回测与自动化交易提供基础设施。所有 AI 产出仅供研究参考,不构成任何投资建议。用户使用本平台进行实盘交易的风险由用户自行承担。
      </div>

      <h2>1. 服务定义</h2>
      <p>QuantDinger("本平台")提供量化交易相关基础设施,包括但不限于:图表指标开发、策略编写、历史回测、因子研究、自动化实盘执行、AI 辅助分析。平台支持对接第三方券商与加密货币交易所。</p>

      <h2>2. 用户资格</h2>
      <p>用户须为具备完全民事行为能力的自然人或法人。用户注册时须提供真实信息。若用户所在司法管辖区禁止或限制加密货币交易、自动交易或使用本类服务,用户不得使用本平台实盘功能。</p>

      <h2>3. AI 产出免责</h2>
      <p>平台内所有 AI 生成内容(包括但不限于标的诊断、机会雷达、策略草稿、交易计划)仅供研究参考,不构成投资建议。决策前用户须自行核对数据、风险与仓位。平台不对 AI 产出的准确性、完整性或盈利性作任何担保。</p>

      <h2>4. 实盘交易风险</h2>
      <p>实盘自动交易涉及重大风险,包括但不限于:市场风险、流动性风险、滑点与手续费、策略过拟合、尾部风险与黑天鹅事件、交易所宕机或 API 故障、网络延迟。历史回测表现不代表未来收益。用户应仅投入可承受损失的资金。</p>

      <h2>5. 券商与交易所对接</h2>
      <p>用户对接第三方券商/交易所前,须确认已阅读并同意该平台的服务条款与风险规则。用户授权本平台使用其 API Key 进行下单操作,平台对第三方平台的行为不承担责任。用户的 API Key/Secret 采用加密存储,用户可随时撤销授权。</p>

      <h2>6. 马丁与网格策略特别提示</h2>
      <p>马丁格尔、网格等加仓型策略在极端行情下可能导致快速亏损甚至爆仓。平台提供死锁与仓位上限等风控规则,但风控规则无法完全避免亏损。用户使用此类策略须充分理解其风险。</p>

      <h2>7. 禁止行为</h2>
      <p>用户不得利用本平台从事:洗钱、操纵市场、内幕交易、未经授权的他人账户操作,或任何违反所在地法律法规的活动。发现违规,平台有权立即暂停或终止服务并配合调查。</p>

      <h2>8. 服务变更与终止</h2>
      <p>平台保留随时变更、暂停或终止部分或全部服务的权利。用户可随时删除账户及数据。因不可抗力导致服务中断,平台不承担责任。</p>

      <h2>9. 责任限制</h2>
      <p>在适用法律允许的最大范围内,平台不对用户因使用服务产生的任何直接、间接、附带或后果性损失(包括利润损失)承担责任。平台的累计责任以用户已支付的服务费用为限。</p>

      <h2>10. 适用法律</h2>
      <p>本协议的解释与争议解决适用平台运营方注册地法律。</p>

      <div class="legal-nav">
        <router-link to="/legal/privacy-policy">隐私政策</router-link>
        <a href="/">返回首页</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserAgreement'
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
.risk-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 16px;
  margin: 24px 0;
  color: #991b1b;
}
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
  p { color: #cbd5e1; }
  h2 { color: #14b8a6; }
  h1 { border-color: #1f2937; }
  .risk-box { background: #1e1b1b; border-color: #7f1d1d; }
  .legal-nav { border-color: #1f2937; }
}
</style>
