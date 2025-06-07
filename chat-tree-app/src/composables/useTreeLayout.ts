import { computed, type ComputedRef } from 'vue'
import type { TreeNode } from '../types/api'

export interface RenderNode extends TreeNode {
  x: number
  y: number
  level: number
}

export interface Connection {
  from: string
  to: string
  path: string
  isActive: boolean
}

export interface TreeLayout {
  width: number
  height: number
  nodes: RenderNode[]
}

export interface UseTreeLayoutConfig {
  nodeWidth?: number
  nodeHeight?: number
  horizontalSpacing?: number
  verticalSpacing?: number
}

export function useTreeLayout(
  treeStructure: ComputedRef<TreeNode | null>,
  currentPath: ComputedRef<TreeNode[]>,
  config: UseTreeLayoutConfig = {}
) {
  const {
    nodeWidth = 180,
    nodeHeight = 80,
    horizontalSpacing = 240,
    verticalSpacing = 120
  } = config

  // Convert tree structure to render nodes with positions
  const renderNodes = computed((): RenderNode[] => {
    if (!treeStructure.value) return []

    const nodes: RenderNode[] = []
    
    // Better tree layout algorithm that prevents overlap
    const layoutTree = (
      node: TreeNode, 
      level: number = 0, 
      parentX: number = 0, 
      siblingIndex: number = 0, 
      siblingCount: number = 1
    ): RenderNode => {
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

    layoutTree(treeStructure.value)
    
    // Adjust positions to prevent overlap
    adjustNodePositions(nodes)
    
    // Debug: Log nodes in development
    if (import.meta.env.DEV && nodes.length > 0) {
      console.log('Tree layout generated', nodes.length, 'nodes')
      nodes.slice(0, 3).forEach((node, index) => {
        console.log(`Node ${index}:`, {
          uuid: node.uuid.slice(-8),
          role: node.role,
          content: node.content.slice(0, 30),
          contentLength: node.content.length,
          position: { x: node.x, y: node.y }
        })
      })
    }
    
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
    if (!treeStructure.value) return []

    const connections: Connection[] = []
    const currentPathUuids = currentPath.value.map(node => node.uuid)

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

    generateConnections(treeStructure.value)
    return connections
  })

  return {
    renderNodes,
    treeLayout,
    connections,
    nodeWidth,
    nodeHeight
  }
}