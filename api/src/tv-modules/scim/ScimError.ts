import type { ScimErrorArgs, ScimErrorType } from './types'

export class ScimError extends Error {
  readonly status: number
  readonly scimType?: ScimErrorType

  constructor(args: ScimErrorArgs) {
    super(args.detail)
    this.status = args.status
    this.scimType = args.scimType
  }
}
