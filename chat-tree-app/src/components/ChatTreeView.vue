<template>
  <div class="chat-tree-container" ref="containerRef">
    <svg
      :width="treeLayout.width + 200"
      :height="treeLayout.height + 200"
      class="chat-tree-svg"
      :viewBox="`-50 -50 ${treeLayout.width + 200} ${treeLayout.height + 200}`"
    >
      <!-- Gradients definition -->
      <defs>
        <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Connections -->
      <g class="connections">
        <path
          v-for="connection in connections"
          :key="`${connection.from}-${connection.to}`"
          :d="connection.path"
          class="tree-connection"
          data-test="tree-connection"
          :class="{ 'active-path': connection.isActive }"
        />
      </g>
      
      <!-- Nodes -->
      <g class="nodes">
        <g
          v-for="node in renderNodes"
          :key="node.uuid"
          :data-test="`tree-node-${node.uuid}`"
          :transform="`translate(${node.x}, ${node.y})`"
          :class="[
            'tree-node-group',
            `role-${node.role}`,
            { 'selected': selectedNodeUuid === node.uuid }
          ]"
          @click="handleNodeClick(node.uuid)"
        >
          <rect
            class="tree-node"
            :class="[
              `role-${node.role}`,
              { 
                'selected': selectedNodeUuid === node.uuid,
                'can-branch': canBranchFrom(node.uuid)
              }
            ]"
            :width="nodeWidth"
            :height="nodeHeight"
            rx="8"
            ry="8"
          />
          
          <foreignObject
            :width="nodeWidth"
            :height="nodeHeight"
            class="node-content"
          >
            <div class="p-3 h-full flex flex-col">
              <div class="flex items-center justify-between mb-2">
                <div class="text-xs font-bold" :class="getRoleColor(node.role)">
                  {{ getRoleLabel(node.role) }}
                </div>
                <div class="text-sm">
                  <span v-if="selectedNodeUuid === node.uuid && canBranchFrom(node.uuid)" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    🌿 Branch
                  </span>
                  <span v-else-if="selectedNodeUuid === node.uuid" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    ✓ Selected
                  </span>
                  <span v-else-if="canBranchFrom(node.uuid)" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    📍 Available
                  </span>
                </div>
              </div>
              <div class="text-sm text-gray-800 line-clamp-3 flex-1 markdown-preview leading-relaxed">
                <MarkdownContent :content="truncateContent(node.content)" />
              </div>
            </div>
          </foreignObject>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue'
import type { TreeNode } from '../types/api'
import MarkdownContent from './MarkdownContent.vue'
import { useTreeLayout } from '../composables/useTreeLayout'
import { 
  canBranchFromNode, 
  getRoleLabel, 
  getRoleColor, 
  truncateContent 
} from '../utils/treeHelpers'

interface Props {
  treeStructure: TreeNode | null
  selectedNodeUuid: string | null
  currentPath: TreeNode[]
  showSystemMessages?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSystemMessages: true
})
const emit = defineEmits<{
  'node-click': [nodeId: string]
}>()

const containerRef = ref<HTMLElement>()

// Memoization cache for filtered tree structures
const filterCache = new Map<string, TreeNode | null>()

// Recursive filter function for system nodes
const filterSystemNodes = (node: TreeNode): TreeNode | null => {
  if (node.role === 'system') {
    // If this is a system node, process its children and return them
    const filteredChildren = node.children
      .map(child => filterSystemNodes(child))
      .filter(child => child !== null) as TreeNode[]
    
    // Return the first child if there's only one, or null if no children
    // This effectively removes the system node from the tree while preserving its children
    if (filteredChildren.length === 1) {
      return filteredChildren[0]
    } else if (filteredChildren.length > 1) {
      // Multiple children case: we can't easily merge them without creating confusion
      // So we'll keep the system node but mark it differently for display
      return {
        ...node,
        children: filteredChildren
      }
    }
    return null
  }
  
  // For non-system nodes, recursively filter children
  const filteredChildren = node.children
    .map(child => filterSystemNodes(child))
    .filter(child => child !== null) as TreeNode[]
  
  return {
    ...node,
    children: filteredChildren
  }
}

