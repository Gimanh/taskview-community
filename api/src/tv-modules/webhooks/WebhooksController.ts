import type { Request, Response } from 'express';
import { ArkErrors } from 'arktype';
import { WebhooksManager } from './WebhooksManager';
import {
    WebhookArkTypeCreate,
    WebhookArkTypeUpdate,
    WebhookArkTypeDelete,
    WebhookArkTypeFetch,
    WebhookArkTypeById,
    WebhookArkTypeFetchDeliveries,
} from './types';

export class WebhooksController {
    private readonly manager = new WebhooksManager();

    create = async (req: Request, res: Response) => {
        const data = WebhookArkTypeCreate(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.create(data);
        if (!result) return res.status(500).end();
        return res.tvJson(result);
    };

    update = async (req: Request, res: Response) => {
        const data = WebhookArkTypeUpdate(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.update(data);
        if (!result) return res.status(404).end();
        return res.tvJson(result);
    };

    delete = async (req: Request, res: Response) => {
        const data = WebhookArkTypeDelete(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.delete(data.id);
        return res.tvJson(result);
    };

    fetch = async (req: Request, res: Response) => {
        const data = WebhookArkTypeFetch(req.query);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.fetchByGoalId(data.goalId);
        return res.tvJson(result);
    };

    rotateSecret = async (req: Request, res: Response) => {
        const data = WebhookArkTypeById(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.rotateSecret(data.id);
        if (!result) return res.status(404).end();
        return res.tvJson(result);
    };

    testDelivery = async (req: Request, res: Response) => {
        const data = WebhookArkTypeById(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.testDelivery(data.id);
        return res.tvJson(result);
    };

    fetchDeliveries = async (req: Request, res: Response) => {
        const data = WebhookArkTypeFetchDeliveries({ ...req.params, ...req.query });
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.fetchDeliveries(data.id, {
            cursor: data.cursor,
            status: data.status,
        });
        return res.tvJson(result);
    };

    retryDelivery = async (req: Request, res: Response) => {
        const data = WebhookArkTypeById(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }
        const result = await this.manager.retryDelivery(data.id);
        return res.tvJson(result);
    };
}
