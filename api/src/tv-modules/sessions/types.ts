import { type } from 'arktype'

export const SessionDeleteSchema = type({
  id: 'number',
})

export type SessionDeleteArg = typeof SessionDeleteSchema.infer
