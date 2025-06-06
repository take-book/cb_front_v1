import type { HistoryMessage, TreeNode as ApiTreeNode } from '@/types/api'

// Extended TreeNode for UI layout (extends the API TreeNode)
export interface LayoutTreeNode extends ApiTreeNode {
  id: string
  message: HistoryMessage
  children: LayoutTreeNode[]
  parent?: LayoutTreeNode
  x?: number
  y?: number
  level: number
}

// Re-export the API TreeNode for clarity
export type { TreeNode } from '@/types/api'

export interface TreeLayout {
  nodes: LayoutTreeNode[]
  width: number
  height: number
}

export function buildChatTree(messages: HistoryMessage[], currentPath: string[]): LayoutTreeNode {
  // Create nodes map
  const nodesMap = new Map<string, LayoutTreeNode>()
  
  // Initialize root node
  const root: LayoutTreeNode = {
    id: 'root',
    uuid: 'root',
    role: 'system',
    content: 'Chat Start',
    message: {
      message_uuid: 'root',
      role: 'system',
      content: 'Chat Start'
    },
    children: [],
    level: 0
  }
  nodesMap.set('root', root)
  
  // Build tree structure based on the path
  let currentParent = root
  currentPath.forEach((messageId, index) => {
    const message = messages.find(m => m.message_uuid === messageId)
    if (message) {
      const node: LayoutTreeNode = {
        id: messageId,
        uuid: messageId,
        role: message.role,
        content: message.content,
        message,
        children: [],
        parent: currentParent,
        level: index + 1
      }
      nodesMap.set(messageId, node)
      currentParent.children.push(node)
      currentParent = node
    }
  })
  
  // Add remaining messages by finding their appropriate parent
  const orphanedMessages = messages.filter(m => !currentPath.includes(m.message_uuid))
  
  // Sort orphaned messages by their original index to process them in order
  const messageIndices = new Map<string, number>()
  messages.forEach((msg, index) => {
    messageIndices.set(msg.message_uuid, index)
  })
  
  orphanedMessages.sort((a, b) => {
    const aIndex = messageIndices.get(a.message_uuid) ?? 0
    const bIndex = messageIndices.get(b.message_uuid) ?? 0
    return aIndex - bIndex
  })
  
  orphanedMessages.forEach(message => {
    const node: LayoutTreeNode = {
      id: message.message_uuid,
      uuid: message.message_uuid,
      role: message.role,
      content: message.content,
      message,
      children: [],
      level: 1 // Will be updated based on actual parent
    }
    
    // Find the most appropriate parent for this orphaned message
    const parent = findBestParent(message, messages, currentPath, nodesMap, root)
    
    node.parent = parent
    node.level = parent.level + 1
    parent.children.push(node)
    nodesMap.set(message.message_uuid, node)
  })
  
  return root
}

/**
 * Find the best parent for an orphaned message based on:
 * 1. Message ordering and role patterns
 * 2. Conversation flow logic
 */
function findBestParent(
  orphanMessage: HistoryMessage, 
  allMessages: HistoryMessage[], 
  currentPath: string[], 
  nodesMap: Map<string, LayoutTreeNode>,
  root: LayoutTreeNode
): LayoutTreeNode {
  // Create a chronological index of messages
  const messageIndices = new Map<string, number>()
  allMessages.forEach((msg, index) => {
    messageIndices.set(msg.message_uuid, index)
  })
  
  const orphanIndex = messageIndices.get(orphanMessage.message_uuid) ?? -1
  
  // Strategy 1: Find the best node in our existing tree that comes before this orphan
  let bestParent = root
  let bestParentIndex = -1
  
  // Check all existing nodes in the tree (both in path and already processed orphans)
  for (const [nodeId, node] of nodesMap) {
    if (nodeId === 'root') continue
    
    const nodeIndex = messageIndices.get(nodeId) ?? -1
    
    // This node comes before the orphan and is later than our current best
    if (nodeIndex < orphanIndex && nodeIndex > bestParentIndex) {
      if (canBeChildOf(orphanMessage, node.message)) {
        bestParent = node
        bestParentIndex = nodeIndex
      }
    }
  }
  
  // If we found a good parent, use it
  if (bestParent !== root) {
    return bestParent
  }
  
  // Strategy 2: Find any preceding message that could be a logical parent
  for (let i = orphanIndex - 1; i >= 0; i--) {
    const prevMessage = allMessages[i]
    const prevNode = nodesMap.get(prevMessage.message_uuid)
    if (prevNode && canBeChildOf(orphanMessage, prevMessage)) {
      return prevNode
    }
  }
  
  return root
}

