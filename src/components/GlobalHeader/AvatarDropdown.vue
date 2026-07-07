<template>
  <span v-if="currentUser && currentUser.name" class="ant-pro-account-avatar qd-account-trigger">
      <a-dropdown placement="bottomRight" overlayClassName="qd-account-dropdown">
      <span class="account-identity" @click.stop="handleProfile">
        <a-avatar :size="28" :src="currentUser.avatar" class="antd-pro-global-header-index-avatar" />
        <span class="account-name">{{ currentUser.name }}</span>
      </span>
        <a-menu slot="overlay" mode="vertical" class="qd-account-menu" :selected-keys="[]">
          <a-menu-item key="profile" @click="handleProfile">
            <a-icon type="user" />
            {{ $t('menu.myProfile') || $t('menu.profile') || 'Profile' }}
          </a-menu-item>
          <a-menu-item key="logout" @click="handleLogout">
            <a-icon type="logout" />
            {{ $t('menu.account.logout') }}
          </a-menu-item>
        </a-menu>
      </a-dropdown>
      <span class="account-credits" @click.stop="handleCredits">
        <a-icon type="wallet" />
        <strong>{{ formattedCredits }}</strong>
      </span>
      <a-button size="small" type="primary" class="account-recharge" @click.stop="handleBilling">
        <span>{{ $t('profile.credits.rechargeShort') || '充值' }}</span>
      </a-button>
    </span>
  <span v-else>
    <a-spin size="small" :style="{ marginLeft: 8, marginRight: 8 }" />
  </span>
</template>

<script>
import { Modal } from 'ant-design-vue'
import { getMembershipPlans } from '@/api/billing'

export default {
  name: 'AvatarDropdown',
  props: {
    currentUser: {
      type: Object,
      default: () => null
    },
    menu: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      credits: null
    }
  },
  computed: {
    formattedCredits () {
      const value = this.credits !== null && typeof this.credits !== 'undefined'
        ? this.credits
        : (this.currentUser.credits || 0)
      return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    }
  },
  mounted () {
    this.loadCredits()
  },
  methods: {
    async loadCredits () {
      try {
        const res = await getMembershipPlans()
        if (res && res.code === 1 && res.data && res.data.billing) {
          this.credits = res.data.billing.credits || 0
        }
      } catch (_) {}
    },
    handleProfile () {
      this.$router.push({ name: 'Profile' }).catch(() => {})
    },
    handleBilling () {
      this.$router.push({ name: 'Billing' }).catch(() => {})
    },
    handleCredits () {
      this.$router.push({ name: 'Profile', query: { tab: 'credits' } }).catch(() => {})
    },
    handleLogout (e) {
      Modal.confirm({
        title: this.$t('layouts.usermenu.dialog.title'),
        content: this.$t('layouts.usermenu.dialog.content'),
        onOk: () => {
          // return new Promise((resolve, reject) => {
          //   setTimeout(Math.random() > 0.5 ? resolve : reject, 1500)
          // }).catch(() => console.log('Oops errors!'))
          return this.$store.dispatch('Logout').then(() => {
            this.$router.push({ name: 'login' })
          })
        },
        onCancel () {}
      })
    }
  }
}
</script>

