<template>
  <VueFlow
    v-if="canViewGraph"
    v-model:nodes="store.nodes"
    v-model:edges="store.edges"
    :min-zoom="-2"
    fit-view-on-init
    elevate-edges-on-select
    elevate-nodes-on-select
    :pan-on-scroll-mode="PanOnScrollMode.Free"
    :pan-on-scroll="true"
    :default-edge-options="defaultEdgeOptions"
    :connection-mode="ConnectionMode.Loose"
    :nodes-connectable="canManageGraph"
    :nodes-draggable="canManageGraph"
    class="h-full w-full"
    @connect-start="onConnectStart"
    @connect-end="onConnectEnd"
  >
    <AddNewTaskToGraph
      v-model="addNewTaskToGraph"
      :goal-id="+projectId"
      :node-position="nodePosition"
      @close="addNewTaskToGraph = false"
      @add-task="addTaskToGraph"
    />

    <Controls />
    <Background />

    <template #node-task="taskNodeProps">
      <TaskNode :data="{ ...taskNodeProps.data, direction: layoutDirection }" />
    </template>

    <!-- Selected Edge Panel -->
    <div
      v-if="selectedEdge"
      class="w-80 max-w-[calc(100%-16px)] absolute bottom-0 left-1/2 -translate-x-1/2 mb-3 z-50 p-3 rounded-lg bg-elevated shadow-lg"
    >
      <p class="text-sm text-muted mb-3">
        {{ t('graph.selectedEdge') }}
      </p>
      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="soft"
        class="w-full"
        @click="deleteSelectedEdge(+selectedEdge?.id)"
      >
        {{ t('common.delete') }}
      </UButton>
    </div>

    <!-- Controls Panel -->
    <div class="absolute bottom-4 right-4 z-40 flex gap-2">
      <UButton
        icon="i-lucide-git-graph"
        :variant="layoutDirection === 'LR' ? 'solid' : 'outline'"
        color="neutral"
        class="rotate-90"
        @click="layoutGraph('LR')"
      />
      <UButton
        icon="i-lucide-git-graph"
        :variant="layoutDirection === 'TB' ? 'solid' : 'outline'"
        color="neutral"
        @click="layoutGraph('TB')"
      />
      <UButton
        v-if="canManageGraph"
        icon="i-lucide-plus"
        @click="addNewTaskToGraph = true"
      />
    </div>
  </VueFlow>
</template>

<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import {
  ConnectionMode,
  type DefaultEdgeOptions,
  type Edge,
  MarkerType,
  type OnConnectStartParams,
  PanOnScrollMode,
  useVueFlow,
  VueFlow,
} from '@vue-flow/core'
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGraphStore } from '@/stores/graph.store'
import type { TaskItem } from '@/types/tasks.types'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useAppRouteInfo } from '@/composables/useAppRouteInfo'
import AddNewTaskToGraph from './AddNewTaskToGraph.vue'
import { useLayout } from './composables/useLayout'
import TaskNode from './TaskNode.vue'

const {
  fitView,
  onConnect,
  addEdges,
  onEdgesChange,
  onEdgeClick,
  onNodeDragStop,
  getEdges,
  updateEdgeData,
  removeEdges,
  screenToFlowCoordinate,
} = useVueFlow()

const { projectId } = useAppRouteInfo()
const { layout } = useLayout()
const store = useGraphStore()
const { t } = useI18n()
const { canManageGraph, canViewGraph } = useGoalPermissions()

const addNewTaskToGraph = ref(false)
const currentSession = ref<number | null>(null)
const successfulSession = ref<number | null>(null)
const targetNodeId = ref<{ event?: MouseEvent } & OnConnectStartParams>()
const nodePosition = ref<{ x: number; y: number } | undefined>(undefined)

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: {
    strokeWidth: 3,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 22,
    height: 22,
  },
}

const selectedEdge = ref<Edge | null>(null)
const layoutDirection = ref<'LR' | 'TB'>('TB')

watch(
  projectId,
  (id) => {
    if (!id) return
    store.fetchAllTasksAndLists(id).then(() => {
      layoutGraph(layoutDirection.value)
    })
  },
  { immediate: true },
)

onNodeDragStop((params) => {
  store.updateTaskPosition({
    nodeGraphPosition: { x: params.node.position.x, y: params.node.position.y },
    id: +params.node.id,
  })
})

onConnect(async (params) => {
  if (currentSession.value != null) {
    successfulSession.value = currentSession.value
  }

  const newEdge = await store.addEdge({
    source: +params.source,
    target: +params.target,
  })

  if (!newEdge) return

  addEdges([newEdge])
})

onEdgesChange((params) => {
  params.forEach((param) => {
    if (param.type === 'select' && !param.selected) {
      selectedEdge.value = null
    }
    if (param.type === 'remove') {
      deleteSelectedEdge(+param.id)
      selectedEdge.value = null
    }
  })
})

onEdgeClick((params) => {
  selectedEdge.value = params.edge
})

const newToken = () => {
  return Date.now() + Math.random()
}

const onConnectStart = (payload: { event?: MouseEvent } & OnConnectStartParams) => {
  const token = newToken()
  currentSession.value = token
  successfulSession.value = null
  targetNodeId.value = payload
}

const onConnectEnd = (event?: MouseEvent | TouchEvent) => {
  if (!event) return

  const { clientX, clientY } = 'changedTouches' in event ? (event as TouchEvent).changedTouches[0] : event

  const el = document.querySelector('[data-id]')
  const position = el?.getBoundingClientRect()

  nodePosition.value = screenToFlowCoordinate({ x: clientX - (position?.width || 2) / 2, y: clientY })

  const isSuccess = currentSession.value != null && successfulSession.value === currentSession.value

  if (!isSuccess) {
    handleCancelledConnection()
  }

  currentSession.value = null
  successfulSession.value = null
}

const handleCancelledConnection = () => {
  addNewTaskToGraph.value = true
}

const addTaskToGraph = async (task: TaskItem) => {
  addNewTaskToGraph.value = false

  await store.addNode(task)

  if (targetNodeId.value && targetNodeId.value.nodeId) {
    const edge = {
      source: +task.id,
      target: +task.id,
    }
    edge[targetNodeId.value.handleType as 'source' | 'target'] = +targetNodeId.value.nodeId
    await store.addEdge(edge)
  }

  nodePosition.value = { x: 0, y: 0 }
  targetNodeId.value = undefined
}

const deleteSelectedEdge = async (id: number) => {
  if (!Number.isFinite(id)) return

  await store.deleteEdge(+id)

  if (selectedEdge.value?.id === id.toString()) {
    selectedEdge.value = null
  }

  removeEdges([id.toString()])
}

const layoutGraph = async (direction: 'LR' | 'TB') => {
  layoutDirection.value = direction
  store.nodes = layout(store.nodes, store.edges, direction)
  nextTick(() => {
    fitView()
    getEdges.value.forEach((edge) => {
      updateEdgeData(edge.id, edge)
    })
  })
}
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/node-resizer/dist/style.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>
