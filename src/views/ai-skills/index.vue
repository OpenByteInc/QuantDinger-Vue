<template>
  <div class="ai-skill-center qd-workspace-page qd-page-frame">
    <div class="page-header qd-page-heading">
      <div class="page-header-copy qd-page-heading__copy">
        <h2 class="page-title qd-page-heading__title">
          <a-icon class="qd-page-heading__icon" type="robot" />
          <span>{{ text.title }}</span>
        </h2>
        <p class="page-desc qd-page-heading__description">{{ text.subtitle }}</p>
      </div>
      <div class="page-actions">
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
              <a-icon :type="skillIcon(record)" />
              <div>
                <strong>{{ record.label }}</strong>
                <span>{{ record.id }}</span>
              </div>
            </div>
          </template>
          <template slot="source" slot-scope="textValue, record">
            <a-tag :color="record.builtin ? 'blue' : 'purple'">{{ record.builtin ? text.builtin : text.installed }}</a-tag>
          </template>
          <template slot="category" slot-scope="textValue">
            {{ categoryLabel(textValue) }}
          </template>
          <template slot="risk" slot-scope="textValue, record">
            <a-tag :color="riskColor(record.risk_level)">{{ riskLabel(record.risk_level) }}</a-tag>
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
              <a-tag :color="riskColor(tool.risk_level)">{{ riskLabel(tool.risk_level) }}</a-tag>
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
          <a-descriptions-item :label="text.id">{{ detailSkill.id }}</a-descriptions-item>
          <a-descriptions-item :label="text.category">{{ categoryLabel(detailSkill.category) }}</a-descriptions-item>
          <a-descriptions-item :label="text.source">{{ sourceLabel(detailSkill) }}</a-descriptions-item>
          <a-descriptions-item :label="text.risk">{{ riskLabel(detailSkill.risk_level) }}</a-descriptions-item>
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
    text () {
      const t = key => this.$t(`aiSkills.${key}`)
      return {
        title: t('title'),
        subtitle: t('subtitle'),
        refresh: t('refresh'),
        install: t('install'),
        skills: t('skills'),
        tools: t('tools'),
        allCategories: t('allCategories'),
        searchSkills: t('searchSkills'),
        showDisabled: t('showDisabled'),
        builtin: t('builtin'),
        installed: t('installed'),
        detail: t('detail'),
        delete: t('delete'),
        deleteConfirm: t('deleteConfirm'),
        readOnly: t('readOnly'),
        writeTool: t('writeTool'),
        installTitle: t('installTitle'),
        installHint: t('installHint'),
        example: t('example'),
        safetyTitle: t('safetyTitle'),
        rulePromptOnly: t('rulePromptOnly'),
        ruleNoCode: t('ruleNoCode'),
        ruleBoundary: t('ruleBoundary'),
        ruleUserControl: t('ruleUserControl'),
        category: t('category'),
        source: t('source'),
        risk: t('risk'),
        requires: t('requires'),
        produces: t('produces'),
        promptTemplate: t('promptTemplate'),
        enabled: t('enabled'),
        availableToAgent: t('availableToAgent'),
        userExtensions: t('userExtensions'),
        skill: t('skill'),
        actions: t('actions'),
        id: t('id')
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
        { key: 'enabled', label: this.text.enabled, value: enabled, help: this.text.availableToAgent },
        { key: 'installed', label: this.text.installed, value: installed, help: this.text.userExtensions },
        { key: 'tools', label: this.text.tools, value: this.tools.length, help: `${writeTools} ${this.text.writeTool}` }
      ]
    },
    skillColumns () {
      return [
        { title: this.text.skill, dataIndex: 'label', scopedSlots: { customRender: 'label' } },
        { title: this.text.category, dataIndex: 'category', width: 140, scopedSlots: { customRender: 'category' } },
        { title: this.text.source, dataIndex: 'source', width: 120, scopedSlots: { customRender: 'source' } },
        { title: this.text.risk, dataIndex: 'risk_level', width: 130, scopedSlots: { customRender: 'risk' } },
        { title: this.text.enabled, dataIndex: 'enabled', width: 90, scopedSlots: { customRender: 'enabled' } },
        { title: this.text.actions, dataIndex: 'actions', width: 140, scopedSlots: { customRender: 'actions' } }
      ]
    }
  },
  mounted () {
    this.fillExample()
    this.loadAll()
  },
  watch: {
    '$i18n.locale' () {
      this.detailSkill = null
      this.fillExample()
      this.loadAll()
    }
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
      const res = await getAiSkills({ language: this.$i18n?.locale || 'en-US', include_disabled: this.showDisabled ? 1 : 0 })
      this.registry = res.data || res
    },
    async loadTools () {
      const res = await getAiTools({ language: this.$i18n?.locale || 'en-US' })
      this.toolsRegistry = res.data || res
    },
    riskColor (risk) {
      if (risk === 'read') return 'green'
      if (risk === 'write_draft') return 'blue'
      if (risk === 'write_config') return 'orange'
      return 'default'
    },
    categoryLabel (category) {
      const key = `aiSkills.categoryLabels.${category}`
      const label = this.$t(key)
      return label === key ? category : label
    },
    riskLabel (risk) {
      const key = `aiSkills.riskLabels.${risk}`
      const label = this.$t(key)
      return label === key ? risk : label
    },
    sourceLabel (record) {
      if (record?.builtin) return this.text.builtin
      if (!record?.source || record.source === 'installed') return this.text.installed
      return record.source
    },
    skillIcon (record) {
      if (record?.icon === 'function') return 'file-protect'
      return record?.icon || 'experiment'
    },
    openSkill (record) {
      this.detailSkill = record
    },
    async toggleSkill (record, checked) {
      try {
        await updateAiSkill(record.id, { enabled: checked, language: this.$i18n?.locale || 'en-US' })
        this.$message.success(this.$t('aiSkills.updated'))
        await this.loadSkills()
      } catch (e) {
        this.$message.error(e.message || this.$t('aiSkills.updateFailed'))
      }
    },
    async removeSkill (record) {
      try {
        await deleteAiSkill(record.id)
        this.$message.success(this.$t('aiSkills.deleted'))
        await this.loadSkills()
      } catch (e) {
        this.$message.error(e.message || this.$t('aiSkills.deleteFailed'))
      }
    },
    fillExample () {
      this.manifestText = JSON.stringify({
        id: 'btc_breakout_coach',
        kind: 'prompt',
        category: 'research',
        icon: 'line-chart',
        label: { zh: this.$t('aiSkills.exampleManifest.labelZh'), en: this.$t('aiSkills.exampleManifest.labelEn') },
        description: { zh: this.$t('aiSkills.exampleManifest.descriptionZh'), en: this.$t('aiSkills.exampleManifest.descriptionEn') },
        prompt_template: {
          zh: this.$t('aiSkills.exampleManifest.promptZh'),
          en: this.$t('aiSkills.exampleManifest.promptEn')
        },
        system_instruction: this.$t('aiSkills.exampleManifest.systemInstruction'),
        keywords: ['breakout', 'BTC', this.$t('aiSkills.exampleManifest.keywordBreakout'), this.$t('aiSkills.exampleManifest.keywordFakeout')],
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
        this.$message.error(this.$t('aiSkills.invalidJson'))
        return
      }
      this.installing = true
      try {
        await installAiSkill({ skill: payload, language: this.$i18n?.locale || 'en-US' })
        this.$message.success(this.$t('aiSkills.installedSuccess'))
        this.activeTab = 'skills'
        await this.loadSkills()
      } catch (e) {
        this.$message.error(e.message || this.$t('aiSkills.installFailed'))
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
  padding: var(--qd-page-gutter, 16px);
  color: var(--text-color, #10213d);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;

  .page-header-copy {
    max-width: 720px;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 8px;
    color: #1e3a5f;
    font-size: 24px;
    font-weight: 700;

    .anticon {
      color: var(--primary-color, #1890ff);
      font-size: 28px;
    }
  }

  .page-desc {
    margin: 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
  }
}

.page-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 0 0 18px;
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

.install-panel > p {
  color: #64748b;
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

  .stat-card,
  .skill-tabs,
  .install-panel,
  .install-rules,
  .tool-card {
    border-color: rgba(255, 255, 255, 0.1);
    background: #121212;
    box-shadow: none;
  }

  .page-header .page-desc,
  .stat-card small,
  .stat-card .stat-label,
  .install-panel > p,
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

  .stat-card,
  .skill-tabs,
  .install-panel,
  .install-rules {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(18, 18, 18, 0.82);
    box-shadow: none;
  }

  .page-header .page-desc,
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
    padding: var(--qd-page-gutter, 12px);
  }

  .page-header,
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

body.dark .ai-skill-center .page-title,
.basic-layout-wrapper.dark .ai-skill-center .page-title,
body.dark .ai-skill-center .stat-card strong,
.basic-layout-wrapper.dark .ai-skill-center .stat-card strong {
  color: rgba(255, 255, 255, 0.94) !important;
}

body.dark .ai-skill-center .page-desc,
.basic-layout-wrapper.dark .ai-skill-center .page-desc,
body.dark .ai-skill-center .stat-card small,
.basic-layout-wrapper.dark .ai-skill-center .stat-card small,
body.dark .ai-skill-center .stat-card .stat-label,
.basic-layout-wrapper.dark .ai-skill-center .stat-card .stat-label,
body.dark .ai-skill-center .install-panel > p,
.basic-layout-wrapper.dark .ai-skill-center .install-panel > p,
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
