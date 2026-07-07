<template>
  <div class="comment-list">
    <div v-if="canComment || isEditing" class="comment-form">
      <div class="form-header" v-if="isEditing">
        <span class="edit-label">{{ $t('community.editComment') }}</span>
        <a-button type="link" size="small" @click="cancelEdit">{{ $t('community.cancelEdit') }}</a-button>
      </div>
      <div class="rating-input">
        <span class="label">{{ $t('community.yourRating') }}:</span>
        <a-rate v-model="formData.rating" />
      </div>
      <a-textarea
        v-model="formData.content"
        :placeholder="$t('community.commentPlaceholder')"
        :rows="3"
        :max-length="500"
      />
      <div class="form-actions">
        <span class="char-count">{{ formData.content.length }}/500</span>
        <a-button type="primary" size="small" :loading="submitting" @click="submitComment">
          {{ isEditing ? $t('community.updateComment') : $t('community.submitComment') }}
        </a-button>
      </div>
    </div>

    <div v-else-if="myComment && !canComment && !isEditing" class="my-comment-hint">
      <a-icon type="check-circle" theme="twoTone" two-tone-color="#52c41a" />
      <span>{{ $t('community.alreadyCommented') }}</span>
      <a-button type="link" size="small" @click="startEdit(myComment)">
        {{ $t('community.editMyComment') }}
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <div v-if="comments.length === 0" class="empty-comments">
        <a-empty :description="$t('community.noComments')" />
      </div>
      <div v-else class="comments">
        <div v-for="comment in comments" :key="comment.id" class="comment-item" :class="{ 'is-mine': comment.user && comment.user.id === currentUserId }">
          <div class="comment-header">
            <a-avatar :src="comment.user && comment.user.avatar" :size="36" />
            <div class="comment-meta">
              <div class="user-name">
                {{ comment.user && comment.user.nickname }}
                <a-tag v-if="comment.user && comment.user.id === currentUserId" size="small" color="blue">{{ $t('community.me') }}</a-tag>
              </div>
              <div class="comment-info">
                <a-rate :value="comment.rating" disabled :style="{ fontSize: '12px' }" />
                <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
                <span v-if="comment.updated_at && comment.updated_at !== comment.created_at" class="edited-tag">
                  ({{ $t('community.edited') }})
                </span>
              </div>
            </div>
            <div v-if="comment.user && comment.user.id === currentUserId" class="comment-actions">
              <a-button type="link" size="small" @click="startEdit(comment)">
                <a-icon type="edit" />
              </a-button>
            </div>
          </div>
          <div class="comment-content">{{ comment.content }}</div>
        </div>
      </div>
    </a-spin>

    <div v-if="hasMore" class="load-more">
      <a-button type="link" @click="$emit('load-more')">
        {{ $t('community.loadMore') }}
      </a-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommentList',
  props: {
    comments: {
      type: Array,
      default: () => []
    },
    total: {
      type: Number,
      default: 0
    },
    loading: {
      type: Boolean,
      default: false
    },
    canComment: {
      type: Boolean,
      default: false
    },
    currentUserId: {
      type: [Number, String],
      default: null
    },
    myComment: {
      type: Object,
      default: null
    }
  },
  data () {
    return {
      submitting: false,
      isEditing: false,
      editingCommentId: null,
      formData: {
        rating: 5,
        content: ''
      }
    }
  },
  computed: {
    hasMore () {
      return this.comments.length < this.total
    }
  },
  watch: {
    myComment: {
      immediate: true,
      handler (val) {
        if (val && this.isEditing) {
          this.formData.rating = val.rating || 5
          this.formData.content = val.content || ''
          this.editingCommentId = val.id
        }
      }
    }
  },
  methods: {
    startEdit (comment) {
      this.isEditing = true
      this.editingCommentId = comment.id
      this.formData.rating = comment.rating || 5
      this.formData.content = comment.content || ''
    },

    cancelEdit () {
      this.isEditing = false
      this.editingCommentId = null
      this.formData = { rating: 5, content: '' }
    },

    async submitComment () {
      if (this.formData.rating < 1) {
        this.$message.warning(this.$t('community.pleaseRate'))
        return
      }

      this.submitting = true
      try {
        const data = {
          rating: this.formData.rating,
          content: this.formData.content.trim()
        }

        if (this.isEditing && this.editingCommentId) {
          await this.$emit('update-comment', {
            comment_id: this.editingCommentId,
            ...data
          })
        } else {
          await this.$emit('add-comment', data)
        }

        this.cancelEdit()
      } finally {
        this.submitting = false
      }
    },

    formatTime (dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const now = new Date()
      const diff = now - date

      if (diff < 60000) {
        return this.$t('community.justNow')
      }
      if (diff < 3600000) {
        const mins = Math.floor(diff / 60000)
        return `${mins} ${this.$t('community.minutesAgo')}`
      }
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000)
        return `${hours} ${this.$t('community.hoursAgo')}`
      }
      if (diff < 2592000000) {
        const days = Math.floor(diff / 86400000)
        return `${days} ${this.$t('community.daysAgo')}`
      }
      return date.toLocaleDateString()
    }
  }
}
</script>