<style lang="less">
.qd-account-trigger {
  display: inline-flex !important;
  align-items: center !important;
  gap: 14px;
  min-width: 0;
  height: 64px !important;
  margin-right: 18px;
  padding: 0 6px !important;
  line-height: normal !important;
  vertical-align: top;

  .account-identity {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    height: 32px;
    padding: 0 9px 0 4px;
    border-radius: 9px;
    line-height: 32px;
    cursor: pointer;
    transition: background 0.16s ease, color 0.16s ease;

    &:hover {
      background: rgba(15, 23, 42, 0.05);
      color: var(--primary-color, #1890ff);
    }
  }

  .antd-pro-global-header-index-avatar {
    flex: 0 0 auto;
    margin: 0 !important;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  }

  .account-name {
    max-width: 120px;
    overflow: hidden;
    color: rgba(15, 23, 42, 0.86);
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-credits {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 11px;
    border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 18%, transparent);
    border-radius: 9px;
    background: color-mix(in srgb, var(--primary-color, #1890ff) 5%, #fff);
    color: var(--primary-color, #1890ff);
    font-size: 12px;
    font-weight: 600;
    line-height: 30px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.16s ease, border-color 0.16s ease;

    &:hover {
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, transparent);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, #fff);
    }

    .anticon {
      font-size: 13px;
    }

    strong {
      color: var(--primary-color, #1890ff);
      font-size: 13px;
      font-weight: 700;
    }
  }

  .account-recharge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 15px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 600;
    line-height: 30px;
    box-shadow: 0 3px 8px color-mix(in srgb, var(--primary-color, #1890ff) 22%, transparent);

    span {
      line-height: 1;
    }
  }
}

.qd-account-dropdown {
  width: 172px;
  min-width: 172px;

  .qd-account-menu.ant-menu,
  .qd-account-menu.ant-dropdown-menu {
    display: flex !important;
    flex-direction: column !important;
    width: 172px !important;
    min-width: 172px !important;
    padding: 6px !important;
    border: 0;
    border-radius: 8px;
    box-sizing: border-box;
  }

  .qd-account-menu .ant-menu-item,
  .qd-account-menu .ant-dropdown-menu-item {
    display: flex !important;
    align-items: center;
    flex: 0 0 auto;
    float: none !important;
    clear: both;
    width: 160px !important;
    height: 36px !important;
    min-width: 160px !important;
    margin: 0 !important;
    padding: 0 10px !important;
    border-radius: 6px;
    line-height: 36px !important;
    white-space: nowrap;
    box-sizing: border-box;

    & + .ant-menu-item,
    & + .ant-dropdown-menu-item {
      margin-top: 4px;
    }

    .anticon {
      margin-right: 8px;
      line-height: 1;
    }
  }
}

body.dark .qd-account-trigger,
body.realdark .qd-account-trigger,
.ant-layout.dark .qd-account-trigger,
.ant-layout.realdark .qd-account-trigger,
.ant-pro-layout.dark .qd-account-trigger,
.ant-pro-layout.realdark .qd-account-trigger {
  .account-credits {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: var(--primary-color, #1890ff) !important;

    &:hover {
      border-color: color-mix(in srgb, var(--primary-color, #1890ff) 36%, transparent);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
    }
  }

  .account-identity:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .account-name {
    color: rgba(248, 250, 252, 0.92) !important;
  }
}

body.dark .qd-account-trigger,
body.realdark .qd-account-trigger,
.ant-layout.dark .qd-account-trigger,
.ant-layout.realdark .qd-account-trigger,
.ant-pro-layout.dark .qd-account-trigger,
.ant-pro-layout.realdark .qd-account-trigger {
  background: transparent;
}

.ant-pro-drop-down {
  .action {
    margin-right: 8px;
  }
  .ant-dropdown-menu-item {
    min-width: 160px;
  }
}

@media (max-width: 1280px) {
  .qd-account-trigger {
    gap: 10px;
    padding-right: 6px !important;

    .account-credits {
      height: 30px;
      padding: 0 9px;
    }

    .account-recharge {
      height: 30px;
      padding: 0 12px;
    }
  }
}

@media (max-width: 920px) {
  .qd-account-trigger {
    .account-name,
    .account-credits,
    .account-recharge {
      display: none;
    }
  }
}

body.dark .ant-dropdown-menu,
body.realdark .ant-dropdown-menu,
.ant-layout.dark .ant-dropdown-menu,
.ant-layout.realdark .ant-dropdown-menu,
.ant-pro-layout.dark .ant-dropdown-menu,
.ant-pro-layout.realdark .ant-dropdown-menu,
body.dark .qd-account-menu.ant-menu,
body.realdark .qd-account-menu.ant-menu,
.ant-layout.dark .qd-account-menu.ant-menu,
.ant-layout.realdark .qd-account-menu.ant-menu,
.ant-pro-layout.dark .qd-account-menu.ant-menu,
.ant-pro-layout.realdark .qd-account-menu.ant-menu {
  background-color: #1f1f1f;
  border: 1px solid #303030;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  .ant-dropdown-menu-item,
  .ant-menu-item {
    color: rgba(255, 255, 255, 0.85);

    &:hover,
    &.ant-dropdown-menu-item-selected,
    &.ant-menu-item-selected {
      background-color: #262626;
      color: var(--primary-color, #1890ff);
    }

    .anticon {
      color: rgba(255, 255, 255, 0.85);
    }
  }

  .ant-dropdown-menu-item-divider {
    background-color: #303030;
  }
}
</style>
