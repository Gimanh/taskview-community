import { registerPlugin } from '@capacitor/core'
import type { WidgetBridgePlugin } from './definitions'

export const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge')

export type {
  WidgetBridgePlugin,
  WidgetSnapshot,
  WidgetSnapshotMode,
  WidgetSnapshotTask,
  SetSnapshotOptions,
} from './definitions'
