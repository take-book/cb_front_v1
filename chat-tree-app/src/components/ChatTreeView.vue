<template>
  <div class="chat-tree-container" ref="containerRef">
    <svg
      :width="treeLayout.width + 100"
      :height="treeLayout.height + 100"
      class="chat-tree-svg"
    >
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
          v-for="node in treeLayout.nodes"
          :key="node.id"
          :data-test="`tree-node-${node.id}`"
          :transform="`translate(${node.x}, ${node.y})`"
          :class="[
            'tree-node-group',
            `role-${node.message.role}`,
            { 'selected': effectiveSelectedNodeId === node.id }
          ]"
          @click="handleNodeClick(node.id)"
        >
          <rect
            class="tree-node"
            :class="[
              `role-${node.message.role}`,
              { 'selected': effectiveSelectedNodeId === node.id }
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
              <div class="text-xs font-semibold mb-1" :class="getRoleColor(node.message.role)">
                {{ getRoleLabel(node.message.role) }}
              </div>
              <div class="text-sm text-gray-700 line-clamp-3 flex-1">
                {{ truncateContent(node.message.content) }}
              </div>
            </div>
          </foreignObject>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { HistoryMessage, TreeStructureResponse } from '@/types/api'
import { buildChatTree, calculateTreeLayout, type TreeNode } from '@/utils/chatTree'
import { convertApiTreeToRenderTree, extractCurrentPathFromApiTree } from '@/utils/apiTreeConverter'

interface Props {
  messages: HistoryMessage[]
  currentPath: string[]
  selectedNodeId?: string | null
  treeStructure?: TreeStructureResponse | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'node-click': [nodeId: string]
}>()

const containerRef = ref<HTMLElement>()
const nodeWidth = 180
const nodeHeight = 80

const tree = computed(() => {
  // Always use API tree structure if available for correct tree representation
  if (props.treeStructure && props.treeStructure.tree) {
    return convertApiTreeToRenderTree(
      props.treeStructure.tree,
      props.messages,
      props.treeStructure.current_node_uuid,
      props.currentPath
    )
  }
  
  // Only fallback to local tree building if no API tree structure available
  return buildChatTree(props.messages, props.currentPath)
})

const effectiveCurrentPath = computed(() => {
  // Use API tree path if available, otherwise use provided path
  if (props.treeStructure) {
    return extractCurrentPathFromApiTree(
      props.treeStructure.tree,
      props.treeStructure.current_node_uuid
    )
  }
  
  return props.currentPath
})

const effectiveSelectedNodeId = computed(() => {
  // Prefer props.selectedNodeId if provided, otherwise use API current_node_uuid
  return props.selectedNodeId || props.treeStructure?.current_node_uuid || null
})

const treeLayout = computed(() => {
  return calculateTreeLayout(tree.value, nodeWidth, nodeHeight, 40, 60)
})

const connections = computed(() => {
  const conns: Array<{
    from: string
    to: string
    path: string
    isActive: boolean
  }> = []
  
  const createPath = (parent: TreeNode, child: TreeNode) => {
    const x1 = (parent.x || 0) + nodeWidth / 2
    const y1 = (parent.y || 0) + nodeHeight
    const x2 = (child.x || 0) + nodeWidth / 2
    const y2 = (child.y || 0)
    
    const midY = (y1 + y2) / 2
    
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
  }
  
  const traverse = (node: TreeNode) => {
    node.children.forEach((child: TreeNode) => {
      conns.push({
        from: node.id,
        to: child.id,
        path: createPath(node, child),
        isActive: effectiveCurrentPath.value.includes(node.id) && effectiveCurrentPath.value.includes(child.id)
      })
      traverse(child)
    })
  }
  
  traverse(tree.value)
  return conns
})

const handleNodeClick = (nodeId: string) => {
  if (nodeId !== 'root') {
    emit('node-click', nodeId)
  }
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'user': return 'You'
    case 'assistant': return 'AI'
    case 'system': return 'System'
    default: return role
  }
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'user': return 'text-blue-600'
    case 'assistant': return 'text-green-600'
    case 'system': return 'text-gray-600'
    default: return 'text-gray-600'
  }
}

const truncateContent = (content: string) => {
  const maxLength = 60
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

onMounted(() => {
  // Center the tree view
  if (containerRef.value) {
    const container = containerRef.value
    const svg = container.querySelector('svg')
    if (svg) {
      container.scrollLeft = (svg.clientWidth - container.clientWidth) / 2
      container.scrollTop = 50
    }
  }
})
</script>

<style scoped>
.chat-tree-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.chat-tree-svg {
  min-width: 100%;
}

.tree-connection {
  fill: none;
  stroke: #d1d5db;
  stroke-width: 2;
}

.tree-connection.active-path {
  stroke: #6366f1;
  stroke-width: 3;
}

.tree-node {
  fill: white;
  stroke: #d1d5db;
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.2s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.tree-node:hover {
  stroke: #818cf8;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.tree-node.selected {
  stroke: #4f46e5;
  stroke-width: 3;
  filter: drop-shadow(0 4px 12px rgba(79, 70, 229, 0.3));
}

.tree-node.role-user {
  fill: #eff6ff;
}

.tree-node.role-assistant {
  fill: #f0fdf4;
}

.tree-node.role-system {
  fill: #f3f4f6;
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
</style>