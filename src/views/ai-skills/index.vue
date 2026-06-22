<template>
  <div class="ai-skill-center">
    <div class="skill-hero">
      <div>
        <div class="eyebrow">{{ text.heroEyebrow }}</div>
        <h1>{{ text.title }}</h1>
        <p>{{ text.subtitle }}</p>
      </div>
      <div class="hero-actions">
        <a-button icon="reload" :loading="loading" @click="loadAll">{{ text.refresh }}</a-button>
        <a-button type="primary" icon="plus" @click="activeTab = 'install'">{{ text.install }}</a-button>
      </div>
    </div>

    <div class="stat-grid">
      <div v-for="item in stats" :key="item.key" class="stat-card">
        <span class="stat-label">{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.help }}</small>
      </div>
    </div>

    <a-tabs v-model="activeTab" class="skill-tabs">
      <a-tab-pane key="skills" :tab="text.skills">
        <div class="toolbar">
          <a-input-search v-model="keyword" :placeholder="text.searchSkills" class="toolbar-search" allow-clear />
          <a-checkbox v-model="showDisabled" @change="loadSkills">{{ text.showDisabled }}</a-checkbox>
        </div>
        <a-table
          row-key="id"
          :columns="skillColumns"
          :data-source="filteredSkills"
          :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }"
          size="middle"
          class="registry-table"
        >
          <template slot="label" slot-scope="textValue, record">
            <div class="skill-name">
              <a-icon :type="record.icon || 'experiment'" />
              <div>
                <strong>{{ record.label }}</strong>
                <span>{{ record.id }}</span>
              </div>
            </div>
          </template>
          <template slot="source" slot-scope="textValue, record">
            <a-tag :color="record.builtin ? 'blue' : 'purple'">{{ record.builtin ? text.builtin : text.installed }}</a-tag>
          </template>
          <template slot="risk" slot-scope="textValue, record">
            <a-tag :color="riskColor(record.risk_level)">{{ record.risk_level }}</a-tag>
          </template>
          <template slot="enabled" slot-scope="textValue, record">
            <a-switch
              :checked="record.enabled !== false"
              :disabled="record.builtin"
              size="small"
              @change="checked => toggleSkill(record, checked)"
            />
          </template>
          <template slot="actions" slot-scope="textValue, record">
            <a-button type="link" size="small" @click="openSkill(record)">{{ text.detail }}</a-button>
            <a-popconfirm
              v-if="!record.builtin"
              :title="text.deleteConfirm"
              @confirm="removeSkill(record)"
            >
              <a-button type="link" size="small" class="danger-link">{{ text.delete }}</a-button>
            </a-popconfirm>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="tools" :tab="text.tools">
        <div class="tool-grid">
          <div v-for="tool in tools" :key="tool.id" class="tool-card">
            <div class="tool-card-head">
              <strong>{{ tool.label }}</strong>
              <a-tag :color="riskColor(tool.risk_level)">{{ tool.risk_level }}</a-tag>
            </div>
            <p>{{ tool.description }}</p>
            <div class="tool-meta">
              <span>{{ tool.id }}</span>
              <span>{{ tool.read_only ? text.readOnly : text.writeTool }}</span>
            </div>
            <div v-if="tool.safety" class="safety-note">{{ tool.safety }}</div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="install" :tab="text.install">
        <div class="install-layout">
          <div class="install-panel">
            <h3>{{ text.installTitle }}</h3>
            <p>{{ text.installHint }}</p>
            <a-textarea
              v-model="manifestText"
              :auto-size="{ minRows: 18, maxRows: 26 }"
              spellcheck="false"
              class="manifest-editor"
            />
            <div class="install-actions">
              <a-button @click="fillExample">{{ text.example }}</a-button>
              <a-button type="primary" :loading="installing" @click="installSkill">{{ text.install }}</a-button>
            </div>
          </div>
          <div class="install-rules">
            <h3>{{ text.safetyTitle }}</h3>
            <ul>
              <li>{{ text.rulePromptOnly }}</li>
              <li>{{ text.ruleNoCode }}</li>
              <li>{{ text.ruleBoundary }}</li>
              <li>{{ text.ruleUserControl }}</li>
            </ul>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      :visible="!!detailSkill"
      :title="detailSkill ? detailSkill.label : ''"
      width="720px"
      wrap-class-name="ai-skill-modal"
      :footer="null"
      @cancel="detailSkill = null"
    >
      <div v-if="detailSkill" class="detail-content">
        <p>{{ detailSkill.description }}</p>
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="ID">{{ detailSkill.id }}</a-descriptions-item>
          <a-descriptions-item :label="text.category">{{ detailSkill.category }}</a-descriptions-item>
          <a-descriptions-item :label="text.source">{{ detailSkill.source }}</a-descriptions-item>
          <a-descriptions-item :label="text.risk">{{ detailSkill.risk_level }}</a-descriptions-item>
          <a-descriptions-item :label="text.requires">{{ (detailSkill.requires || []).join(', ') || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="text.produces">{{ (detailSkill.produces || []).join(', ') || '-' }}</a-descriptions-item>
        </a-descriptions>
        <h4>{{ text.promptTemplate }}</h4>
        <pre>{{ detailSkill.prompt }}</pre>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { getAiSkills, getAiTools, installAiSkill, updateAiSkill, deleteAiSkill } from '@/api/market'

export default {
  name: 'AiSkills',
  data () {
    return {
      activeTab: 'skills',
      loading: false,
      installing: false,
      showDisabled: true,
      keyword: '',
      registry: null,
      toolsRegistry: null,
      manifestText: '',
      detailSkill: null
    }
  },
  computed: {
    isZh () {
      return String(this.$i18n?.locale || navigator.language || 'zh-CN').toLowerCase().startsWith('zh')
    },
    text () {
      if (!this.isZh) {
        return {
          heroEyebrow: 'Agent capability registry',
          title: 'AI Skill Center',
          subtitle: 'Manage prompt skills, inspect system tools, and keep every AI workflow aligned with QuantDinger boundaries.',
          refresh: 'Refresh',
          install: 'Install skill',
          skills: 'Skills',
          tools: 'Tools',
          allCategories: 'All categories',
          searchSkills: 'Search skills...',
          showDisabled: 'Show disabled',
          builtin: 'Built-in',
          installed: 'Installed',
          detail: 'Detail',
          delete: 'Delete',
          deleteConfirm: 'Delete this installed skill?',
          readOnly: 'Read-only',
          writeTool: 'Write workflow',
          installTitle: 'Install prompt skill manifest',
          installHint: 'Paste a JSON manifest. This version only allows prompt skills, not executable code.',
          example: 'Use example',
          safetyTitle: 'Safety boundary',
          rulePromptOnly: 'Only prompt skills can be installed.',
          ruleNoCode: 'Executable fields such as shell, Python, webhook, and commands are rejected.',
          ruleBoundary: 'AI may create draft or stopped strategies only.',
          ruleUserControl: 'Live execution must be started manually by the user.',
          category: 'Category',
          source: 'Source',
          risk: 'Risk',
          requires: 'Requires',
          produces: 'Produces',
          promptTemplate: 'Prompt template'
        }
      }
      return {
        heroEyebrow: 'Agent 能力注册中心',
        title: 'AI 技能中心',
        subtitle: '统一管理提示词技能、查看系统工具边界，让 AI 工作流真正贴合 QuantDinger。',
        refresh: '刷新',
        install: '安装技能',
        skills: '技能',
        tools: '工具',
        allCategories: '全部分类',
        searchSkills: '搜索技能...',
        showDisabled: '显示已停用',
        builtin: '内置',
        installed: '已安装',
        detail: '详情',
        delete: '删除',
        deleteConfirm: '确定删除这个已安装技能？',
        readOnly: '只读',
        writeTool: '写入工作流',
        installTitle: '安装 Prompt Skill Manifest',
        installHint: '粘贴 JSON manifest。当前版本只允许提示词技能，不允许执行代码。',
        example: '填入示例',
        safetyTitle: '安全边界',
        rulePromptOnly: '只允许安装 prompt 类型技能。',
        ruleNoCode: 'shell、Python、webhook、commands 等可执行字段会被拒绝。',
        ruleBoundary: 'AI 只能创建草稿或停止状态策略。',
        ruleUserControl: '实盘启动必须由用户手动点击。',
        category: '分类',
        source: '来源',
        risk: '风险',
        requires: '需要',
        produces: '产出',
        promptTemplate: '提示词模板'
      }
    },
    skills () {
      return this.registry?.skills || []
    },
    tools () {
      return this.toolsRegistry?.tools || []
    },
    filteredSkills () {
      const q = this.keyword.trim().toLowerCase()
      if (!q) return this.skills
      return this.skills.filter(item => {
        return [item.id, item.label, item.description, item.category].some(value => String(value || '').toLowerCase().includes(q))
      })
    },
    stats () {
      const installed = this.skills.filter(item => !item.builtin).length
      const enabled = this.skills.filter(item => item.enabled !== false).length
      const writeTools = this.tools.filter(item => !item.read_only).length
      return [
        { key: 'skills', label: this.text.skills, value: this.skills.length, help: this.text.builtin + ' / ' + this.text.installed },
        { key: 'enabled', label: this.isZh ? '启用中' : 'Enabled', value: enabled, help: this.isZh ? '可被 Agent 使用' : 'Available to Agent' },
        { key: 'installed', label: this.text.installed, value: installed, help: this.isZh ? '用户扩展技能' : 'User extensions' },
        { key: 'tools', label: this.text.tools, value: this.tools.length, help: `${writeTools} ${this.text.writeTool}` }
      ]
    },
    skillColumns () {
      return [
        { title: this.isZh ? '技能' : 'Skill', dataIndex: 'label', scopedSlots: { customRender: 'label' } },
        { title: this.text.category, dataIndex: 'category', width: 140 },
        { title: this.text.source, dataIndex: 'source', width: 120, scopedSlots: { customRender: 'source' } },
        { title: this.text.risk, dataIndex: 'risk_level', width: 130, scopedSlots: { customRender: 'risk' } },
        { title: this.isZh ? '启用' : 'Enabled', dataIndex: 'enabled', width: 90, scopedSlots: { customRender: 'enabled' } },
        { title: this.isZh ? '操作' : 'Actions', dataIndex: 'actions', width: 140, scopedSlots: { customRender: 'actions' } }
      ]
    }
  },
  mounted () {
    this.fillExample()
    this.loadAll()
  },
  methods: {
    async loadAll () {
      this.loading = true
      try {
        await Promise.all([this.loadSkills(), this.loadTools()])
      } finally {
        this.loading = false
      }
    },
    async loadSkills () {
      const res = await getAiSkills({ language: this.isZh ? 'zh-CN' : 'en-US', include_disabled: this.showDisabled ? 1 : 0 })
      this.registry = res.data || res
    },
    async loadTools () {
      const res = await getAiTools({ language: this.isZh ? 'zh-CN' : 'en-US' })
      this.toolsRegistry = res.data || res
    },
    riskColor (risk) {
      if (risk === 'read') return 'green'
      if (risk === 'write_draft') return 'blue'
      if (risk === 'write_config') return 'orange'
      return 'default'
    },
    openSkill (record) {
      this.detailSkill = record
    },
    async toggleSkill (record, checked) {
      try {
        await updateAiSkill(record.id, { enabled: checked, language: this.isZh ? 'zh-CN' : 'en-US' })
        this.$message.success(this.isZh ? '已更新技能状态' : 'Skill updated')
        await this.loadSkills()
      } catch (e) {
        this.$message.error(e.message || (this.isZh ? '更新失败' : 'Update failed'))
      }
    },
    async removeSkill (record) {
      try {
        await deleteAiSkill(record.id)
        this.$message.success(this.isZh ? '已删除技能' : 'Skill deleted')
        await this.loadSkills()
      } catch (e) {
        this.$message.error(e.message || (this.isZh ? '删除失败' : 'Delete failed'))
      }
    },
    fillExample () {
      this.manifestText = JSON.stringify({
        id: 'btc_breakout_coach',
        kind: 'prompt',
        category: 'research',
        icon: 'line-chart',
        label: { zh: 'BTC 突破教练', en: 'BTC Breakout Coach' },
        description: { zh: '专门检查 BTC 突破、假突破和回踩确认。', en: 'Check BTC breakouts, fakeouts, and retest confirmation.' },
        prompt_template: {
          zh: '请基于 {symbol_label} 检查当前是否接近有效突破。重点输出：关键阻力、放量确认、回踩确认、假突破风险、失效条件。',
          en: 'Check whether {symbol_label} is near a valid breakout. Cover resistance, volume confirmation, retest confirmation, fakeout risk, and invalidation.'
        },
        system_instruction: 'Focus on breakout validation. Do not invent missing volume or derivatives data.',
        keywords: ['breakout', 'BTC', '突破', '假突破'],
        requires: ['market_data'],
        produces: ['breakout_plan'],
        risk_level: 'read',
        priority: 72
      }, null, 2)
    },
    async installSkill () {
      let payload
      try {
        payload = JSON.parse(this.manifestText)
      } catch (e) {
        this.$message.error(this.isZh ? 'JSON 格式不正确' : 'Invalid JSON')
        return
      }
      this.installing = true
      try {
        await installAiSkill({ skill: payload, language: this.isZh ? 'zh-CN' : 'en-US' })
        this.$message.success(this.isZh ? '技能已安装' : 'Skill installed')
        this.activeTab = 'skills'
        await this.loadSkills()
      } catch (e) {
        this.$message.error(e.message || (this.isZh ? '安装失败' : 'Install failed'))
      } finally {
        this.installing = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.ai-skill-center {
  min-height: calc(100vh - 104px);
  padding: 24px;
  color: var(--text-color, #10213d);
}

.skill-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border: 1px solid rgba(62, 112, 255, 0.14);
  border-radius: 18px;
  background:
    radial-gradient(circle at 12% 18%, rgba(47, 128, 237, 0.18), transparent 26%),
    radial-gradient(circle at 86% 22%, rgba(18, 194, 233, 0.14), transparent 24%),
    rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 46px rgba(28, 47, 90, 0.08);
  backdrop-filter: blur(18px);

  h1 {
    margin: 6px 0;
    font-size: 30px;
    font-weight: 800;
  }

  p {
    margin: 0;
    max-width: 720px;
    color: #64748b;
  }
}

.eyebrow {
  color: var(--primary-color, #2f6bff);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0;
}

.stat-card {
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 34px rgba(28, 47, 90, 0.06);

  strong {
    display: block;
    margin: 6px 0 2px;
    font-size: 26px;
    line-height: 1;
  }

  small,
  .stat-label {
    color: #64748b;
  }
}

.skill-tabs {
  padding: 6px 18px 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.toolbar-search {
  max-width: 360px;
}

.skill-name {
  display: flex;
  align-items: center;
  gap: 12px;

  i {
    color: var(--primary-color, #2f6bff);
    font-size: 18px;
  }

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 3px;
    color: #7b8ba5;
    font-size: 12px;
  }
}

.danger-link {
  color: #ff4d4f;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.tool-card {
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.94), rgba(255, 255, 255, 0.84));

  p {
    min-height: 48px;
    color: #64748b;
  }
}

.tool-card-head,
.tool-meta,
.install-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tool-meta {
  color: #7b8ba5;
  font-size: 12px;
}

.safety-note {
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(47, 107, 255, 0.08);
  color: #36527c;
  font-size: 12px;
}

.install-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
}

.install-panel,
.install-rules {
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgba(248, 251, 255, 0.72);
}

.manifest-editor {
  font-family: Consolas, Monaco, monospace;
}

.install-actions {
  justify-content: flex-end;
  margin-top: 12px;
}

.install-rules li {
  margin: 10px 0;
}

.detail-content pre {
  max-height: 260px;
  overflow: auto;
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: #0f172a;
  color: #dbeafe;
}

:global(body.dark),
:global(.basic-layout-wrapper.dark) {
  .ai-skill-center {
    background: #0b0b0b;
    color: rgba(255, 255, 255, 0.88);
  }

  .skill-hero,
  .stat-card,
  .skill-tabs,
  .install-panel,
  .install-rules,
  .tool-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: #121212;
    box-shadow: none;
  }

  .skill-hero p,
  .stat-card small,
  .stat-card .stat-label,
  .tool-card p,
  .tool-meta,
  .skill-name span {
    color: rgba(255, 255, 255, 0.52);
  }

  .skill-name strong,
  .tool-card-head strong,
  .install-panel h3,
  .install-rules h3 {
    color: rgba(255, 255, 255, 0.9);
  }

  .toolbar ::v-deep .ant-checkbox-wrapper {
    color: rgba(255, 255, 255, 0.78);
  }

  ::v-deep .ant-tabs-bar {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  ::v-deep .ant-tabs-tab {
    color: rgba(255, 255, 255, 0.58);
  }

  ::v-deep .ant-tabs-tab:hover,
  ::v-deep .ant-tabs-tab-active {
    color: var(--primary-color, #1890ff) !important;
  }

  ::v-deep .ant-tabs-ink-bar {
    background: var(--primary-color, #1890ff);
  }

  ::v-deep .ant-table {
    background: transparent;
    color: rgba(255, 255, 255, 0.82);
  }

  ::v-deep .ant-table-thead > tr > th {
    background: #161616;
    border-bottom-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.62);
  }

  ::v-deep .ant-table-tbody > tr > td {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: rgba(255, 255, 255, 0.05);
  }

  ::v-deep .ant-table-placeholder {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.45);
  }

  ::v-deep .ant-input,
  ::v-deep .ant-input-search .ant-input,
  ::v-deep .ant-select-selection,
  .manifest-editor {
    background: #0f0f0f;
    border-color: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.86);
  }

  ::v-deep .ant-input::placeholder,
  ::v-deep .ant-select-selection__placeholder {
    color: rgba(255, 255, 255, 0.36);
  }

  ::v-deep .ant-pagination-item,
  ::v-deep .ant-pagination-prev .ant-pagination-item-link,
  ::v-deep .ant-pagination-next .ant-pagination-item-link {
    background: #121212;
    border-color: rgba(255, 255, 255, 0.14);
  }

  ::v-deep .ant-pagination-item a,
  ::v-deep .ant-pagination-prev .ant-pagination-item-link,
  ::v-deep .ant-pagination-next .ant-pagination-item-link {
    color: rgba(255, 255, 255, 0.62);
  }
}

:global(.basic-layout-wrapper.dark) {
  .ai-skill-center {
    color: #e5e7eb;
  }

  .skill-hero,
  .stat-card,
  .skill-tabs,
  .install-panel,
  .install-rules {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(18, 18, 18, 0.82);
    box-shadow: none;
  }

  .skill-hero p,
  .stat-card small,
  .stat-card .stat-label,
  .tool-card p,
  .tool-meta,
  .skill-name span {
    color: #9ca3af;
  }

  .tool-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(14, 14, 14, 0.9);
  }

  .safety-note {
    background: rgba(47, 107, 255, 0.16);
    color: #bfdbfe;
  }
}

@media (max-width: 1200px) {
  .stat-grid,
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .install-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .ai-skill-center {
    padding: 14px;
  }

  .skill-hero,
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .stat-grid,
  .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style lang="less">
body.dark .ai-skill-center,
.basic-layout-wrapper.dark .ai-skill-center {
  min-height: calc(100vh - 104px);
  background: #080808 !important;
  color: rgba(255, 255, 255, 0.88) !important;
}

body.dark .ai-skill-center .skill-hero,
.basic-layout-wrapper.dark .ai-skill-center .skill-hero {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background:
    radial-gradient(circle at 16% 0%, rgba(24, 144, 255, 0.14), transparent 30%),
    radial-gradient(circle at 92% 16%, rgba(20, 184, 166, 0.1), transparent 28%),
    linear-gradient(135deg, rgba(18, 18, 18, 0.98), rgba(13, 13, 13, 0.98)) !important;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42) !important;
}

body.dark .ai-skill-center .skill-hero h1,
.basic-layout-wrapper.dark .ai-skill-center .skill-hero h1,
body.dark .ai-skill-center .stat-card strong,
.basic-layout-wrapper.dark .ai-skill-center .stat-card strong {
  color: rgba(255, 255, 255, 0.94) !important;
}

body.dark .ai-skill-center .skill-hero p,
.basic-layout-wrapper.dark .ai-skill-center .skill-hero p,
body.dark .ai-skill-center .stat-card small,
.basic-layout-wrapper.dark .ai-skill-center .stat-card small,
body.dark .ai-skill-center .stat-card .stat-label,
.basic-layout-wrapper.dark .ai-skill-center .stat-card .stat-label,
body.dark .ai-skill-center .tool-card p,
.basic-layout-wrapper.dark .ai-skill-center .tool-card p,
body.dark .ai-skill-center .tool-meta,
.basic-layout-wrapper.dark .ai-skill-center .tool-meta,
body.dark .ai-skill-center .skill-name span,
.basic-layout-wrapper.dark .ai-skill-center .skill-name span {
  color: rgba(255, 255, 255, 0.52) !important;
}

body.dark .ai-skill-center .stat-card,
.basic-layout-wrapper.dark .ai-skill-center .stat-card,
body.dark .ai-skill-center .skill-tabs,
.basic-layout-wrapper.dark .ai-skill-center .skill-tabs,
body.dark .ai-skill-center .tool-card,
.basic-layout-wrapper.dark .ai-skill-center .tool-card,
body.dark .ai-skill-center .install-panel,
.basic-layout-wrapper.dark .ai-skill-center .install-panel,
body.dark .ai-skill-center .install-rules,
.basic-layout-wrapper.dark .ai-skill-center .install-rules {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background: #111 !important;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28) !important;
}

body.dark .ai-skill-center .skill-tabs,
.basic-layout-wrapper.dark .ai-skill-center .skill-tabs {
  padding-top: 8px;
}

body.dark .ai-skill-center .skill-name strong,
.basic-layout-wrapper.dark .ai-skill-center .skill-name strong,
body.dark .ai-skill-center .tool-card-head strong,
.basic-layout-wrapper.dark .ai-skill-center .tool-card-head strong,
body.dark .ai-skill-center .install-panel h3,
.basic-layout-wrapper.dark .ai-skill-center .install-panel h3,
body.dark .ai-skill-center .install-rules h3,
.basic-layout-wrapper.dark .ai-skill-center .install-rules h3 {
  color: rgba(255, 255, 255, 0.9) !important;
}

body.dark .ai-skill-center .toolbar .ant-checkbox-wrapper,
.basic-layout-wrapper.dark .ai-skill-center .toolbar .ant-checkbox-wrapper,
body.dark .ai-skill-center .install-rules li,
.basic-layout-wrapper.dark .ai-skill-center .install-rules li {
  color: rgba(255, 255, 255, 0.72) !important;
}

body.dark .ai-skill-center .ant-tabs-bar,
.basic-layout-wrapper.dark .ai-skill-center .ant-tabs-bar {
  border-bottom-color: rgba(255, 255, 255, 0.1) !important;
}

body.dark .ai-skill-center .ant-tabs-tab,
.basic-layout-wrapper.dark .ai-skill-center .ant-tabs-tab {
  color: rgba(255, 255, 255, 0.58) !important;
}

body.dark .ai-skill-center .ant-tabs-tab:hover,
.basic-layout-wrapper.dark .ai-skill-center .ant-tabs-tab:hover,
body.dark .ai-skill-center .ant-tabs-tab-active,
.basic-layout-wrapper.dark .ai-skill-center .ant-tabs-tab-active {
  color: var(--primary-color, #1890ff) !important;
}

body.dark .ai-skill-center .ant-tabs-ink-bar,
.basic-layout-wrapper.dark .ai-skill-center .ant-tabs-ink-bar {
  background: var(--primary-color, #1890ff) !important;
}

body.dark .ai-skill-center .ant-input,
.basic-layout-wrapper.dark .ai-skill-center .ant-input,
body.dark .ai-skill-center .ant-input-search .ant-input,
.basic-layout-wrapper.dark .ai-skill-center .ant-input-search .ant-input,
body.dark .ai-skill-center .ant-select-selection,
.basic-layout-wrapper.dark .ai-skill-center .ant-select-selection,
body.dark .ai-skill-center .manifest-editor,
.basic-layout-wrapper.dark .ai-skill-center .manifest-editor {
  background: #0a0a0a !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  color: rgba(255, 255, 255, 0.86) !important;
}

body.dark .ai-skill-center .ant-input::placeholder,
.basic-layout-wrapper.dark .ai-skill-center .ant-input::placeholder {
  color: rgba(255, 255, 255, 0.36) !important;
}

body.dark .ai-skill-center .ant-table,
.basic-layout-wrapper.dark .ai-skill-center .ant-table {
  background: #101010 !important;
  color: rgba(255, 255, 255, 0.82) !important;
}

body.dark .ai-skill-center .ant-table-thead > tr > th,
.basic-layout-wrapper.dark .ai-skill-center .ant-table-thead > tr > th {
  background: #0d0d0d !important;
  border-bottom-color: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.68) !important;
}

body.dark .ai-skill-center .ant-table-tbody > tr > td,
.basic-layout-wrapper.dark .ai-skill-center .ant-table-tbody > tr > td {
  background: #111 !important;
  border-bottom-color: rgba(255, 255, 255, 0.08) !important;
}

body.dark .ai-skill-center .ant-table-tbody > tr:hover > td,
.basic-layout-wrapper.dark .ai-skill-center .ant-table-tbody > tr:hover > td {
  background: #181818 !important;
}

body.dark .ai-skill-center .ant-table-placeholder,
.basic-layout-wrapper.dark .ai-skill-center .ant-table-placeholder {
  background: #111 !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.45) !important;
}

body.dark .ai-skill-center .ant-pagination-item,
.basic-layout-wrapper.dark .ai-skill-center .ant-pagination-item,
body.dark .ai-skill-center .ant-pagination-prev .ant-pagination-item-link,
.basic-layout-wrapper.dark .ai-skill-center .ant-pagination-prev .ant-pagination-item-link,
body.dark .ai-skill-center .ant-pagination-next .ant-pagination-item-link,
.basic-layout-wrapper.dark .ai-skill-center .ant-pagination-next .ant-pagination-item-link {
  background: #111 !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
}

body.dark .ai-skill-center .ant-pagination-item a,
.basic-layout-wrapper.dark .ai-skill-center .ant-pagination-item a,
body.dark .ai-skill-center .ant-pagination-prev .ant-pagination-item-link,
.basic-layout-wrapper.dark .ai-skill-center .ant-pagination-prev .ant-pagination-item-link,
body.dark .ai-skill-center .ant-pagination-next .ant-pagination-item-link,
.basic-layout-wrapper.dark .ai-skill-center .ant-pagination-next .ant-pagination-item-link {
  color: rgba(255, 255, 255, 0.62) !important;
}

body.dark .ai-skill-modal {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body {
    background: #121212;
    color: rgba(255, 255, 255, 0.86);
  }

  .ant-modal-header,
  .ant-modal-footer,
  .ant-descriptions-bordered .ant-descriptions-item-label,
  .ant-descriptions-bordered .ant-descriptions-item-content {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .ant-modal-title,
  .detail-content h4 {
    color: rgba(255, 255, 255, 0.9);
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.56);
  }

  .ant-modal-close:hover {
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-descriptions-view {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .ant-descriptions-bordered .ant-descriptions-item-label {
    background: #161616;
    color: rgba(255, 255, 255, 0.6);
  }

  .ant-descriptions-bordered .ant-descriptions-item-content {
    background: #121212;
    color: rgba(255, 255, 255, 0.84);
  }
}
</style>