<style lang="less" scoped>
.comment-list {
  .comment-form {
    margin-bottom: 20px;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 8px;

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .edit-label {
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-color, #1890ff);
      }
    }

    .rating-input {
      margin-bottom: 12px;

      .label {
        margin-right: 8px;
        font-size: 14px;
      }
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;

      .char-count {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
      }
    }
  }

  .my-comment-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    border-radius: 8px;

    span {
      color: #52c41a;
      font-size: 14px;
    }
  }

  .empty-comments {
    padding: 40px 0;
  }

  .comments {
    .comment-item {
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      &.is-mine {
        background: rgba(24, 144, 255, 0.02);
        padding: 16px;
        margin: 0 -16px;
        border-radius: 8px;
      }

      .comment-header {
        display: flex;
        align-items: flex-start;
        margin-bottom: 8px;

        .comment-meta {
          flex: 1;
          margin-left: 12px;

          .user-name {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            color: rgba(0, 0, 0, 0.85);
          }

          .comment-info {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 2px;

            .comment-time {
              font-size: 12px;
              color: rgba(0, 0, 0, 0.45);
            }

            .edited-tag {
              font-size: 12px;
              color: rgba(0, 0, 0, 0.35);
              font-style: italic;
            }
          }
        }

        .comment-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
      }

      &:hover .comment-actions {
        opacity: 1;
      }

      .comment-content {
        font-size: 14px;
        line-height: 1.6;
        color: rgba(0, 0, 0, 0.65);
        margin-left: 48px;
        white-space: pre-wrap;
        word-break: break-word;
      }
    }
  }

  .load-more {
    text-align: center;
    padding: 12px 0;
  }
}

body.dark,
.dark,
[data-theme='dark'] {
  .comment-list {
    .comment-form {
      background: #262626;
    }

    ::v-deep .ant-input,
    ::v-deep .ant-input:hover,
    ::v-deep .ant-input:focus {
      background: #1f1f1f;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.88);
    }

    ::v-deep .ant-rate {
      color: #fadb14;
    }

    .my-comment-hint {
      background: rgba(82, 196, 26, 0.1);
      border-color: rgba(82, 196, 26, 0.3);

      span {
        color: #95de64;
      }
    }

    .comments .comment-item {
      border-color: #303030;

      &.is-mine {
        background: rgba(24, 144, 255, 0.05);
      }

      .comment-header .comment-meta {
        .user-name {
          color: rgba(255, 255, 255, 0.85);
        }

        .comment-info {
          .comment-time {
            color: rgba(255, 255, 255, 0.45);
          }

          .edited-tag {
            color: rgba(255, 255, 255, 0.35);
          }
        }
      }

      .comment-content {
        color: rgba(255, 255, 255, 0.65);
      }
    }
  }
}
</style>
