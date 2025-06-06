import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ModelSelector from '../ModelSelector.vue'
import { useModelsStore } from '../../stores/models'

// Mock the API
vi.mock('../../api/chats', () => ({
  modelsApi: {
    getModels: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          created: 1234567890,
          description: 'Advanced language model',
          context_length: 8000
        },
        {
          id: 'google/gemini-flash-2.0',
          name: 'Gemini Flash 2.0',
          created: 1234567891,
          description: 'Google model',
          context_length: 100000
        }
      ]
    }),
    getCurrentModel: vi.fn().mockResolvedValue({
      model_id: 'google/gemini-flash-2.0',
      name: 'Gemini Flash 2.0'
    }),
    selectModel: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('ModelSelector - User Selection Override Fix', () => {
  let pinia: ReturnType<typeof createPinia>
  let modelsStore: ReturnType<typeof useModelsStore>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    modelsStore = useModelsStore()
    
    // Mock the store data
    modelsStore.$patch({
      availableModels: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          created: 1234567890,
          description: 'Advanced language model',
          context_length: 8000
        },
        {
          id: 'google/gemini-flash-2.0',
          name: 'Gemini Flash 2.0',
          created: 1234567891,
          description: 'Google model',
          context_length: 100000
        }
      ],
      currentModel: {
        model_id: 'google/gemini-flash-2.0',
        name: 'Gemini Flash 2.0'
      },
      isLoading: false,
      error: null
    })
  })

  it('should not override user selection when currentModel changes', async () => {
    // Mock selectModel to simulate successful selection
    modelsStore.selectModel = vi.fn().mockImplementation(async (modelId: string) => {
      // Simulate what the real selectModel does - update currentModel
      const selectedModel = modelsStore.availableModels.find(m => m.id === modelId)
      if (selectedModel) {
        modelsStore.currentModel = {
          model_id: modelId,
          name: selectedModel.name
        }
      }
    })

    const wrapper = mount(ModelSelector, {
      props: {
        autoSelect: true
      },
      global: {
        plugins: [pinia]
      }
    })

    // Simulate user selecting GPT-4
    const component = wrapper.vm as any
    component.selectedModelId = 'gpt-4'
    await component.handleModelChange()

    // Verify that the selection remained as GPT-4 and wasn't overridden
    expect(component.selectedModelId).toBe('gpt-4')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    
    const emittedEvents = wrapper.emitted('update:modelValue') as any[]
    expect(emittedEvents[emittedEvents.length - 1][0]).toBe('gpt-4')
  })

  it('should preserve user selection even after store currentModel updates', async () => {
    const wrapper = mount(ModelSelector, {
      props: {
        autoSelect: true
      },
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any
    
    // User selects GPT-4
    component.selectedModelId = 'gpt-4'
    component.userHasSelected = true
    
    // Simulate currentModel changing (as if from API response)
    modelsStore.$patch({
      currentModel: {
        model_id: 'google/gemini-flash-2.0',
        name: 'Gemini Flash 2.0'
      }
    })

    await wrapper.vm.$nextTick()

    // User selection should be preserved
    expect(component.selectedModelId).toBe('gpt-4')
  })

  it('should auto-select only when user has not made a selection', async () => {
    const wrapper = mount(ModelSelector, {
      props: {
        autoSelect: true,
        modelValue: null
      },
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any
    
    // Initially no user selection
    expect(component.userHasSelected).toBe(false)
    
    // When currentModel is set and no user selection, should auto-select
    modelsStore.$patch({
      currentModel: {
        model_id: 'google/gemini-flash-2.0',
        name: 'Gemini Flash 2.0'
      }
    })

    await wrapper.vm.$nextTick()
    
    // Should auto-select the current model
    expect(component.selectedModelId).toBe('google/gemini-flash-2.0')
  })

  it('should not auto-select when user has already made a selection', async () => {
    const wrapper = mount(ModelSelector, {
      props: {
        autoSelect: true
      },
      global: {
        plugins: [pinia]
      }
    })

    const component = wrapper.vm as any
    
    // User makes a selection
    component.selectedModelId = 'gpt-4'
    component.userHasSelected = true
    
    // Store updates currentModel to something different
    modelsStore.$patch({
      currentModel: {
        model_id: 'google/gemini-flash-2.0',
        name: 'Gemini Flash 2.0'
      }
    })

    await wrapper.vm.$nextTick()
    
    // Should preserve user selection
    expect(component.selectedModelId).toBe('gpt-4')
  })
})