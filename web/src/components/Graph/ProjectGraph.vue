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

        @connect-start="onConnectStart"
        @connect-end="onConnectEnd"
    >
        <!-- <MiniMap /> -->

        <AddNewTaskToGraph
            v-model="addNewTaskToGraph"
            :goal-id="+route.params.goalId"
            :node-position="nodePosition"
            @close="addNewTaskToGraph = false"
            @add-task="addTaskToGraph"
        />
        <Controls />

        <Background />

        <template #node-task="taskNodeProps">
            <TaskNode
                :data="{...taskNodeProps.data, direction: layoutDirection}"
            />
        </template>

        <div
            v-if="selectedEdge"
            class="w-96 max-w-[calc(100%-16px)] absolute bottom-0 left-[50%] translate-x-[-50%] mb-3  z-50 p-3 py-2 rounded-md flex flex-col gap-5 bg-[rgb(var(--v-theme-surface))]"
        >
            <div class="text-sm text-gray-500">
                {{ t('msg.selectedEdge') }}
            </div>

            <div class="text-sm text-gray-500">
                <button
                    class="flex items-center justify-center gap-2 px-2 py-1 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 w-full hover:opacity-90 shadow-md"
                    @click="deleteSelectedEdge(+selectedEdge?.id)"
                >
                    <VIcon size="x-small">
                        {{ mdiDeleteOutline }}
                    </VIcon> 
                    {{ t('msg.delete') }}
                </button>
            </div>
        </div>

        <div class="absolute bottom-4 right-4 z-40 flex gap-2">
            <VBtn
                :variant="layoutDirection === 'LR' ? 'tonal' : 'elevated'"
                @click="layoutGraph('LR')"
            >
                <VIcon class="rotate-90">
                    {{ mdiGraphOutline }}
                </VIcon>
            </VBtn>
            <VBtn
                :variant="layoutDirection === 'TB' ? 'tonal' : 'elevated'"
                @click="layoutGraph('TB')"
            >
                <VIcon>
                    {{ mdiGraphOutline }}
                </VIcon>
            </VBtn>
            <VBtn @click="addNewTaskToGraph = true">
                <VIcon>{{ mdiPlus }}</VIcon>
            </VBtn>
        </div>
    </VueFlow>
</template>

<script setup lang="ts">
import { mdiDeleteOutline, mdiGraphOutline, mdiPlus } from '@mdi/js';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import {
    ConnectionMode,
    type DefaultEdgeOptions,
    type Edge,
    MarkerType,
    type OnConnectStartParams,
    PanOnScrollMode,
    useVueFlow,
    VueFlow,
} from '@vue-flow/core';
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useGraphStore } from '@/stores/graph.store';
import type { TaskItem } from '@/types/tasks.types';
import AddNewTaskToGraph from './AddNewTaskToGraph.vue';
import { useLayout } from './composables/useLayout';
import TaskNode from './TaskNode.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';

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
} = useVueFlow();
const route = useRoute();
const { layout } = useLayout();
const store = useGraphStore();
const { t } = useI18n();
const { canManageGraph, canViewGraph } = useGoalPermissions();

const addNewTaskToGraph = ref(false);
const currentSession = ref<number | null>(null);
const successfulSession = ref<number | null>(null);
const targetNodeId = ref<{ event?: MouseEvent } & OnConnectStartParams>();
const nodePosition = ref<{ x: number; y: number } | undefined>(undefined);

const defaultEdgeOptions: DefaultEdgeOptions = {
    type: 'smoothstep',
    animated: true,
    style: {
        strokeWidth: 3,
        //  stroke: '#4f46e5'
    },
    markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 22,
        height: 22,
        // color: '#4f46e5',
    },
};

const selectedEdge = ref<Edge | null>(null);

const layoutDirection = ref<'LR' | 'TB'>('TB');

watch(
    () => route.params.goalId,
    () => {
        if (!route.params.goalId) return;

        store.fetchAllTasksAndLists(+route.params.goalId).then(() => {
            layoutGraph(layoutDirection.value);
        });
    },
    { immediate: true }
);

onNodeDragStop((params) => {
    store.updateTaskPosition({
        nodeGraphPosition: { x: params.node.position.x, y: params.node.position.y },
        id: +params.node.id,
    });
});

onConnect(async (params) => {
    if (currentSession.value != null) {
        successfulSession.value = currentSession.value;
    }

    const newEdge = await store.addEdge({
        source: +params.source,
        target: +params.target,
    });

    if (!newEdge) return;

    addEdges([newEdge]);
});

onEdgesChange((params) => {
    params.forEach((param) => {
        if (param.type === 'select' && !param.selected) {
            selectedEdge.value = null;
        }
        if (param.type === 'remove') {
            deleteSelectedEdge(+param.id);
            selectedEdge.value = null;
        }
    });
});

onEdgeClick((params) => {
    selectedEdge.value = params.edge;
});

const newToken = () => {
    return Date.now() + Math.random();
};

const onConnectStart = (payload: { event?: MouseEvent } & OnConnectStartParams) => {
    const token = newToken();
    currentSession.value = token;
    successfulSession.value = null;
    targetNodeId.value = payload;
};

const onConnectEnd = (event?: MouseEvent | TouchEvent) => {
    if (!event) return;

    const { clientX, clientY } = 'changedTouches' in event ? (event as TouchEvent).changedTouches[0] : event;

    const el = document.querySelector('[data-id="2759"]');

    const position = el?.getBoundingClientRect();

    nodePosition.value = screenToFlowCoordinate({ x: clientX - (position?.width || 2) / 2, y: clientY });

    const isSuccess = currentSession.value != null && successfulSession.value === currentSession.value;

    if (!isSuccess) {
        handleCancelledConnection();
    }

    currentSession.value = null;
    successfulSession.value = null;
};

const handleCancelledConnection = () => {
    addNewTaskToGraph.value = true;
};

const addTaskToGraph = async (task: TaskItem) => {
    addNewTaskToGraph.value = false;

    await store.addNode(task);

    if (targetNodeId.value && targetNodeId.value.nodeId) {
        const edge = {
            source: +task.id,
            target: +task.id,
        };
        edge[targetNodeId.value.handleType as 'source' | 'target'] = +targetNodeId.value.nodeId;
        await store.addEdge(edge);
    }

    nodePosition.value = { x: 0, y: 0 };
    targetNodeId.value = undefined;
};

const deleteSelectedEdge = async (id: number) => {
    if (!Number.isFinite(id)) return;

    await store.deleteEdge(+id);

    if (selectedEdge.value?.id === id.toString()) {
        selectedEdge.value = null;
    }

    console.log(removeEdges([id.toString()]));
};

const layoutGraph = async (direction: 'LR' | 'TB') => {
    layoutDirection.value = direction;
    store.nodes = layout(store.nodes, store.edges, direction);
    nextTick(() => {
        fitView();
        getEdges.value.forEach((edge) => {
            updateEdgeData(edge.id, edge);
        });
    });
};
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/node-resizer/dist/style.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
/* @import '@vue-flow/background/dist/style.css'; */
</style>
