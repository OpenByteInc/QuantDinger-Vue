<template>
  <div class="profile-agent-tokens" :class="{ 'theme-dark': isDarkTheme }">
    <a-alert
      v-if="policy && policy.is_saas"
      type="warning"
      show-icon
      class="risk-banner"
    >
      <template slot="message">
        {{ $t('profile.agentTokens.saasWarningTitle') || 'SaaS 开放 T scope 说明' }}
      </template>
      <template slot="description">
        <p>{{ $t('profile.agentTokens.saasWarningIntro') || '本实例为多租户托管环境，您可在个人中心自行签发含 T（交易）scope 的 Agent Token。请知悉以下风险：' }}</p>
        <ul class="risk-list">
          <li v-for="(line, idx) in systemRisks" :key="'sys-' + idx">{{ line }}</li>
        </ul>
      </template>
    </a-alert>

    <a-alert
      type="info"
      show-icon
      class="risk-banner"
      :message="$t('profile.agentTokens.intro') || '签发 Agent Token 后，Cursor / Claude Code / MCP 等客户端可通过 /api/agent/v1 访问您的账户数据。Token 仅显示一次，请妥善保存。'"
    />

    <a-tabs v-model="activeTab" class="manage-tabs">
      <a-tab-pane key="tokens" :tab="$t('agentTokens.tabTokens') || 'Tokens'">
        <div class="toolbar">
          <a-button type="primary" @click="openIssueModal">
            <a-icon type="plus" />
            {{ $t('agentTokens.issueToken') || 'Issue Token' }}
          </a-button>
          <a-button :loading="loadingTokens" @click="loadTokens">
            <a-icon type="reload" />
            {{ $t('common.refresh') || 'Refresh' }}
          </a-button>
          <a-button @click="openMcpDocs">
            <a-icon type="book" />
            {{ $t('agentTokens.docs') || 'Quickstart' }}
          </a-button>
        </div>

        <a-table
          :columns="tokenColumns"
          :dataSource="tokens"
          :loading="loadingTokens"
          :pagination="{ pageSize: 10, showSizeChanger: false }"
          :rowKey="r => r.id"
          :rowClassName="tokenRowClassName"
          size="middle"
        >
          <template slot="scopes" slot-scope="text">
            <a-tag
              v-for="s in (text || '').split(',').filter(Boolean)"
              :key="s"
              :color="scopeColor(s)"
              style="margin-right: 4px"
            >
              {{ s }}
            </a-tag>
          </template>
          <template slot="paper" slot-scope="text">
            <a-tag :color="text ? 'green' : 'red'">
              {{ text ? ($t('agentTokens.paperOnly') || 'paper-only') : ($t('agentTokens.live') || 'live-eligible') }}
            </a-tag>
          </template>
          <template slot="status" slot-scope="text">
            <a-tag :color="tokenStatusTagColor(text)">{{ text }}</a-tag>
          </template>
          <template slot="ts" slot-scope="text">
            <span v-if="text">{{ formatTs(text) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
          <template slot="actions" slot-scope="text, record">
            <a-popconfirm
              v-if="record.status === 'active'"
              :title="$t('agentTokens.revokeConfirm') || 'Revoke this token?'"
              @confirm="confirmRevoke(record.id)"
            >
              <a-button type="link" size="small" style="color: #ff4d4f">
                {{ $t('agentTokens.revoke') || 'Revoke' }}
              </a-button>
            </a-popconfirm>
            <span v-else class="text-muted">-</span>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="audit" :tab="$t('agentTokens.tabAudit') || 'Audit log'">
        <div class="toolbar">
          <a-button :loading="loadingAudit" @click="loadAudit">
            <a-icon type="reload" />
            {{ $t('common.refresh') || 'Refresh' }}
          </a-button>
        </div>
        <a-table
          :columns="auditColumns"
          :dataSource="audit"
          :loading="loadingAudit"
          :pagination="{ pageSize: 15 }"
          :rowKey="r => r.id"
          size="small"
        >
          <template slot="scope" slot-scope="text">
            <a-tag :color="scopeColor(text)">{{ text }}</a-tag>
          </template>
          <template slot="status" slot-scope="text">
            <a-tag :color="statusColor(text)">{{ text }}</a-tag>
          </template>
          <template slot="ts" slot-scope="text">
            <span v-if="text">{{ formatTs(text) }}</span>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      :visible="issueModalVisible"
      :title="$t('agentTokens.issueToken') || 'Issue Token'"
      :confirm-loading="issuing"
      :wrapClassName="modalWrapClass"
      @ok="confirmIssue"
      @cancel="closeIssueModal"
      :width="640"
    >
      <a-form-model ref="issueForm" :model="issueForm" :rules="issueRules" :label-col="{ span: 7 }" :wrapper-col="{ span: 15 }">
        <a-form-model-item :label="$t('agentTokens.name') || 'Name'" prop="name">
          <a-input v-model="issueForm.name" :placeholder="$t('agentTokens.namePlaceholder') || 'e.g. cursor-mcp'" />
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.scopes') || 'Scopes'" prop="scopes">
          <a-checkbox-group v-model="issueForm.scopes">
            <a-tooltip :title="scopeHint('R')"><a-checkbox value="R">R · {{ $t('agentTokens.scopeLabel.R') || 'Read' }}</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('W')"><a-checkbox value="W">W · {{ $t('agentTokens.scopeLabel.W') || 'Workspace' }}</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('B')"><a-checkbox value="B">B · {{ $t('agentTokens.scopeLabel.B') || 'Backtest' }}</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('N')"><a-checkbox value="N">N · {{ $t('agentTokens.scopeLabel.N') || 'Notify' }}</a-checkbox></a-tooltip>
            <a-tooltip :title="scopeHint('T')"><a-checkbox value="T">T · {{ $t('agentTokens.scopeLabel.T') || 'Trade' }}</a-checkbox></a-tooltip>
          </a-checkbox-group>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.markets') || 'Markets'">
          <a-input
            v-model="issueForm.markets"
            :placeholder="$t('agentTokens.marketsPlaceholder') || '* 或 Crypto,USStock'"
          />
          <div class="hint">{{ $t('agentTokens.marketsHint') || '逗号分隔；填 * 表示全部市场。示例：Crypto 或 Crypto,USStock,Forex' }}</div>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.instruments') || 'Instruments'">
          <a-input
            v-model="issueForm.instruments"
            :placeholder="$t('agentTokens.instrumentsPlaceholder') || '* 或 BTC/USDT,ETH/USDT'"
          />
          <div class="hint">{{ $t('agentTokens.instrumentsHint') || '逗号分隔；填 * 表示全部品种。示例：BTC/USDT,ETH/USDT' }}</div>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.rateLimit') || 'Rate limit (per min)'">
          <a-input-number v-model="issueForm.rate_limit_per_min" :min="1" :max="6000" />
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.expiresInDays') || 'Expires in (days)'">
          <a-input-number v-model="issueForm.expires_in_days" :min="0" :max="3650" />
          <div class="hint">{{ $t('agentTokens.expiresHint') || '0 = 永不过期。建议默认 30 天。' }}</div>
        </a-form-model-item>

        <a-form-model-item :label="$t('agentTokens.paperOnly') || 'Paper-only'">
          <a-switch v-model="issueForm.paper_only" />
          <div class="hint" :class="{ danger: needsLiveAck }">{{ paperHint }}</div>
        </a-form-model-item>

        <a-form-model-item v-if="needsLiveAck" :wrapper-col="{ span: 15, offset: 7 }">
          <a-alert type="error" show-icon style="margin-bottom: 12px">
            <template slot="message">{{ $t('profile.agentTokens.liveRiskTitle') || '实盘风险确认' }}</template>
            <template slot="description">
              <ul class="risk-list compact">
                <li v-for="(line, idx) in userFundRisks" :key="'fund-' + idx">{{ line }}</li>
              </ul>
            </template>
          </a-alert>
          <a-checkbox v-model="issueForm.ack_live_trading_risk">
            {{ $t('profile.agentTokens.liveRiskAck') || '我已阅读并理解上述风险，确认签发可实盘的 T scope Token' }}
          </a-checkbox>
        </a-form-model-item>
      </a-form-model>
    </a-modal>

    <a-modal
      :visible="!!revealed"
      :title="$t('agentTokens.revealTitle') || 'Token issued — copy it now'"
      :footer="null"
      :width="640"
      :wrapClassName="modalWrapClass"
      @cancel="revealed = null"
    >
      <a-alert type="warning" show-icon :message="$t('agentTokens.revealAlert') || 'Full token shown once only.'" style="margin-bottom: 16px" />
      <div v-if="revealed" class="reveal-body">
        <a-input :value="revealed.token" readOnly />
        <a-button type="primary" style="margin-top: 12px" @click="copyToken(revealed.token)">
          <a-icon type="copy" /> {{ $t('agentTokens.copy') || 'Copy' }}
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
import {
  getMyAgentTokenPolicy,
  issueMyAgentToken,
  listMyAgentTokens,
  revokeMyAgentToken,
  listMyAgentAudit
} from '@/api/agent'

export default {
  name: 'ProfileAgentTokens',
  props: {
    isDarkTheme: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      activeTab: 'tokens',
      policy: null,
      tokens: [],
      loadingTokens: false,
      audit: [],
      loadingAudit: false,
      issueModalVisible: false,
      issuing: false,
      issueForm: this.freshIssueForm(),
      revealed: null
    }
  },
  computed: {
    issueRules () {
      return {
        name: [{
          required: true,
          message: this.$t('agentTokens.rule.nameRequired') || '名称为必填项',
          trigger: 'blur'
        }],
        scopes: [{
          type: 'array',
          required: true,
          min: 1,
          message: this.$t('agentTokens.rule.scopeRequired') || '请至少选择一个权限范围',
          trigger: 'change'
        }]
      }
    },
    modalWrapClass () {
      return this.isDarkTheme ? 'profile-agent-tokens-modal theme-dark' : 'profile-agent-tokens-modal'
    },
    systemRisks () {
      const fromApi = this.policy && this.policy.risk_disclosure && this.policy.risk_disclosure.system
      if (fromApi && fromApi.length) return fromApi
      return [
        this.$t('profile.agentTokens.risk.systemLoad') || '大量 Agent 并发会加重数据库连接池、任务 Worker 与策略线程负载。',
        this.$t('profile.agentTokens.risk.rateLimit') || '自动化请求可能触发平台与交易所速率限制，影响同实例其他用户。',
        this.$t('profile.agentTokens.risk.audit') || '审计日志不能替代人工复核 Agent 行为。',
        this.$t('profile.agentTokens.risk.saasT') || 'SaaS 开放 T scope 扩大平台运营与合规责任。'
      ]
    },
    userFundRisks () {
      const fromApi = this.policy && this.policy.risk_disclosure && this.policy.risk_disclosure.user_funds
      if (fromApi && fromApi.length) return fromApi
      return [
        this.$t('profile.agentTokens.risk.misconfig') || 'Agent 误操作或 prompt 注入可能导致非预期实盘下单与资金损失。',
        this.$t('profile.agentTokens.risk.leak') || 'Token 泄露等同于账户级 API 访问，泄露后请立即吊销。',
        this.$t('profile.agentTokens.risk.liveSwitch') || '实盘需 token paper_only=false 且服务器 AGENT_LIVE_TRADING_ENABLED=true 同时开启。'
      ]
    },
    needsLiveAck () {
      const sel = this.issueForm.scopes || []
      return sel.includes('T') && !this.issueForm.paper_only
    },
    paperHint () {
      if (this.needsLiveAck) {
        return this.$t('agentTokens.paperOff_T') ||
          'Live trading also requires AGENT_LIVE_TRADING_ENABLED=true on the server.'
      }
      return this.$t('agentTokens.paperOnHint') || 'Recommended. Trades are simulated by default.'
    },
    tokenColumns () {
      return [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: this.$t('agentTokens.name') || 'Name', dataIndex: 'name', width: 140 },
        { title: this.$t('agentTokens.prefix') || 'Prefix', dataIndex: 'token_prefix', width: 160 },
        { title: this.$t('agentTokens.scopes') || 'Scopes', dataIndex: 'scopes', scopedSlots: { customRender: 'scopes' } },
        { title: this.$t('agentTokens.paperOnly') || 'Paper', dataIndex: 'paper_only', scopedSlots: { customRender: 'paper' }, width: 110 },
        { title: this.$t('agentTokens.status') || 'Status', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: 90 },
        { title: this.$t('agentTokens.lastUsed') || 'Last used', dataIndex: 'last_used_at', scopedSlots: { customRender: 'ts' }, width: 150 },
        { title: this.$t('common.actions') || 'Actions', scopedSlots: { customRender: 'actions' }, width: 90 }
      ]
    },
    auditColumns () {
      return [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: this.$t('agentTokens.col.route') || 'Route', dataIndex: 'route', ellipsis: true },
        { title: this.$t('agentTokens.col.method') || 'Method', dataIndex: 'method', width: 70 },
        { title: this.$t('agentTokens.col.class') || 'Class', dataIndex: 'scope_class', scopedSlots: { customRender: 'scope' }, width: 70 },
        { title: this.$t('agentTokens.col.status') || 'Status', dataIndex: 'status_code', scopedSlots: { customRender: 'status' }, width: 80 },
        { title: this.$t('agentTokens.col.when') || 'When', dataIndex: 'created_at', scopedSlots: { customRender: 'ts' }, width: 150 }
      ]
    }
  },
  mounted () {
    this.loadPolicy()
    this.loadTokens()
  },
  methods: {
    freshIssueForm () {
      return {
        name: '',
        scopes: ['R'],
        markets: '*',
        instruments: '*',
        paper_only: true,
        rate_limit_per_min: 60,
        expires_in_days: 30,
        ack_live_trading_risk: false
      }
    },
    async loadPolicy () {
      try {
        const resp = await getMyAgentTokenPolicy()
        this.policy = (resp && resp.data) || resp
      } catch (e) {
        /* non-fatal */
      }
    },
    tokenRowClassName (record) {
      const s = (record && String(record.status || '').toLowerCase()) || ''
      if (s === 'revoked') return 'token-row-revoked'
      return ''
    },
    tokenStatusTagColor (status) {
      const s = String(status || '').toLowerCase()
      if (s === 'active') return 'blue'
      if (s === 'revoked') return 'red'
      return 'default'
    },
    scopeColor (s) {
      return ({ R: 'blue', W: 'cyan', B: 'geekblue', N: 'gold', T: 'red' })[s] || 'default'
    },
    statusColor (code) {
      const c = Number(code) || 0
      if (c >= 500) return 'red'
      if (c >= 400) return 'volcano'
      if (c >= 200) return 'green'
      return 'default'
    },
    scopeHint (s) {
      const m = {
        R: this.$t('agentTokens.scopeHint.R'),
        W: this.$t('agentTokens.scopeHint.W'),
        B: this.$t('agentTokens.scopeHint.B'),
        N: this.$t('agentTokens.scopeHint.N'),
        T: this.$t('agentTokens.scopeHint.T')
      }
      return m[s] || ''
    },
    formatTs (s) {
      if (!s) return ''
      try {
        const d = new Date(s)
        if (isNaN(d.getTime())) return s
        return d.toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
      } catch (e) {
        return String(s)
      }
    },
    async loadTokens () {
      this.loadingTokens = true
      try {
        const resp = await listMyAgentTokens()
        this.tokens = (resp && resp.data) || []
      } catch (e) {
        this.$message.error(e.message || String(e))
      } finally {
        this.loadingTokens = false
      }
    },
    async loadAudit () {
      this.loadingAudit = true
      try {
        const resp = await listMyAgentAudit({ limit: 100 })
        this.audit = (resp && resp.data) || []
      } catch (e) {
        this.$message.error(e.message || String(e))
      } finally {
        this.loadingAudit = false
      }
    },
    openIssueModal () {
      this.issueForm = this.freshIssueForm()
      this.issueModalVisible = true
    },
    closeIssueModal () {
      this.issueModalVisible = false
    },
    confirmIssue () {
      if (this.needsLiveAck && !this.issueForm.ack_live_trading_risk) {
        this.$message.warning(this.$t('profile.agentTokens.liveRiskAckRequired') || '请先勾选风险确认')
        return
      }
      this.$refs.issueForm.validate(async valid => {
        if (!valid) return
        this.issuing = true
        try {
          const payload = {
            name: this.issueForm.name.trim(),
            scopes: this.issueForm.scopes.join(','),
            markets: (this.issueForm.markets || '*').trim() || '*',
            instruments: (this.issueForm.instruments || '*').trim() || '*',
            paper_only: !!this.issueForm.paper_only,
            rate_limit_per_min: Number(this.issueForm.rate_limit_per_min) || 60,
            expires_in_days: Number(this.issueForm.expires_in_days) || 0
          }
          if (this.needsLiveAck) {
            payload.ack_live_trading_risk = true
          }
          const resp = await issueMyAgentToken(payload)
          const data = (resp && resp.data) || resp
          if (!data || !data.token) throw new Error('Empty response')
          this.revealed = data
          this.issueModalVisible = false
          this.loadTokens()
        } catch (e) {
          this.$message.error(e.message || String(e))
        } finally {
          this.issuing = false
        }
      })
    },
    async confirmRevoke (id) {
      try {
        await revokeMyAgentToken(id)
        this.$message.success(this.$t('agentTokens.revoked') || 'Revoked')
        this.loadTokens()
      } catch (e) {
        this.$message.error(e.message || String(e))
      }
    },
    copyToken (token) {
      try {
        if (navigator && navigator.clipboard) {
          navigator.clipboard.writeText(token)
        } else {
          const ta = document.createElement('textarea')
          ta.value = token
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        this.$message.success(this.$t('agentTokens.copied') || 'Copied')
      } catch (e) {
        this.$message.warning('Copy failed')
      }
    },
    openMcpDocs () {
      window.open('https://github.com/brokermr810/QuantDinger/blob/main/docs/agent/MCP_SETUP.md', '_blank')
    }
  },
  watch: {
    activeTab (val) {
      if (val === 'audit' && !this.audit.length) this.loadAudit()
    }
  }
}
</script>

<style lang="less" scoped>
.profile-agent-tokens {
  .risk-banner {
    margin-bottom: 16px;
  }

  .risk-list {
    margin: 8px 0 0;
    padding-left: 20px;

    &.compact {
      margin-bottom: 0;
    }
  }

  .toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .hint {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);

    &.danger {
      color: #cf1322;
    }
  }

  .text-muted {
    color: rgba(0, 0, 0, 0.35);
  }

  ::v-deep .ant-table-tbody > tr.token-row-revoked > td {
    background: #fff2f0 !important;
  }

  &.theme-dark {
    .hint {
      color: rgba(255, 255, 255, 0.45);
    }

    .text-muted {
      color: rgba(255, 255, 255, 0.35);
    }
  }
}
</style>
