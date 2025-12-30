import { type } from 'arktype';
import type { Request, Response } from 'express';
import {
    AddTagArgScheme,
    DeleteTagArgScheme,
    TagItemArkTypeAdd,
    TagItemArkTypeDelete,
    TagItemArkTypeToggle,
    TagItemArkTypeUpdate,
    ToggleTagArgScheme,
    UpdateTagArgsScheme,
} from './tags.types';

export class TagsController {
    /** @deprecated use addTagNew instead */
    add = async (req: Request, res: Response) => {
        const args = AddTagArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({ tag: await req.appUser.tagsManager.addTag(args.data) });
    };

    addTagNew = async (req: Request, res: Response) => {
        const data = TagItemArkTypeAdd(req.body);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson((await req.appUser.tagsManager.addTagNew(data)) ?? null);
    };

    /** @deprecated use fetchAllTagsForUser instead */
    fetchAll = async (req: Request, res: Response) => {
        return res.tvJson(await req.appUser.tagsManager.fetchAll());
    };

    fetchAllTagsForUser = async (req: Request, res: Response) => {
        return res.tvJson(await req.appUser.tagsManager.fetchAllTagsForUser());
    };

    /** @deprecated use toggleTagNew instead */
    toggleTag = async (req: Request, res: Response) => {
        const args = ToggleTagArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({ action: await req.appUser.tagsManager.toggleTag(args.data) });
    };

    toggleTagNew = async (req: Request, res: Response) => {
        const data = TagItemArkTypeToggle(req.body);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson({ action: await req.appUser.tagsManager.toggleTagNew(data) });
    };

    /** @deprecated use deleteTagNew instead */
    deleteTag = async (req: Request, res: Response) => {
        const args = DeleteTagArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({ delete: await req.appUser.tagsManager.deleteTag(args.data) });
    };

    deleteTagNew = async (req: Request, res: Response) => {
        const data = TagItemArkTypeDelete(req.body);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson(await req.appUser.tagsManager.deleteTagNew(data));
    };

    /** @deprecated use updateTagNew instead */
    updateTag = async (req: Request, res: Response) => {
        const args = UpdateTagArgsScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({ delete: await req.appUser.tagsManager.updateTag(args.data) });
    };

    updateTagNew = async (req: Request, res: Response) => {
        const data = TagItemArkTypeUpdate(req.body);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson(await req.appUser.tagsManager.updateTagNew(data));
    };
}
