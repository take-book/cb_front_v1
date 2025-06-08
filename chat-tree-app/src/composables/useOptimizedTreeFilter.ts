import { computed, ref, shallowRef, type Ref, type ComputedRef } from 'vue'
import type { TreeNode, MessageRole } from '../types/api'

interface TreeFilterOptions {
  showSystemMessages: boolean
  roleFilter?: MessageRole[]
  contentFilter?: string
}

interface FilterCache {
  key: string
  result: TreeNode | null
}

export function useOptimizedTreeFilter(
  treeStructure: Ref<TreeNode | null>,
  options: Ref<TreeFilterOptions>
) {
  // Cache for filtered results
  const filterCache = ref(new Map<string, FilterCache>())
  const maxCacheSize = 50

  // Generate cache key from tree and options
  const generateCacheKey = (tree: TreeNode | null, opts: TreeFilterOptions): string => {
    if (!tree) return 'null'
    
    const treeHash = hashTreeStructure(tree)
    const optsHash = JSON.stringify(opts)
    return `${treeHash}-${optsHash}`
  }

  // Simple hash function for tree structure
  const hashTreeStructure = (node: TreeNode): string => {
    const nodeHash = `${node.uuid}-${node.role}-${node.children.length}`
    const childHashes = node.children.map(hashTreeStructure).join(',')
    return `${nodeHash}:${childHashes}`
  }

  // Optimized filtering function with memoization
  const filterTreeNode = (node: TreeNode, opts: TreeFilterOptions): TreeNode | null => {
    // Check role filter
    if (opts.roleFilter && !opts.roleFilter.includes(node.role)) {
      return null
    }

    // Check system messages filter
    if (!opts.showSystemMessages && node.role === 'system') {
      return null
    }

    // Check content filter
    if (opts.contentFilter && !node.content.toLowerCase().includes(opts.contentFilter.toLowerCase())) {
      // If node doesn't match but has children that might match, keep processing
      const hasMatchingChildren = node.children.some(child => 
        checkNodeMatchesFilter(child, opts)
      )
      if (!hasMatchingChildren) {
        return null
      }
    }

    // Filter children recursively
    const filteredChildren = node.children
      .map(child => filterTreeNode(child, opts))
      .filter((child): child is TreeNode => child !== null)

    // Return the filtered node
    return {
      ...node,
      children: filteredChildren
    }
  }

  // Helper function to check if node or descendants match filter
  const checkNodeMatchesFilter = (node: TreeNode, opts: TreeFilterOptions): boolean => {
    // Check current node
    if (opts.roleFilter && !opts.roleFilter.includes(node.role)) {
      return false
    }

    if (!opts.showSystemMessages && node.role === 'system') {
      return false
    }

    if (opts.contentFilter) {
      const matches = node.content.toLowerCase().includes(opts.contentFilter.toLowerCase())
      if (matches) return true
      
      // Check children
      return node.children.some(child => checkNodeMatchesFilter(child, opts))
    }

    return true
  }

  // Manage cache size
  const manageCacheSize = () => {
    if (filterCache.value.size > maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const entries = Array.from(filterCache.value.entries())
      const toRemove = entries.slice(0, entries.length - maxCacheSize + 10)
      toRemove.forEach(([key]) => filterCache.value.delete(key))
    }
  }

  // Main computed property with caching
  const filteredTree = computed<TreeNode | null>(() => {
    const tree = treeStructure.value
    const opts = options.value

    if (!tree) return null

    // Generate cache key
    const cacheKey = generateCacheKey(tree, opts)
    
    // Check cache first
    const cached = filterCache.value.get(cacheKey)
    if (cached) {
      return cached.result
    }

    // Filter the tree
    const filtered = filterTreeNode(tree, opts)
    
    // Store in cache
    filterCache.value.set(cacheKey, {
      key: cacheKey,
      result: filtered
    })
    
    // Manage cache size
    manageCacheSize()
    
    return filtered
  })

  // Utility functions for common filter scenarios
  const hideSystemMessages = () => {
    options.value = {
      ...options.value,
      showSystemMessages: false
    }
  }

  const showSystemMessages = () => {
    options.value = {
      ...options.value,
      showSystemMessages: true
    }
  }

  const filterByRole = (roles: MessageRole[]) => {
    options.value = {
      ...options.value,
      roleFilter: roles
    }
  }

  const filterByContent = (content: string) => {
    options.value = {
      ...options.value,
      contentFilter: content
    }
  }

  const clearFilters = () => {
    options.value = {
      showSystemMessages: true,
      roleFilter: undefined,
      contentFilter: undefined
    }
  }

  const clearCache = () => {
    filterCache.value.clear()
  }

  // Statistics
  const cacheStats = computed(() => ({
    size: filterCache.value.size,
    maxSize: maxCacheSize,
    hitRate: 0 // Could implement hit tracking if needed
  }))

  return {
    filteredTree,
    hideSystemMessages,
    showSystemMessages,
    filterByRole,
    filterByContent,
    clearFilters,
    clearCache,
    cacheStats
  }
}

// Composable for system message filtering specifically (most common use case)
export function useSystemMessageFilter(treeStructure: Ref<TreeNode | null>, showSystemMessages: Ref<boolean>) {
  const options = computed<TreeFilterOptions>(() => ({
    showSystemMessages: showSystemMessages.value
  }))

  return useOptimizedTreeFilter(treeStructure, options)
}