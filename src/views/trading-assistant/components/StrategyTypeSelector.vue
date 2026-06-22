<template>
  <div class="strategy-type-selector" :class="{ 'theme-dark': isDark }">
    <div class="selector-header">
      <h3>{{ $t('trading-assistant.selectMode') }}</h3>
      <p class="selector-hint">{{ $t('trading-assistant.selectModeHint') }}</p>
    </div>

    <div class="mode-cards">
      <!-- Signal Strategy Card -->
      <div
        v-if="variant !== 'script'"
        class="mode-card"
        :class="{ selected: selected === 'signal' }"
        @click="$emit('select', 'signal')"
      >
        <div class="card-icon signal-icon">
          <a-icon type="line-chart" />
        </div>
        <div class="card-body">
          <div class="card-badge-row">
            <span class="card-badge">{{ $t('trading-assistant.strategyMode.signalBadge') }}</span>
          </div>
          <h4>{{ $t('trading-assistant.strategyMode.signal') }}</h4>
          <p class="card-desc">{{ $t('trading-assistant.strategyMode.signalDesc') }}</p>
          <ul class="card-features">
            <li><a-icon type="check" /> {{ $t('trading-assistant.strategyMode.signalFeature1') }}</li>
            <li><a-icon type="check" /> {{ $t('trading-assistant.strategyMode.signalFeature2') }}</li>
            <li><a-icon type="check" /> {{ $t('trading-assistant.strategyMode.signalFeature3') }}</li>
          </ul>
        </div>
        <a-button type="primary" ghost class="card-btn" @click.stop="$emit('select', 'signal')">
          {{ $t('trading-assistant.useThisMode') }}
        </a-button>
      </div>

      <!-- Script Strategy Card -->
      <div
        v-if="variant !== 'signal'"
        class="mode-card"
        :class="{ selected: selected === 'script' }"
        @click="$emit('select', 'script')"
      >
        <div class="card-icon script-icon">
          <a-icon type="code" />
        </div>
        <div class="card-body">
          <div class="card-badge-row">
            <span class="card-badge card-badge--script">{{ $t('trading-assistant.strategyMode.scriptBadge') }}</span>
          </div>
          <h4>{{ $t('trading-assistant.strategyMode.script') }}</h4>
          <p class="card-desc">{{ $t('trading-assistant.strategyMode.scriptDesc') }}</p>
          <ul class="card-features">
            <li><a-icon type="check" /> {{ $t('trading-assistant.strategyMode.scriptFeature1') }}</li>
            <li><a-icon type="check" /> {{ $t('trading-assistant.strategyMode.scriptFeature2') }}</li>
            <li><a-icon type="check" /> {{ $t('trading-assistant.strategyMode.scriptFeature3') }}</li>
          </ul>
        </div>
        <a-button type="primary" ghost class="card-btn" @click.stop="$emit('select', 'script')">
          {{ $t('trading-assistant.useThisMode') }}
        </a-button>
      </div>
    </div>

    <div v-if="variant === 'all' || variant === 'script'" class="template-quick-start">
      <a-divider>
        <span class="divider-text">{{ $t('trading-assistant.fromTemplate') }}</span>
      </a-divider>
      <div class="template-tags">
        <a-tag
          v-for="tpl in templates"
          :key="tpl.key"
          class="template-tag"
          @click="$emit('use-template', tpl.key)"
        >
          <span class="tpl-icon">{{ tpl.icon }}</span>
          {{ $t(`trading-assistant.template.${tpl.key}`) }}
        </a-tag>
      </div>
    </div>
  </div>
</template>

<script>
import { SCRIPT_TEMPLATE_CATALOG } from './scriptTemplateCatalog'

