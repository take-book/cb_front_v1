<template>
  <div class="chat-tree-container" ref="containerRef">
    <svg
      :width="treeLayout.width + 200"
      :height="treeLayout.height + 200"
      class="chat-tree-svg"
      :viewBox="`-50 -50 ${treeLayout.width + 200} ${treeLayout.height + 200}`"
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
              <div class="flex items-center justify-between mb-1">
                <div class="text-xs font-semibold" :class="getRoleColor(node.role)">
                  {{ getRoleLabel(node.role) }}
                </div>
                <div class="text-xs opacity-60">
                  <span v-if="selectedNodeUuid === node.uuid && canBranchFrom(node.uuid)" class="text-orange-600">
                    🌿
                  </span>
                  <span v-else-if="selectedNodeUuid === node.uuid" class="text-green-600">
                    ✅
                  </span>
                  <span v-else-if="canBranchFrom(node.uuid)" class="text-blue-400">
                    📍
                  </span>
                </div>
              </div>
              <div class="text-sm text-gray-700 line-clamp-3 flex-1 markdown-preview">
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
import { ref, computed } from 'vue'
import type { TreeNode } from '../types/api'
import MarkdownContent from './MarkdownContent.vue'

interface RenderNode extends TreeNode {
  x: number
  y: number
  level: number
}

interface Connection {
  from: string
  to: string
  path: string
  isActive: boolean
}

interface TreeLayout {
  width: number
  height: number
  nodes: RenderNode[]
}

interface Props {
  treeStructure: TreeNode | null
  selectedNodeUuid: string | null
  currentPath: TreeNode[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'node-click': [nodeId: string]
}>()

const containerRef = ref<HTMLElement>()
const nodeWidth = 180
const nodeHeight = 80
const horizontalSpacing = 240
const verticalSpacing = 120

// Convert tree structure to render nodes with positions
const renderNodes = computed((): RenderNode[] => {
  if (!props.treeStructure) return []

  const nodes: RenderNode[] = []
  
  // Better tree layout algorithm that prevents overlap
  const layoutTree = (node: TreeNode, level: number = 0, parentX: number = 0, siblingIndex: number = 0, siblingCount: number = 1): RenderNode => {
    // Calculate horizontal position based on parent and sibling positioning
    const xOffset = (siblingIndex - (siblingCount - 1) / 2) * horizontalSpacing
    const x = level === 0 ? 150 : parentX + xOffset
    const y = 50 + level * verticalSpacing

    const renderNode: RenderNode = {
      ...node,
      x,
      y,
      level
    }

    nodes.push(renderNode)

    // Process children with proper spacing
    if (node.children.length > 0) {
      node.children.forEach((child, index) => {
        layoutTree(child, level + 1, x, index, node.children.length)
      })
    }

    return renderNode
  }

  layoutTree(props.treeStructure)
  
  // Adjust positions to prevent overlap
  adjustNodePositions(nodes)
  
  return nodes
})

// Adjust node positions to prevent overlap
function adjustNodePositions(nodes: RenderNode[]) {
  // Group nodes by level
  const levels: { [key: number]: RenderNode[] } = {}
  nodes.forEach(node => {
    if (!levels[node.level]) levels[node.level] = []
    levels[node.level].push(node)
  })

  // Sort nodes at each level by x position and adjust if they overlap
  Object.values(levels).forEach(levelNodes => {
    levelNodes.sort((a, b) => a.x - b.x)
    
    for (let i = 1; i < levelNodes.length; i++) {
      const prevNode = levelNodes[i - 1]
      const currNode = levelNodes[i]
      const minDistance = nodeWidth + 20 // Add some padding
      
      if (currNode.x - prevNode.x < minDistance) {
        const shift = minDistance - (currNode.x - prevNode.x)
        // Shift current node and all subsequent nodes
        for (let j = i; j < levelNodes.length; j++) {
          levelNodes[j].x += shift
        }
      }
    }
  })
}

// Calculate tree layout dimensions
const treeLayout = computed((): TreeLayout => {
  if (renderNodes.value.length === 0) {
    return {
      width: nodeWidth,
      height: nodeHeight,
      nodes: []
    }
  }

  const maxX = Math.max(...renderNodes.value.map(n => n.x))
  const maxY = Math.max(...renderNodes.value.map(n => n.y))

  return {
    width: maxX + nodeWidth,
    height: maxY + nodeHeight,
    nodes: renderNodes.value
  }
})

// Generate connections between nodes
const connections = computed((): Connection[] => {
  if (!props.treeStructure) return []

  const connections: Connection[] = []
  const currentPathUuids = props.currentPath.map(node => node.uuid)

  const generateConnections = (node: TreeNode) => {
    const parentNode = renderNodes.value.find(n => n.uuid === node.uuid)
    if (!parentNode) return

    node.children.forEach(child => {
      const childNode = renderNodes.value.find(n => n.uuid === child.uuid)
      if (!childNode) return

      const isActive = currentPathUuids.includes(node.uuid) && currentPathUuids.includes(child.uuid)

      const path = `M ${parentNode.x + nodeWidth / 2} ${parentNode.y + nodeHeight} 
                   L ${childNode.x + nodeWidth / 2} ${childNode.y}`

      connections.push({
        from: node.uuid,
        to: child.uuid,
        path,
        isActive
      })

      generateConnections(child)
    })
  }

  generateConnections(props.treeStructure)
  return connections
})

// Event handlers
const handleNodeClick = (nodeId: string) => {
  emit('node-click', nodeId)
}

// Utility functions
const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    user: 'User',
    assistant: 'Assistant',
    system: 'System'
  }
  return labels[role] || role
}