// Filter tree structure to hide system messages when needed with proper memoization
const filteredTreeStructure = computed(() => {
  // Debug: Log the props treeStructure
  if (import.meta.env.DEV && props.treeStructure) {
    console.log('ChatTreeView received treeStructure:', {
      uuid: props.treeStructure.uuid,
      role: props.treeStructure.role,
      content: props.treeStructure.content.slice(0, 50) + '...',
      contentLength: props.treeStructure.content.length,
      childrenCount: props.treeStructure.children?.length || 0,
      children: props.treeStructure.children?.map(child => ({
        uuid: child.uuid,
        role: child.role,
        content: child.content.slice(0, 30) + '...'
      })) || []
    })
  }
  
  // Always return the original tree structure for now to debug the issue
  // We'll temporarily disable system message filtering to isolate the problem
  return props.treeStructure
  
  // TODO: Re-enable system message filtering after fixing the core issue
  // const cacheKey = `${props.showSystemMessages}-${props.treeStructure?.uuid || 'null'}-${JSON.stringify(props.treeStructure?.children?.map(c => c.uuid) || [])}`
  
  // if (props.showSystemMessages || !props.treeStructure) {
  //   return props.treeStructure
  // }
  
  // // Check cache first
  // if (filterCache.has(cacheKey)) {
  //   return filterCache.get(cacheKey)
  // }
  
  // // Compute filtered structure
  // const filtered = filterSystemNodes(props.treeStructure)
  
  // // Cache result (with size limit to prevent memory leaks)
  // if (filterCache.size > 100) {
  //   filterCache.clear() // Simple cache eviction
  // }
  // filterCache.set(cacheKey, filtered)
  
  // return filtered
})

// Use the tree layout composable with filtered structure
const { renderNodes, treeLayout, connections, nodeWidth, nodeHeight } = useTreeLayout(
  computed(() => filteredTreeStructure.value || null),
  computed(() => props.currentPath)
)

// Debug: Log renderNodes when they change (moved to composable)

// Event handlers
const handleNodeClick = (nodeId: string) => {
  emit('node-click', nodeId)
}

// Check if we can branch from this node
const canBranchFrom = (nodeUuid: string): boolean => {
  return canBranchFromNode(nodeUuid, props.treeStructure)
}
</script>

<style scoped>
.chat-tree-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  position: relative;
  padding: 24px;
}

.chat-tree-svg {
  display: block;
  min-width: 100%;
  min-height: 100%;
}

/* Custom scrollbar styling */
.chat-tree-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.chat-tree-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.chat-tree-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.chat-tree-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.tree-connection {
  stroke: #cbd5e1;
  stroke-width: 3;
  fill: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  transition: all 0.3s ease;
}

.tree-connection.active-path {
  stroke: url(#activeGradient);
  stroke-width: 4;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
}

.tree-node-group {
  cursor: pointer;
  transition: all 0.3s ease;
}

.tree-node-group:hover .tree-node {
  stroke: #6366f1;
  stroke-width: 2;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  transform: scale(1.02);
}

.tree-node {
  fill: white;
  stroke: #e5e7eb;
  stroke-width: 2;
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
}

.tree-node.role-user {
  fill: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  stroke: #3b82f6;
  stroke-width: 2;
}

.tree-node.role-assistant {
  fill: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  stroke: #10b981;
  stroke-width: 2;
}

.tree-node.role-system {
  fill: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  stroke: #6b7280;
  stroke-width: 2;
}

.tree-node.selected {
  stroke-width: 4;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15));
  transform: scale(1.05);
}

.tree-node.role-user.selected {
  stroke: #1d4ed8;
  fill: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
}

.tree-node.role-assistant.selected {
  stroke: #059669;
  fill: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
}

.tree-node.role-system.selected {
  stroke: #374151;
  fill: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
}

.tree-node.can-branch {
  cursor: pointer;
  transition: all 0.3s ease;
}

.tree-node.can-branch:hover {
  filter: brightness(1.05) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.12));
  stroke-width: 3;
  transform: scale(1.03);
}

.tree-node.can-branch.role-user:hover {
  stroke: #2563eb;
}

.tree-node.can-branch.role-assistant:hover {
  stroke: #059669;
}

.tree-node.can-branch.role-system:hover {
  stroke: #4b5563;
}

.node-content {
  pointer-events: none;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.markdown-preview :deep(.markdown-content) {
  font-size: 0.875rem;
}

.markdown-preview :deep(.markdown-content p) {
  margin: 0;
}

.markdown-preview :deep(.markdown-content code) {
  font-size: 0.8em;
  padding: 0.1em 0.2em;
}
</style>