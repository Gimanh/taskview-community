// import { ref } from "vue";
// import { useI18n } from "vue-i18n";
// import { useTasksStore } from "@/stores/tasks.store";
// import type { Task } from "taskview-api";

// export const useTransactionType = () => {
//     const { t } = useI18n();
//     const tasksStore = useTasksStore();
//     const transactions = ref([
//         { title: t('task.transactionIncome'), type: 1 },
//         { title: t('task.transactionExpense'), type: 0 }
//     ]);

//     const updateTransactionType = async (taskId: Task['id'], transactionType: Task['transactionType']) => {
//         await tasksStore.updateTaskTransactionType({ id: taskId, transactionType });
//     }

//     return {
//         transactions,
//         updateTransactionType
//     }
// }
