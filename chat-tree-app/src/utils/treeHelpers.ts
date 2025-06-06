import type { TreeNode } from '../types/api'

/**
 * Find the latest (deepest) leaf node in the tree
 */
export function findLatestLeaf(node: TreeNode): TreeNode | null {
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

/**
 * Check if we can branch from this node (i.e., it's not the latest leaf)
 */
export function canBranchFromNode(nodeUuid: string, treeStructure: TreeNode | null): boolean {
  if (!treeStructure) return false
  
  const latestLeaf = findLatestLeaf(treeStructure)
  return nodeUuid !== latestLeaf?.uuid
}

/**
 * Get role display label
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    user: 'User',
    assistant: 'Assistant',
    system: 'System'
  }
  return labels[role] || role
}

/**
 * Get role color class
 */
export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    user: 'text-blue-600',
    assistant: 'text-green-600',
    system: 'text-gray-500'
  }
  return colors[role] || 'text-gray-600'
}

/**
 * Truncate content to specified length
 */
export function truncateContent(content: string, maxLength: number = 80): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

/**
 * Find a node in the tree by UUID
 */
export function findNodeInTree(nodeUuid: string, tree: TreeNode | null): TreeNode | null {
  if (!tree) return null
  
  if (tree.uuid === nodeUuid) return tree
  
  for (const child of tree.children) {
    const found = findNodeInTree(nodeUuid, child)
    if (found) return found
  }
  
  return null
}

/**
 * Build path from root to a specific node
 */
export function buildPathToNode(nodeUuid: string, tree: TreeNode | null): TreeNode[] {
  if (!tree) return []
  
  const path: TreeNode[] = []
  
  const findPath = (node: TreeNode): boolean => {
    path.push(node)
    
    if (node.uuid === nodeUuid) {
      return true
    }
    
    for (const child of node.children) {
      if (findPath(child)) {
        return true
      }
    }
    
    path.pop()
    return false
  }
  
  findPath(tree)
  return path
}

/**
 * Extract messages for the current conversation thread
 * This includes all messages from root to the selected node, or to the latest leaf if no node is selected
 */
export function extractConversationThread(
  allMessages: any[], 
  currentPath: TreeNode[], 
  selectedNodeUuid?: string | null
): any[] {
  if (!allMessages.length) return []
  
  // If we have a current path, use it to extract the conversation thread
  if (currentPath.length > 0) {
    const pathUuids = currentPath.map(node => node.uuid).filter(uuid => uuid !== 'root')
    return allMessages.filter(message => pathUuids.includes(message.message_uuid))
      .sort((a, b) => {
        // Sort by the order they appear in the path
        const aIndex = pathUuids.indexOf(a.message_uuid)
        const bIndex = pathUuids.indexOf(b.message_uuid)
        return aIndex - bIndex
      })
  }
  
  // If no path is selected, show the main conversation thread (latest path)
  // This is a simplified approach - we can enhance it later if needed
  return allMessages.slice(0, 10) // Show first 10 messages as fallback
}

/**
 * Get the conversation thread for a specific branch
 */
export function getBranchConversationThread(
  tree: TreeNode | null,
  allMessages: any[],
  targetNodeUuid?: string | null
): any[] {
  if (!tree || !allMessages.length) return []
  
  const pathToTarget = targetNodeUuid 
    ? buildPathToNode(targetNodeUuid, tree)
    : buildPathToNode(findLatestLeaf(tree)?.uuid || '', tree)
  
  return extractConversationThread(allMessages, pathToTarget, targetNodeUuid)
}