<template>
  <div :class="prefixCls">
    <quill-editor
      v-model="content"
      ref="myQuillEditor"
      :options="editorOption"
      @blur="onEditorBlur($event)"
      @focus="onEditorFocus($event)"
      @ready="onEditorReady($event)"
      @change="onEditorChange($event)">
    </quill-editor>

  </div>
</template>

<script>
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'

import { quillEditor } from 'vue-quill-editor'

export default {
  name: 'QuillEditor',
  components: {
    quillEditor
  },
  props: {
    prefixCls: {
      type: String,
      default: 'ant-editor-quill'
    },
    // eslint-disable-next-line
    value: {
      type: String
    }
  },
  data () {
    return {
      content: null,
      editorOption: {
        // some quill options
      }
    }
  },
  methods: {
    onEditorBlur (quill) {
    },
    onEditorFocus (quill) {
    },
    onEditorReady (quill) {
    },
    onEditorChange ({ quill, html, text }) {
      this.$emit('change', html)
    }
  },
  watch: {
    value (val) {
      this.content = val
    }
  }
}
</script>

<style lang="less" scoped>
@import url('../index.less');

.ant-editor-quill {
  line-height: initial;
  :deep(.ql-toolbar.ql-snow) {
    border-radius: @border-radius-base @border-radius-base 0 0;
  }
  :deep(.ql-container.ql-snow) {
    border-radius: 0 0 @border-radius-base @border-radius-base;
  }
}
</style>
