import { computed, type ComputedRef } from 'vue'
import { getOnboardingTopicProviders } from '@/extensions/registry'
import { FIRST_RUN_TOPIC_ID, type OnboardingTopic } from '../types'
import { useOnboardingSteps } from './useOnboardingSteps'

export function useOnboardingTopics(): ComputedRef<OnboardingTopic[]> {
  const steps = useOnboardingSteps()
  const extensionTopics = getOnboardingTopicProviders().map((provide) => provide())

  const collaborationSteps = [
    steps.openCollaboration,
    steps.inviteMember,
    steps.openMemberMenu,
    steps.assignMemberRoles,
    steps.openRolesTab,
    steps.rolePermissions,
  ]
  const viewSteps = [
    steps.openKanban,
    steps.lookAtKanban,
    steps.openCalendar,
    steps.lookAtCalendar,
    steps.openGraph,
    steps.lookAtGraph,
  ]

  const ownTopics: OnboardingTopic[] = [
    {
      id: FIRST_RUN_TOPIC_ID,
      title: 'onboarding.topic.firstRun.title',
      description: 'onboarding.topic.firstRun.description',
      icon: 'i-lucide-sparkles',
      steps: [
        steps.createFirstProject,
        steps.createTask,
        ...collaborationSteps,
        steps.openTask,
        steps.assignTask,
        ...viewSteps,
        steps.allSet,
      ],
    },
    {
      id: 'projects',
      title: 'onboarding.topic.projects.title',
      description: 'onboarding.topic.projects.description',
      icon: 'i-lucide-folder-plus',
      steps: [steps.createProject, steps.createTask, steps.allSet],
    },
    {
      id: 'tasks',
      title: 'onboarding.topic.tasks.title',
      description: 'onboarding.topic.tasks.description',
      icon: 'i-lucide-list-checks',
      steps: () => [steps.createFirstProject, steps.createTask, steps.openTask, steps.taskTitle, ...steps.taskFieldSteps(), steps.allSet],
    },
    {
      id: 'collaboration',
      title: 'onboarding.topic.collaboration.title',
      description: 'onboarding.topic.collaboration.description',
      icon: 'i-lucide-users',
      steps: [steps.createFirstProject, ...collaborationSteps, steps.allSet],
    },
    {
      id: 'views',
      title: 'onboarding.topic.views.title',
      description: 'onboarding.topic.views.description',
      icon: 'i-lucide-kanban',
      steps: [steps.createFirstProject, ...viewSteps, steps.allSet],
    },
    {
      id: 'time-reports',
      title: 'onboarding.topic.timeReports.title',
      description: 'onboarding.topic.timeReports.description',
      icon: 'i-lucide-clock-4',
      steps: [
        steps.createFirstProject,
        steps.pickTaskForTime,
        steps.openTaskForTime,
        steps.logTime,
        steps.openTimeReports,
        steps.timeReportsFilters,
        steps.timeReportsTotals,
        steps.timeReportsViews,
      ],
    },
  ]

  return computed(() => [...ownTopics, ...extensionTopics.flatMap((provided) => provided.value)])
}
