import type { TreeNode as ApiTreeNode, HistoryMessage } from '@/types/api'
import type { TreeNode, TreeLayout } from './chatTree'

/**
 * Convert API tree structure to our internal tree format for rendering
 */
export function convertApiTreeToRenderTree(
  apiTree: ApiTreeNode,
  messages: HistoryMessage[],
  currentNodeUuid: string,
  currentPath: string[]
): TreeNode {
  // Create a lookup map for messages
  const messageMap = new Map<string, HistoryMessage>()
  messages.forEach(message => {
    messageMap.set(message.message_uuid, message)
  })

  // Convert recursively
  const convertNode = (apiNode: ApiTreeNode, level: number = 0): TreeNode => {
    const message = messageMap.get(apiNode.uuid)
    
    // If no message found, create a placeholder (should not happen in normal cases)
    const nodeMessage: HistoryMessage = message || {
      message_uuid: apiNode.uuid,
      role: 'system',
      content: 'Unknown message'
    }

    const treeNode: TreeNode = {
      id: apiNode.uuid,
      message: nodeMessage,
      children: [],
      level
    }

    // Convert children
    treeNode.children = apiNode.children.map(child => {
      const childNode = convertNode(child, level + 1)
      childNode.parent = treeNode
      return childNode
    })

    return treeNode
  }

  return convertNode(apiTree)
}

/**
 * Extract the current path from API tree based on current node UUID
 */
export function extractCurrentPathFromApiTree(
  apiTree: ApiTreeNode,
  currentNodeUuid: string
): string[] {
  const path: string[] = []

  const findPath = (node: ApiTreeNode, targetUuid: string): boolean => {
    if (node.uuid === targetUuid) {
      path.push(node.uuid)
      return true
    }

    for (const child of node.children) {
      if (findPath(child, targetUuid)) {
        path.unshift(node.uuid)
        return true
      }
    }

    return false
  }

  findPath(apiTree, currentNodeUuid)
  return path.filter(uuid => uuid !== 'root') // Remove root if present
}

/**
 * Check if a node is on the current active path
 */
export function isNodeOnCurrentPath(
  nodeUuid: string,
  currentPath: string[]
): boolean {
  return currentPath.includes(nodeUuid)
}

/**
 * Find a specific node in the API tree
 */
export function findNodeInApiTree(
  tree: ApiTreeNode,
  targetUuid: string
): ApiTreeNode | null {
  if (tree.uuid === targetUuid) {
    return tree
  }

  for (const child of tree.children) {
    const found = findNodeInApiTree(child, targetUuid)
    if (found) return found
  }

  return null
}