import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { findNodeInTree, buildPathToNode } from '../../utils/treeHelpers'
import type { TreeNode } from '../../types/api'

export const useChatNavigationStore = defineStore('chatNavigation', () => {
  // Navigation state
  const selectedNodeUuid = ref<string | null>(null)
  const currentPath = ref<TreeNode[]>([])
  
  // System message visibility state
  const showSystemMessages = ref(true)
  
  // Branch selection preservation for streaming mode
  const preservedSelectionUuid = ref<string | null>(null)

  // Navigation functions
  function selectNode(nodeUuid: string, treeStructure: TreeNode | null) {
    selectedNodeUuid.value = nodeUuid
    currentPath.value = buildPathToNode(nodeUuid, treeStructure)
  }

  function clearSelection() {
    selectedNodeUuid.value = null
    currentPath.value = []
  }

  // Get selected node from tree
  function getSelectedNode(treeStructure: TreeNode | null): TreeNode | null {
    if (!selectedNodeUuid.value || !treeStructure) return null
    return findNodeInTree(selectedNodeUuid.value, treeStructure)
  }

  // Determine if we're in branching mode
  function getIsBranchingMode(treeStructure: TreeNode | null): boolean {
    // Branching mode is active when:
    // 1. A node is selected AND
    // 2. It's not the latest message in the current conversation path
    const selectedNode = getSelectedNode(treeStructure)
    if (!selectedNode || !treeStructure) return false
    
    // Find the current conversation path (latest leaf node)
    const latestLeaf = findLatestLeafNode(treeStructure)
    const latestLeafUuid = latestLeaf?.uuid
    
    // We're in branching mode if the selected node is not the latest leaf
    return selectedNode.uuid !== latestLeafUuid
  }

  // Tree traversal utilities
  function isLeafNode(nodeUuid: string, treeStructure: TreeNode | null): boolean {
    const node = findNodeInTree(nodeUuid, treeStructure)
    return node ? node.children.length === 0 : false
  }

  function getNodeChildren(nodeUuid: string, treeStructure: TreeNode | null): TreeNode[] {
    const node = findNodeInTree(nodeUuid, treeStructure)
    return node ? node.children : []
  }

  function getNodeParent(nodeUuid: string, treeStructure: TreeNode | null): TreeNode | null {
    if (!treeStructure) return null

    function searchForParent(searchNode: TreeNode): TreeNode | null {
      for (const child of searchNode.children) {
        if (child.uuid === nodeUuid) {
          return searchNode
        }
        const found = searchForParent(child)
        if (found) return found
      }
      return null
    }

    return searchForParent(treeStructure)
  }

  // Find the latest leaf node (for determining if we're in branching mode)
  function findLatestLeafNode(node: TreeNode): TreeNode | null {
    if (node.children.length === 0) {
      return node
    }
    
    // Find the leaf with the latest UUID (as proxy for creation time)
    // UUIDs in this system are assumed to be lexicographically ordered by creation time
    let latestLeaf: TreeNode | null = null
    let latestUuid = ''
    
    function traverse(currentNode: TreeNode) {
      if (currentNode.children.length === 0) {
        // This is a leaf node
        if (currentNode.uuid > latestUuid) {
          latestUuid = currentNode.uuid
          latestLeaf = currentNode
        }
      } else {
        // Recursively traverse children
        for (const child of currentNode.children) {
          traverse(child)
        }
      }
    }
    
    traverse(node)
    return latestLeaf
  }

  // Auto-select the latest node when loading a chat
  function autoSelectLatestNode(treeStructure: TreeNode | null) {
    if (!treeStructure) return
    
    const latestLeaf = findLatestLeafNode(treeStructure)
    if (latestLeaf && latestLeaf.role === 'assistant') {
      // Auto-select the latest assistant message for easy continuation
      selectNode(latestLeaf.uuid, treeStructure)
    }
  }

  // Branch selection preservation functions for streaming mode
  function preserveSelectionForStreaming(treeStructure: TreeNode | null) {
    // Only preserve selection if we're in branching mode
    if (getIsBranchingMode(treeStructure) && selectedNodeUuid.value) {
      preservedSelectionUuid.value = selectedNodeUuid.value
      console.log('Preserving selection for streaming:', selectedNodeUuid.value)
    } else {
      preservedSelectionUuid.value = null
      console.log('Not preserving selection - not in branching mode')
    }
  }

  function getPreservedSelection(): string | null {
    return preservedSelectionUuid.value
  }

  function restorePreservedSelection(treeStructure: TreeNode | null, preferNewBranch: boolean = false): boolean {
    if (!preservedSelectionUuid.value) {
      console.log('No preserved selection to restore')
      return false
    }

    // Check if the preserved node still exists in the tree
    const preservedNode = findNodeInTree(preservedSelectionUuid.value, treeStructure)
    if (!preservedNode) {
      console.log('Preserved node no longer exists:', preservedSelectionUuid.value)
      preservedSelectionUuid.value = null
      return false
    }

    // If preferNewBranch is true, check if a new branch was created from the preserved node
    if (preferNewBranch && treeStructure) {
      const latestLeaf = findLatestLeafNode(treeStructure)
      if (latestLeaf && latestLeaf.role === 'assistant') {
        // Check if this is a newly created branch from the preserved node
        const parentPath = buildPathToNode(latestLeaf.uuid, treeStructure)
        const preservedInPath = parentPath.some(node => node.uuid === preservedSelectionUuid.value)
        
        if (preservedInPath) {
          // This is a new branch created from our preserved selection
          // Select the new assistant response instead
          console.log('Selecting newly created branch:', latestLeaf.uuid)
          selectNode(latestLeaf.uuid, treeStructure)
          preservedSelectionUuid.value = null
          return true
        }
      }
    }

    // Restore to the original preserved selection
    console.log('Restoring preserved selection:', preservedSelectionUuid.value)
    selectNode(preservedSelectionUuid.value, treeStructure)
    preservedSelectionUuid.value = null
    return true
  }

  function clearPreservedSelection() {
    preservedSelectionUuid.value = null
  }

  // System message visibility functions
  function toggleSystemMessages() {
    showSystemMessages.value = !showSystemMessages.value
  }

  function shouldShowNodeInTree(nodeUuid: string, treeStructure: TreeNode | null): boolean {
    if (showSystemMessages.value) {
      return true
    }
    const node = findNodeInTree(nodeUuid, treeStructure)
    return node ? node.role !== 'system' : true
  }

  return {
    // State
    selectedNodeUuid,
    currentPath,
    showSystemMessages,

    // Actions
    selectNode,
    clearSelection,
    getSelectedNode,
    getIsBranchingMode,

    // Tree utilities
    isLeafNode,
    getNodeChildren,
    getNodeParent,
    findLatestLeafNode,
    autoSelectLatestNode,

    // Branch selection preservation
    preserveSelectionForStreaming,
    getPreservedSelection,
    restorePreservedSelection,
    clearPreservedSelection,

    // System message visibility
    toggleSystemMessages,
    shouldShowNodeInTree
  }
})