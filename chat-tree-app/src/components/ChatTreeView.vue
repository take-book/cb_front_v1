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
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'node-click': [nodeId: string]
}>()

const containerRef = ref<HTMLElement>()

// Use the tree layout composable
const { renderNodes, treeLayout, connections, nodeWidth, nodeHeight } = useTreeLayout(
  computed(() => props.treeStructure),
  computed(() => props.currentPath)
)

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