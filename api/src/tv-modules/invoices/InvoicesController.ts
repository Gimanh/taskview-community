import type { Request, Response } from 'express'
import { ArkErrors } from 'arktype'
import { InvoicesManager } from './InvoicesManager'
import {
  InvoiceArkTypeCreate,
  InvoiceArkTypeId,
  InvoiceArkTypeList,
  InvoiceArkTypePdf,
  InvoiceArkTypeStatus,
  InvoiceArkTypeUpdate,
  type InvoiceDeleteResult,
  type InvoiceTransitionResult,
  type InvoiceWriteError,
} from './types'

const WRITE_ERROR_STATUS: Record<InvoiceWriteError, number> = {
  seller_not_found: 422,
  counterparty_not_found: 422,
  goal_not_found: 422,
  duplicate_number: 409,
  not_found: 404,
  not_draft: 409,
}

const TRANSITION_ERROR_STATUS = { not_found: 404, invalid_transition: 409, missing_requisites: 422 } as const

const DELETE_STATUS: Record<InvoiceDeleteResult, number> = { deleted: 200, not_draft: 409, not_found: 404 }

export class InvoicesController {
  private readonly manager = new InvoicesManager()

  fetch = async (req: Request, res: Response) => {
    const data = InvoiceArkTypeList(req.query)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    return res.tvJson(await this.manager.fetchList(data))
  }

  getById = async (req: Request, res: Response) => {
    const id = InvoiceArkTypeId(req.params)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    const result = await this.manager.fetchById(id.id)
    if (!result) return res.status(404).end()
    return res.tvJson(result)
  }

  create = async (req: Request, res: Response) => {
    const data = InvoiceArkTypeCreate(req.body)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.create({ data, createdBy: req.appUser.getUserData()?.id ?? null })
    if ('error' in result) return res.status(WRITE_ERROR_STATUS[result.error]).send(result.error)
    return res.tvJson(result.invoice)
  }

  update = async (req: Request, res: Response) => {
    const id = InvoiceArkTypeId(req.params)
    const data = InvoiceArkTypeUpdate(req.body)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.update({ invoiceId: id.id, data })
    if ('error' in result) return res.status(WRITE_ERROR_STATUS[result.error]).send(result.error)
    return res.tvJson(result.invoice)
  }

  setStatus = async (req: Request, res: Response) => {
    const id = InvoiceArkTypeId(req.params)
    const data = InvoiceArkTypeStatus(req.body)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    return this.sendTransition(res, await this.manager.transition({ invoiceId: id.id, status: data.status }))
  }

  reissue = async (req: Request, res: Response) => {
    const id = InvoiceArkTypeId(req.params)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    const result = await this.manager.reissue({ invoiceId: id.id, createdBy: req.appUser.getUserData()?.id ?? null })
    return this.sendTransition(res, result)
  }

  pdf = async (req: Request, res: Response) => {
    const data = InvoiceArkTypePdf({ ...req.params, ...req.query })
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const invoice = await this.manager.fetchById(data.id)
    if (!invoice) return res.status(404).end()
    const buffer = await this.manager.renderPdf({ invoiceId: data.id, lang: data.lang ?? 'en' })
    if (!buffer) return res.status(404).end()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(invoice.number)}.pdf"`)
    return res.send(buffer)
  }

  private sendTransition(res: Response, result: InvoiceTransitionResult) {
    if ('error' in result) return res.status(TRANSITION_ERROR_STATUS[result.error]).json(result)
    return res.tvJson(result.invoice)
  }

  delete = async (req: Request, res: Response) => {
    const id = InvoiceArkTypeId(req.params)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    const result = await this.manager.delete(id.id)
    if (result !== 'deleted') return res.status(DELETE_STATUS[result]).end()
    return res.tvJson(true)
  }
}
