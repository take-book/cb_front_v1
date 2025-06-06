import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useModelsStore } from '../models'
import type { ModelDto } from '../../types/api'
import { modelsApi } from '../../api/chats'

// Mock the API
vi.mock('../../api/chats', () => ({
  modelsApi: {
    getModels: vi.fn(),
    selectModel: vi.fn(),
    getCurrentModel: vi.fn()
  }
}))

const mockModelsApi = modelsApi as any

describe('Models Store', () => {
  let store: ReturnType<typeof useModelsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useModelsStore()
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    expect(store.availableModels).toEqual([])
    expect(store.currentModel).toBeNull()
    expect(store.selectedModelId).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches available models successfully', async () => {
    const mockModels: ModelDto[] = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        created: 1234567890,
        description: 'Advanced language model'
      },
      {
        id: 'claude-3',
        name: 'Claude 3',
        created: 1234567891,
        description: 'Anthropic model'
      }
    ]

    mockModelsApi.getModels.mockResolvedValue({ data: mockModels })

    await store.fetchAvailableModels()

    expect(store.availableModels).toEqual(mockModels)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles fetch models error', async () => {
    mockModelsApi.getModels.mockRejectedValue(new Error('Network error'))

    await store.fetchAvailableModels()

    expect(store.availableModels).toEqual([])
    expect(store.error).toBe('Network error')
    expect(store.isLoading).toBe(false)
  })

  it('fetches current model successfully', async () => {
    const mockCurrentModel = {
      model_id: 'gpt-4',
      name: 'GPT-4'
    }

    mockModelsApi.getCurrentModel.mockResolvedValue(mockCurrentModel)

    await store.fetchCurrentModel()

    expect(store.currentModel).toEqual(mockCurrentModel)
    expect(store.selectedModelId).toBe('gpt-4')
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('selects model successfully', async () => {
    const mockCurrentModel = {
      model_id: 'claude-3',
      name: 'Claude 3'
    }

    mockModelsApi.selectModel.mockResolvedValue(undefined)
    mockModelsApi.getCurrentModel.mockResolvedValue(mockCurrentModel)

    await store.selectModel('claude-3')

    expect(mockModelsApi.selectModel).toHaveBeenCalledWith('claude-3')
    expect(store.selectedModelId).toBe('claude-3')
    expect(store.currentModel).toEqual(mockCurrentModel)
  })

  it('handles select model error', async () => {
    mockModelsApi.selectModel.mockRejectedValue(new Error('Selection failed'))

    await store.selectModel('claude-3')

    expect(store.error).toBe('Selection failed')
    expect(store.isLoading).toBe(false)
  })

  it('computes isModelSelected correctly', () => {
    expect(store.isModelSelected).toBe(false)

    store.selectedModelId = 'gpt-4'
    expect(store.isModelSelected).toBe(true)
  })

  it('gets model by ID correctly', () => {
    store.availableModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        created: 1234567890
      },
      {
        id: 'claude-3',
        name: 'Claude 3',
        created: 1234567891
      }
    ]

    const model = store.getModelById('gpt-4')
    expect(model).toEqual({
      id: 'gpt-4',
      name: 'GPT-4',
      created: 1234567890
    })

    const nonExistent = store.getModelById('non-existent')
    expect(nonExistent).toBeUndefined()
  })

  it('computes selected model correctly', () => {
    store.availableModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        created: 1234567890
      }
    ]

    expect(store.selectedModel).toBeNull()

    store.selectedModelId = 'gpt-4'
    expect(store.selectedModel).toEqual({
      id: 'gpt-4',
      name: 'GPT-4',
      created: 1234567890
    })
  })

  it('computes model categories correctly', () => {
    store.availableModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        created: 1234567890,
        description: 'OpenAI model'
      },
      {
        id: 'claude-3',
        name: 'Claude 3',
        created: 1234567891,
        description: 'Anthropic model'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        created: 1234567892,
        description: 'Google model'
      }
    ]

    const categories = store.modelCategories
    expect(categories).toContain('OpenAI')
    expect(categories).toContain('Anthropic')
    expect(categories).toContain('Google')
  })

  it('sets selected model ID', () => {
    store.setSelectedModelId('gpt-4')
    expect(store.selectedModelId).toBe('gpt-4')

    store.setSelectedModelId(null)
    expect(store.selectedModelId).toBeNull()
  })

  it('clears selection', () => {
    store.selectedModelId = 'gpt-4'
    store.clearSelection()
    expect(store.selectedModelId).toBeNull()
  })

  it('resets store state', () => {
    // Set some state
    store.availableModels = [{ id: 'test', name: 'Test', created: 123 }]
    store.selectedModelId = 'test'
    store.error = 'Some error'

    store.reset()

    expect(store.availableModels).toEqual([])
    expect(store.currentModel).toBeNull()
    expect(store.selectedModelId).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('initializes store correctly', async () => {
    const mockModels = [{ id: 'gpt-4', name: 'GPT-4', created: 123 }]
    const mockCurrentModel = { model_id: 'gpt-4', name: 'GPT-4' }

    mockModelsApi.getModels.mockResolvedValue({ data: mockModels })
    mockModelsApi.getCurrentModel.mockResolvedValue(mockCurrentModel)

    await store.initialize()

    expect(mockModelsApi.getModels).toHaveBeenCalled()
    expect(mockModelsApi.getCurrentModel).toHaveBeenCalled()
    expect(store.availableModels).toEqual(mockModels)
    expect(store.currentModel).toEqual(mockCurrentModel)
  })
})