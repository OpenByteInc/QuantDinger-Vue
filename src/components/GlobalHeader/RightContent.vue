<template>
  <div :class="wrpCls">
    <avatar-dropdown :menu="true" :current-user="currentUser" :class="prefixCls" />
    <notice-icon :class="prefixCls" />
    <select-lang :class="prefixCls" />
    <a-tooltip :title="$t('app.setting.tooltip')">
      <span :class="prefixCls" @click="handleSettingClick">
        <a-icon type="setting" style="font-size: 16px;" />
      </span>
    </a-tooltip>
  </div>
</template>

<script>
import AvatarDropdown from './AvatarDropdown'
import SelectLang from '@/components/SelectLang'
import NoticeIcon from '@/components/NoticeIcon'
import { mapGetters } from 'vuex'

export default {
  name: 'RightContent',
  components: {
    AvatarDropdown,
    SelectLang,
    NoticeIcon
  },
  props: {
    prefixCls: {
      type: String,
      default: 'ant-pro-global-header-index-action'
    },
    isMobile: {
      type: Boolean,
      default: () => false
    },
    topMenu: {
      type: Boolean,
      required: true
    },
    theme: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      apiBase: 'https://api.quantdinger.com/'
    }
  },
  methods: {
    handleSettingClick () {
      this.$root.$emit('show-setting-drawer')
    }
  },
  computed: {
    ...mapGetters(['nickname', 'avatar', 'userInfo']),
    currentUser () {
      return {
        name: this.nickname,
        avatar: this.avatar,
        credits: this.userInfo && this.userInfo.credits
      }
    },
    wrpCls () {
      return {
        'ant-pro-global-header-index-right': true,
        [`ant-pro-global-header-index-${(this.isMobile || !this.topMenu) ? 'light' : this.theme}`]: true
      }
    }
  }
}
</script>

<style lang="less">
@import '@/styles/antd-vars.less';

.ant-pro-global-header-index-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  .ant-pro-global-header-index-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: @layout-header-height;
    padding: 0 12px;
    color: rgba(0, 0, 0, 0.65);
    transition: all 0.3s;
    cursor: pointer;
    vertical-align: top;

    &:hover {
      color: @primary-color;
      background: rgba(0, 0, 0, 0.04);
    }
  }
}

@media (max-width: 768px) {
  .ant-pro-global-header-index-right {
    .ant-pro-global-header-index-action {
      padding: 0 8px;
    }

    .ant-pro-drop-down,
    .ant-pro-account-avatar {
      padding: 0 8px;
    }
  }
}

body.dark,
body.realdark,
.ant-layout.dark,
.ant-layout.realdark,
.ant-pro-layout.dark,
.ant-pro-layout.realdark {
  .ant-pro-global-header-index-right {
    color: rgba(255, 255, 255, 0.85) !important;

    * {
      color: rgba(255, 255, 255, 0.85) !important;
    }

    .ant-pro-global-header-index-action {
      color: rgba(255, 255, 255, 0.85) !important;

      &:hover {
        color: var(--primary-color, #1890ff) !important;
        background: rgba(255, 255, 255, 0.08) !important;
      }
    }

    .ant-pro-account-avatar {
      .antd-pro-global-header-index-avatar {
        background: rgba(255, 255, 255, 0.25) !important;
      }
    }

    .ant-pro-drop-down,
    .ant-dropdown-trigger {
      color: rgba(255, 255, 255, 0.85) !important;

      &:hover {
        color: var(--primary-color, #1890ff) !important;
        background: rgba(255, 255, 255, 0.08) !important;
      }

      .anticon {
        color: rgba(255, 255, 255, 0.85) !important;
      }
    }
  }
}
</style>

