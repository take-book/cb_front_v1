<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-gray-900">
            {{ template ? 'Edit Template' : 'Create Template' }}
          </h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter template name"
            >
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              v-model="form.description"
              rows="2"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this template is for"
            ></textarea>
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div class="flex space-x-2">
              <select
                v-model="form.category"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select category</option>
                <option v-for="category in categories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
              <input
                v-model="newCategory"
                type="text"
                placeholder="Or create new"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @input="handleNewCategory"
              >
            </div>
          </div>

          <!-- Template Content -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Template Content *
            </label>
            <textarea
              v-model="form.template_content"
              rows="8"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter your template content here. Use {{variable_name}} for variables."
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">
              Use &#123;&#123;variable_name&#125;&#125; to create template variables
            </p>
          </div>

          <!-- Variables (auto-detected) -->
          <div v-if="detectedVariables.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Detected Variables
            </label>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(variable, index) in detectedVariables"
                :key="`variable-${index}`"
                class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm"
              >
                {{ variable }}
              </span>
            </div>
          </div>

          <!-- Settings -->
          <div class="space-y-3">
            <label class="flex items-center">
              <input
                v-model="form.is_public"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">Make this template public</span>
            </label>

            <label v-if="template" class="flex items-center">
              <input
                v-model="form.is_favorite"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">Mark as favorite</span>
            </label>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!form.name || !form.template_content"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ template ? 'Update' : 'Create' }} Template
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { TemplateResponse } from '../types/api'

interface Props {
  template?: TemplateResponse | null
  categories: string[]
}

interface Emits {
  (e: 'save', data: any): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Form data
const form = ref({
  name: '',
  description: '',
  category: '',
  template_content: '',
  is_public: false,
  is_favorite: false
})

const newCategory = ref('')

// Computed
const detectedVariables = computed(() => {
  const matches = form.value.template_content.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return []
  
  return [...new Set(matches.map(match => 
    match.replace(/^\{\{|\}\}$/g, '').trim()
  ))]
})

// Methods
const handleNewCategory = () => {
  if (newCategory.value) {
    form.value.category = newCategory.value
  }
}

const handleSubmit = () => {
  const data = {
    name: form.value.name,
    description: form.value.description || null,
    template_content: form.value.template_content,
    category: form.value.category || null,
    variables: detectedVariables.value.length > 0 ? detectedVariables.value : null,
    is_public: form.value.is_public,
    ...(props.template ? { is_favorite: form.value.is_favorite } : {})
  }
  
  emit('save', data)
}

// Initialize form with template data if editing
onMounted(() => {
  if (props.template) {
    form.value = {
      name: props.template.name,
      description: props.template.description || '',
      category: props.template.category || '',
      template_content: props.template.template_content,
      is_public: props.template.is_public,
      is_favorite: props.template.is_favorite
    }
  }
})

// Update form when template prop changes
watch(() => props.template, (newTemplate) => {
  if (newTemplate) {
    form.value = {
      name: newTemplate.name,
      description: newTemplate.description || '',
      category: newTemplate.category || '',
      template_content: newTemplate.template_content,
      is_public: newTemplate.is_public,
      is_favorite: newTemplate.is_favorite
    }
  } else {
    // Reset form for new template
    form.value = {
      name: '',
      description: '',
      category: '',
      template_content: '',
      is_public: false,
      is_favorite: false
    }
  }
})
</script>