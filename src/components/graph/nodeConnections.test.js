import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createNodeConnectionLookup,
  describeNodeConnections,
} from './nodeConnections.js'

const edge = (edgeId, fromNode, toNode) => ({
  properties: {
    edge_id: edgeId,
    from_node: fromNode,
    to_node: toNode,
  },
})

test('collects every incoming and outgoing directed edge for a node', () => {
  const lookup = createNodeConnectionLookup([
    edge('E001', 'DL01', 'DL02'),
    edge('E002', 'DL02', 'DL01'),
    edge('E003', 'DL01', 'DL03'),
  ])

  assert.deepEqual(lookup.get('DL01'), [
    {
      edgeId: 'E001',
      fromNode: 'DL01',
      toNode: 'DL02',
      direction: 'outgoing',
    },
    {
      edgeId: 'E002',
      fromNode: 'DL02',
      toNode: 'DL01',
      direction: 'incoming',
    },
    {
      edgeId: 'E003',
      fromNode: 'DL01',
      toNode: 'DL03',
      direction: 'outgoing',
    },
  ])
})

test('describes the location and all connected edges for hover text', () => {
  const description = describeNodeConnections({
    id: 'DL01',
    name: 'Ga Đà Lạt',
    connections: createNodeConnectionLookup([
      edge('E001', 'DL01', 'DL02'),
      edge('E002', 'DL03', 'DL01'),
    ]).get('DL01'),
  })

  assert.match(description, /^DL01: Ga Đà Lạt/)
  assert.match(description, /Outgoing \(1\): E001 → DL02/)
  assert.match(description, /Incoming \(1\): E002 ← DL03/)
})