export default {
  name: 'StrategyTypeSelector',
  props: {
    selected: { type: String, default: '' },
    isDark: { type: Boolean, default: false },
    variant: {
      type: String,
      default: 'all',
      validator: (v) => ['all', 'signal', 'script'].includes(v)
    }
  },
  data () {
    return {
      templates: SCRIPT_TEMPLATE_CATALOG.map(item => ({ key: item.key, icon: item.icon }))
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-type-selector {
  padding: 8px 0;
}

.selector-header {
  text-align: center;
  margin-bottom: 24px;

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 600;
  }

  .selector-hint {
    color: #999;
    font-size: 13px;
    margin: 0;
  }
}

.mode-cards {
  display: flex;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.mode-card {
  flex: 1;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: #1890ff;
    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.12);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: #1890ff;
    background: rgba(24, 144, 255, 0.02);

    &::after {
      content: '✓';
      position: absolute;
      top: 8px;
      right: 12px;
      color: #1890ff;
      font-size: 18px;
      font-weight: bold;
    }
  }
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin-bottom: 16px;

  &.signal-icon {
    background: linear-gradient(135deg, #e6f7ff, #bae7ff);
    color: #1890ff;
  }

  &.script-icon {
    background: linear-gradient(135deg, #f6ffed, #d9f7be);
    color: #52c41a;
  }
}

.card-body {
  flex: 1;

  .card-badge-row {
    margin-bottom: 10px;
  }

  .card-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(24, 144, 255, 0.08);
    color: #1890ff;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;

    &.card-badge--script {
      background: rgba(82, 196, 26, 0.12);
      color: #389e0d;
    }
  }

  h4 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .card-desc {
    color: #666;
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 12px;
  }
}

.card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  text-align: left;

  li {
    font-size: 13px;
    color: #555;
    padding: 3px 0;

    .anticon {
      color: #52c41a;
      margin-right: 6px;
      font-size: 12px;
    }
  }
}

.card-btn {
  width: 100%;
}

.template-quick-start {
  margin-top: 8px;

  .divider-text {
    color: #999;
    font-size: 13px;
  }
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.template-tag {
  cursor: pointer;
  padding: 4px 12px;
  font-size: 13px;
  border-radius: 16px;
  transition: all 0.2s;

  .tpl-icon {
    margin-right: 4px;
  }

  &:hover {
    color: #1890ff;
    border-color: #1890ff;
    background: #e6f7ff;
  }
}

.theme-dark {
  .selector-header {
    h3 { color: #e0e6ed; }
    .selector-hint { color: rgba(255, 255, 255, 0.4); }
  }

  .mode-card {
    border-color: rgba(255, 255, 255, 0.08);
    background: #1c1c1c;

    &:hover {
      border-color: #177ddc;
      box-shadow: 0 4px 16px rgba(23, 125, 220, 0.2);
    }

    &.selected {
      border-color: #177ddc;
      background: rgba(23, 125, 220, 0.06);

      &::after {
        color: #40a9ff;
      }
    }
  }

  .card-icon {
    &.signal-icon {
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.15), rgba(24, 144, 255, 0.08));
      color: #40a9ff;
    }

    &.script-icon {
      background: linear-gradient(135deg, rgba(82, 196, 26, 0.15), rgba(82, 196, 26, 0.08));
      color: #73d13d;
    }
  }

  .card-body {
    h4 { color: #e0e6ed; }
    .card-desc { color: rgba(255, 255, 255, 0.45); }
    .card-badge {
      background: rgba(64, 169, 255, 0.12);
      color: #69c0ff;

      &.card-badge--script {
        background: rgba(115, 209, 61, 0.16);
        color: #95de64;
      }
    }
  }

  .card-features li {
    color: rgba(255, 255, 255, 0.6);

    .anticon { color: #73d13d; }
  }

  .card-btn {
    border-color: rgba(24, 144, 255, 0.4);
    color: #40a9ff;

    &:hover {
      border-color: #1890ff;
      color: #1890ff;
    }
  }

  .template-quick-start {
    ::v-deep .ant-divider-inner-text {
      color: rgba(255, 255, 255, 0.35);
    }

    ::v-deep .ant-divider::before,
    ::v-deep .ant-divider::after {
      border-top-color: rgba(255, 255, 255, 0.08);
    }
  }

  .divider-text {
    color: rgba(255, 255, 255, 0.35);
  }

  .template-tag {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.65);

    &:hover {
      color: #40a9ff;
      border-color: #177ddc;
      background: rgba(23, 125, 220, 0.1);
    }
  }
}
</style>
