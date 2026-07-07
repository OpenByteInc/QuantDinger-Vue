<template>
  <div class="bot-type-cards">
    <div class="section-header">
      <h3>{{ $t('trading-bot.createNew') }}</h3>
      <p class="section-desc">{{ $t('trading-bot.createNewDesc') }}</p>
    </div>

    <div class="cards-grid">
      <div class="type-card ai-card" @click="$emit('ai-create')">
        <div class="ai-card-glow"></div>
        <div class="card-icon ai-card-icon">
          <a-icon type="thunderbolt" />
        </div>
        <div class="card-body">
          <div class="card-name ai-card-name">{{ $t('trading-bot.ai.cardTitle') }}</div>
          <div class="card-desc ai-card-desc">{{ $t('trading-bot.ai.cardDesc') }}</div>
        </div>
        <div class="card-tags">
          <span class="tag ai-tag">AI</span>
          <span class="tag scene">{{ $t('trading-bot.ai.startBtn') }}</span>
        </div>
        <div class="card-arrow ai-card-arrow">
          <a-icon type="right" />
        </div>
      </div>

      <div
        v-for="bot in botTypes"
        :key="bot.key"
        class="type-card"
        @click="$emit('select', bot.key)"
      >
        <div class="card-icon" :style="{ background: bot.gradient }">
          <a-icon :type="bot.icon" />
        </div>
        <div class="card-body">
          <div class="card-name">{{ bot.name }}</div>
          <div class="card-desc">{{ bot.desc }}</div>
        </div>
        <div class="card-tags">
          <span class="tag" :class="bot.riskClass">{{ bot.riskLabel }}</span>
          <span class="tag scene">{{ bot.scene }}</span>
        </div>
        <div class="card-arrow">
          <a-icon type="right" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'BotTypeCards',
  computed: {
    ...mapGetters(['brokerMarketPolicy']),
    // Bot -> market_category support map, mirrors backend
    // broker_market_policy.BOT_TYPE_MARKETS.  We compute it from the policy
    // snapshot so adding a new market on the backend automatically lights up
    // the corresponding cards here.
    botTypeMarkets () {
      return (this.brokerMarketPolicy && this.brokerMarketPolicy.bot_type_markets) || {}
    },
    botTypes () {
      const all = [
        {
          key: 'grid',
          name: this.$t('trading-bot.type.grid'),
          desc: this.$t('trading-bot.type.gridDesc'),
          icon: 'bar-chart',
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          riskLabel: this.$t('trading-bot.risk.medium'),
          riskClass: 'medium',
          scene: this.$t('trading-bot.scene.range')
        },
        {
          key: 'martingale',
          name: this.$t('trading-bot.type.martingale'),
          desc: this.$t('trading-bot.type.martingaleDesc'),
          icon: 'fall',
          gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          riskLabel: this.$t('trading-bot.risk.high'),
          riskClass: 'high',
          scene: this.$t('trading-bot.scene.dip')
        },
        {
          key: 'trend',
          name: this.$t('trading-bot.type.trend'),
          desc: this.$t('trading-bot.type.trendDesc'),
          icon: 'stock',
          gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          riskLabel: this.$t('trading-bot.risk.medium'),
          riskClass: 'medium',
          scene: this.$t('trading-bot.scene.trending')
        },
        {
          key: 'dca',
          name: this.$t('trading-bot.type.dca'),
          desc: this.$t('trading-bot.type.dcaDesc'),
          icon: 'fund',
          gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          riskLabel: this.$t('trading-bot.risk.low'),
          riskClass: 'low',
          scene: this.$t('trading-bot.scene.longTerm')
        }
      ]
      // Tag each card with the markets it supports so the parent (or the
      // tooltip) can display badges like "Crypto / Forex / USStock". Unknown
      // bots default to all markets.
      return all.map(b => ({
        ...b,
        markets: this.botTypeMarkets[b.key] || ['Crypto']
      }))
    }
  }
}
</script>

<style lang="less" scoped>
.section-header {
  margin-bottom: 16px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px;
    color: #262626;
  }

  .section-desc {
    font-size: 13px;
    color: #8c8c8c;
    margin: 0;
  }
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

.type-card {
  position: relative;
  padding: 20px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: #d9d9d9;

    .card-arrow {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.ai-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 40%, #f093fb 100%);
  border-color: transparent;

  &:hover {
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    border-color: transparent;

    .ai-card-glow {
      opacity: 0.6;
    }

    .ai-card-arrow {
      opacity: 1;
      transform: translateX(0);
      color: #fff;
    }
  }
}

.ai-card-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  filter: blur(40px);
  opacity: 0.3;
  transition: opacity 0.3s;
  pointer-events: none;
}

.ai-card-icon {
  background: rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px);
}

.ai-card-name {
  color: #fff !important;
}

.ai-card-desc {
  color: rgba(255, 255, 255, 0.8) !important;
}

.ai-card-arrow {
  color: rgba(255, 255, 255, 0.7) !important;
}

.ai-tag {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.2) !important;
  font-weight: 700;
}

.ai-card .tag.scene {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.15) !important;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
  flex-shrink: 0;
}

.card-body {
  flex: 1;

  .card-name {
    font-size: 15px;
    font-weight: 600;
    color: #262626;
    margin-bottom: 4px;
  }

  .card-desc {
    font-size: 12px;
    color: #8c8c8c;
    line-height: 1.5;
  }
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;

  .tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;

    &.low {
      color: #52c41a;
      background: rgba(82, 196, 26, 0.1);
    }

    &.medium {
      color: #faad14;
      background: rgba(250, 173, 20, 0.1);
    }

    &.high {
      color: #f5222d;
      background: rgba(245, 34, 45, 0.1);
    }

    &.custom {
      color: #722ed1;
      background: rgba(114, 46, 209, 0.1);
    }

    &.scene {
      color: var(--primary-color, #1890ff);
      background: rgba(24, 144, 255, 0.1);
    }
  }
}

.card-arrow {
  position: absolute;
  top: 20px;
  right: 16px;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.25s ease;
  color: #bfbfbf;
  font-size: 14px;
}

@media (max-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
