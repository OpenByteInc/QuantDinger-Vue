<template>
  <div class="billing-sheet" :class="{ 'is-dark': dark }">
    <div class="billing-sheet-scroll" tabindex="0" role="region" :aria-label="$t('settings.billingPlans.title')">
      <table class="billing-sheet-table" :aria-label="$t('settings.billingPlans.title')">
        <colgroup>
          <col class="code-column">
          <col class="copy-column">
          <col v-for="field in numberFields" :key="field.key" class="number-column">
          <col v-for="field in flagFields" :key="field.key" :class="field.key === 'referral_eligible' ? 'referral-column' : 'flag-column'">
          <col class="stripe-column">
          <col class="action-column">
        </colgroup>
        <thead>
          <tr>
            <th scope="col" class="pinned-code">{{ $t('settings.billingPlans.code') }}</th>
            <th scope="col">{{ $t('settings.billingPlans.name') }}</th>
            <th v-for="field in numberFields" :key="field.key" scope="col" class="number-cell">{{ $t(field.label) }}</th>
            <th v-for="field in flagFields" :key="field.key" scope="col" class="flag-cell">{{ $t(field.label) }}</th>
            <th scope="col">{{ $t('settings.billingPlans.stripePrice') }}</th>
            <th scope="col" class="pinned-action"><span class="visually-hidden">{{ $t('settings.billingPlans.delete') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(plan, index) in plans" :key="plan._key">
            <td class="pinned-code">
              <a-input
                :ref="`code-${plan._key}`"
                :value="plan.code"
                :disabled="!!plan.persisted"
                :aria-label="fieldLabel(plan, 'settings.billingPlans.code')"
                :placeholder="$t('settings.billingPlans.code')"
                @input="change(plan, 'code', $event.target.value)"
              />
            </td>
            <td class="copy-cell">
              <a-input
                :value="plan.name"
                :aria-label="fieldLabel(plan, 'settings.billingPlans.name')"
                :placeholder="$t('settings.billingPlans.name')"
                @input="change(plan, 'name', $event.target.value)"
              />
              <a-textarea
                :value="plan.description"
                :auto-size="{ minRows: 1, maxRows: 3 }"
                :aria-label="fieldLabel(plan, 'settings.billingPlans.description')"
                :placeholder="$t('settings.billingPlans.description')"
                @input="change(plan, 'description', $event.target.value)"
              />
            </td>
            <td v-for="field in numberFields" :key="field.key" class="number-cell">
              <label :for="`plan-${plan._key}-${field.key}`" class="visually-hidden">{{ fieldLabel(plan, field.label) }}</label>
              <a-input-number
                :id="`plan-${plan._key}-${field.key}`"
                :value="plan[field.key]"
                :min="field.min"
                :precision="field.precision"
                :disabled="field.key === 'duration_days' && plan.is_lifetime"
                :aria-label="fieldLabel(plan, field.label)"
                @change="change(plan, field.key, $event)"
              />
            </td>
            <td v-for="field in flagFields" :key="field.key" class="flag-cell">
              <a-checkbox
                :checked="plan[field.key]"
                :aria-label="fieldLabel(plan, field.label)"
                @change="change(plan, field.key, $event.target.checked)"
              ><span class="visually-hidden">{{ fieldLabel(plan, field.label) }}</span></a-checkbox>
            </td>
            <td>
              <a-input
                :value="plan.stripe_price_id"
                :aria-label="fieldLabel(plan, 'settings.billingPlans.stripePrice')"
                :placeholder="$t('settings.billingPlans.stripePrice')"
                @input="change(plan, 'stripe_price_id', $event.target.value)"
              />
            </td>
            <td class="pinned-action">
              <a-tooltip :title="$t('settings.billingPlans.delete')">
                <a-button
                  type="link"
                  class="sheet-remove"
                  :aria-label="fieldLabel(plan, 'settings.billingPlans.delete')"
                  :loading="deletingCode === plan.code"
                  @click="$emit('remove', index)"
                ><a-icon type="delete" /></a-button>
              </a-tooltip>
            </td>
          </tr>
          <tr v-if="!plans.length">
            <td :colspan="numberFields.length + flagFields.length + 4" class="empty-cell">
              <a-button type="dashed" @click="$emit('add')"><a-icon type="plus" /> {{ $t('settings.billingPlans.add') }}</a-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BillingPlanSheet',
  props: {
    plans: { type: Array, default: () => [] },
    deletingCode: { type: String, default: '' },
    dark: { type: Boolean, default: false }
  },
  data () {
    return {
      numberFields: [
        { key: 'price_usd', label: 'settings.billingPlans.price', min: 0, precision: 2 },
        { key: 'duration_days', label: 'settings.billingPlans.days', min: 0 },
        { key: 'credits_once', label: 'settings.billingPlans.onceCredits', min: 0 },
        { key: 'credits_monthly', label: 'settings.billingPlans.monthlyCredits', min: 0 },
        { key: 'strategy_limit', label: 'settings.billingPlans.strategyLimit', min: 1 }
      ],
      flagFields: [
        { key: 'is_active', label: 'settings.billingPlans.active' },
        { key: 'is_lifetime', label: 'settings.billingPlans.lifetime' },
        { key: 'is_popular', label: 'settings.billingPlans.popular' },
        { key: 'referral_eligible', label: 'settings.billingPlans.referralEligible' }
      ]
    }
  },
  methods: {
    change (plan, field, value) {
      this.$emit('change', plan, field, value)
    },
    fieldLabel (plan, label) {
      return `${this.$t(label)} · ${plan.name || plan.code}`
    },
    focusCode (key) {
      const refs = this.$refs[`code-${key}`]
      const input = Array.isArray(refs) ? refs[0] : refs
      if (input) input.focus()
      const scroll = this.$el.querySelector('.billing-sheet-scroll')
      if (scroll) { scroll.scrollTop = 0; scroll.scrollLeft = 0 }
    }
  }
}
</script>

<style lang="less" scoped>
.billing-sheet {
  --sheet-surface: #fff;
  --sheet-header: #f5f6f8;
  --sheet-hover: #fafbfc;
  --sheet-border: #e5e7eb;
  --sheet-text: #28313d;
  --sheet-muted: #697386;
  --sheet-focus: var(--primary-color, #1890ff);
  min-width: 0;

  &.is-dark {
    --sheet-surface: #181818;
    --sheet-header: #222;
    --sheet-hover: #202020;
    --sheet-border: #343434;
    --sheet-text: #e6e8ec;
    --sheet-muted: #9da7b3;
  }
}
.billing-sheet-scroll {
  position: relative;
  max-height: 560px;
  overflow: auto;
  border: 1px solid var(--sheet-border);
  border-radius: 8px;
  scrollbar-color: var(--sheet-muted) var(--sheet-header);
  scrollbar-width: thin;
  &:focus-visible { outline: 2px solid var(--sheet-focus); outline-offset: 2px; }
}
.billing-sheet .billing-sheet-table {
  width: 100%;
  min-width: 1480px;
  table-layout: fixed;
  border-spacing: 0;
  border-collapse: separate;
  font-size: 13px;
  line-height: 20px;
  color: var(--sheet-text);
  font-variant-numeric: tabular-nums;

  .code-column { width: 140px; }
  .copy-column { width: 240px; }
  .number-column { width: 108px; }
  .flag-column { width: 76px; }
  .referral-column { width: 108px; }
  .stripe-column { width: 180px; }
  .action-column { width: 48px; }

  th, td {
    padding: 8px;
    vertical-align: middle;
    background: var(--sheet-surface);
    border-inline-end: 1px solid var(--sheet-border);
    border-bottom: 1px solid var(--sheet-border);
  }
  th {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 48px;
    background: var(--sheet-header);
    font-size: 12px;
    font-weight: 500;
    color: var(--sheet-muted);
    overflow-wrap: anywhere;
  }
  tr:last-child td { border-bottom: 0; }
  th:last-child, td:last-child { border-inline-end: 0; }
  tbody tr:hover td, tbody tr:focus-within td { background: var(--sheet-hover); }
  .pinned-code { position: sticky; left: 0; z-index: 1; }
  .pinned-action { position: sticky; right: 0; z-index: 1; border-inline-start: 1px solid var(--sheet-border); padding: 4px; }
  th.pinned-code, th.pinned-action { z-index: 3; background: var(--sheet-header); }
  .number-cell { text-align: right; }
  .flag-cell { text-align: center; }
  .empty-cell { padding: 24px; text-align: start; }
  .copy-cell ::v-deep textarea { margin-top: 4px; color: var(--sheet-muted); font-size: 12px; }
  .sheet-remove { width: 36px; height: 36px; padding: 0; color: var(--sheet-muted); }
  .sheet-remove:hover, .sheet-remove:focus { color: #ff4d4f; }

  td ::v-deep .ant-input,
  td ::v-deep .ant-input-number {
    width: 100%;
    min-height: 32px;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--sheet-text);
    background: transparent;
    box-shadow: none;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  td ::v-deep .ant-input { padding: 4px 6px; }
  td ::v-deep .ant-input-number-input { height: 30px; padding: 0 6px; text-align: right; color: inherit; background: transparent; }
  td ::v-deep .ant-input-number:hover,
  td ::v-deep .ant-input:hover { border-color: var(--sheet-border); }
  td ::v-deep .ant-input:focus,
  td ::v-deep .ant-input-number-focused { border-color: var(--sheet-focus); background: var(--sheet-surface); box-shadow: 0 0 0 1px var(--sheet-focus); }
  td ::v-deep .ant-input[disabled],
  td ::v-deep .ant-input-number-disabled { color: var(--sheet-muted); background: var(--sheet-header); border-color: transparent; }
  ::v-deep .ant-checkbox-wrapper { padding: 8px; margin: 0; line-height: 16px; }
  ::v-deep .ant-checkbox { top: 0; }
  ::v-deep .ant-checkbox-input:focus-visible + .ant-checkbox-inner { outline: 2px solid var(--sheet-focus); outline-offset: 3px; }
}
.visually-hidden { position: absolute; top: 0; left: 0; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