/**
 * Determine if a message can logically be a child of another message
 * based on conversation patterns
 */
function canBeChildOf(childMessage: HistoryMessage, parentMessage: HistoryMessage): boolean {
  // User messages can follow assistant messages
  if (childMessage.role === 'user' && parentMessage.role === 'assistant') {
    return true
  }
  
  // Assistant messages can follow user messages
  if (childMessage.role === 'assistant' && parentMessage.role === 'user') {
    return true
  }
  
  // Same role messages are usually siblings, not parent-child
  // This is key: assistant messages responding to the same user message should be siblings
  if (childMessage.role === 'assistant' && parentMessage.role === 'assistant') {
    return false
  }
  
  // User messages responding to different assistants should also be evaluated carefully
  if (childMessage.role === 'user' && parentMessage.role === 'user') {
    return false
  }
  
  return false
}

export function calculateTreeLayout(root: LayoutTreeNode, nodeWidth = 200, nodeHeight = 100, horizontalSpacing = 50, verticalSpacing = 50): TreeLayout {
  const nodes: LayoutTreeNode[] = []
  let maxWidth = 0
  let maxHeight = 0
  
  // Calculate positions using a modified Reingold-Tilford algorithm
  const calculateSubtreeWidth = (node: LayoutTreeNode): number => {
    if (node.children.length === 0) {
      return nodeWidth
    }
    
    let totalWidth = 0
    node.children.forEach((child, index) => {
      if (index > 0) totalWidth += horizontalSpacing
      totalWidth += calculateSubtreeWidth(child)
    })
    
    return Math.max(nodeWidth, totalWidth)
  }
  
  const positionNode = (node: LayoutTreeNode, x: number, y: number) => {
    node.x = x
    node.y = y
    nodes.push(node)
    
    maxWidth = Math.max(maxWidth, x + nodeWidth)
    maxHeight = Math.max(maxHeight, y + nodeHeight)
    
    if (node.children.length === 0) return
    
    const subtreeWidth = calculateSubtreeWidth(node)
    let currentX = x - (subtreeWidth - nodeWidth) / 2
    
    node.children.forEach((child, index) => {
      const childWidth = calculateSubtreeWidth(child)
      const childX = currentX + childWidth / 2 - nodeWidth / 2
      positionNode(child, childX, y + nodeHeight + verticalSpacing)
      currentX += childWidth + horizontalSpacing
    })
  }
  
  // Start positioning from root
  const totalWidth = calculateSubtreeWidth(root)
  positionNode(root, totalWidth / 2 - nodeWidth / 2, 0)
  
  return {
    nodes,
    width: maxWidth,
    height: maxHeight
  }
}

export function findNodePath(root: LayoutTreeNode, targetId: string): string[] {
  const path: string[] = []
  
  const traverse = (node: LayoutTreeNode): boolean => {
    if (node.id === targetId) {
      if (node.id !== 'root') {
        path.unshift(node.id)
      }
      return true
    }
    
    for (const child of node.children) {
      if (traverse(child)) {
        if (node.id !== 'root') {
          path.unshift(node.id)
        }
        return true
      }
    }
    
    return false
  }
  
  traverse(root)
  return path
}