const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    user: 'text-blue-600',
    assistant: 'text-green-600',
    system: 'text-gray-500'
  }
  return colors[role] || 'text-gray-600'
}

const truncateContent = (content: string): string => {
  const maxLength = 80
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

// Check if we can branch from this node (i.e., it's not the latest leaf)
const canBranchFrom = (nodeUuid: string): boolean => {
  if (!props.treeStructure) return false
  
  // Find the latest leaf node
  const findLatestLeaf = (node: TreeNode): TreeNode | null => {
    if (node.children.length === 0) return node
    
    let deepestLeaf: TreeNode | null = null
    let maxDepth = -1
    
    const traverse = (currentNode: TreeNode, depth: number) => {
      if (currentNode.children.length === 0) {
        if (depth > maxDepth) {
          maxDepth = depth
          deepestLeaf = currentNode
        }
      } else {
        for (const child of currentNode.children) {
          traverse(child, depth + 1)
        }
      }
    }
    
    traverse(node, 0)
    return deepestLeaf
  }
  
  const latestLeaf = findLatestLeaf(props.treeStructure)
  return nodeUuid !== latestLeaf?.uuid
}
</script>

<style scoped>
.chat-tree-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #f9fafb;
  position: relative;
  padding: 20px;
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
  stroke: #d1d5db;
  stroke-width: 2;
  fill: none;
}

.tree-connection.active-path {
  stroke: #3b82f6;
  stroke-width: 3;
}

.tree-node-group {
  cursor: pointer;
  transition: all 0.2s ease;
}

.tree-node-group:hover .tree-node {
  stroke: #6b7280;
  stroke-width: 2;
}

.tree-node {
  fill: white;
  stroke: #e5e7eb;
  stroke-width: 1;
  transition: all 0.2s ease;
}

.tree-node.role-user {
  fill: #eff6ff;
  stroke: #3b82f6;
}

.tree-node.role-assistant {
  fill: #f0fdf4;
  stroke: #10b981;
}

.tree-node.role-system {
  fill: #f9fafb;
  stroke: #6b7280;
}

.tree-node.selected {
  stroke-width: 3;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.tree-node.role-user.selected {
  stroke: #1d4ed8;
}

.tree-node.role-assistant.selected {
  stroke: #059669;
}

.tree-node.role-system.selected {
  stroke: #374151;
}

.tree-node.can-branch {
  cursor: pointer;
  transition: all 0.2s ease;
}

.tree-node.can-branch:hover {
  filter: brightness(1.05);
  stroke-width: 2;
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