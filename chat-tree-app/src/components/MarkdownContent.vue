<template>
  <div class="markdown-content" v-html="sanitizedHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Props {
  content: string
}

const props = defineProps<Props>()

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
})

// Compute sanitized HTML from markdown
const sanitizedHtml = computed(() => {
  const rawHtml = marked(props.content) as string
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 
      'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 
      'h4', 'h5', 'h6', 'a', 'img', 'table', 'thead', 
      'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false
  })
})
</script>

<style scoped>
.markdown-content {
  line-height: 1.6;
  word-wrap: break-word;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.3em; }
.markdown-content :deep(h3) { font-size: 1.1em; }

.markdown-content :deep(p) {
  margin-bottom: 0.75em;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}

.markdown-content :deep(li) {
  margin-bottom: 0.25em;
}

.markdown-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.markdown-content :deep(pre) {
  background-color: #f6f8fa;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 0.75em;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding-left: 1em;
  margin-left: 0;
  margin-bottom: 0.75em;
  color: #6a737d;
}

.markdown-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin-bottom: 0.75em;
  width: 100%;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #dfe2e5;
  padding: 0.5em;
}

.markdown-content :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #dfe2e5;
  margin: 1em 0;
}

.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}
</style>