export const GRAPH_LEGEND_ITEMS = Object.freeze([
  { type: 'node', state: 'unvisited', label: 'Unvisited' },
  { type: 'node', state: 'frontier', label: 'Frontier' },
  { type: 'node', state: 'visited', label: 'Visited' },
  { type: 'node', state: 'current', label: 'Current' },
  { type: 'node', state: 'final-node', label: 'Final-route node' },
  { type: 'edge', state: 'candidate', label: 'Candidate edge' },
  { type: 'edge', state: 'active', label: 'Active relaxation' },
  { type: 'edge', state: 'route', label: 'Normal route segment' },
  { type: 'edge', state: 'warning', label: 'Warning route segment' },
])
