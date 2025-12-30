import { type } from 'arktype';
import type { Request, Response } from 'express';
import { $logger } from '../../modules/logget';
import { GraphRelationsArkType } from './types';

export class GraphController {
    addEdge = async (req: Request, res: Response) => {
        const out = GraphRelationsArkType({
            fromTaskId: req.body.source,
            toTaskId: req.body.target,
        });

        if (out instanceof type.errors) {
            console.error(out.summary);
            $logger.info(out.summary);
            return res.status(400).send(out.summary);
        }

        const insertedEdge = await req.appUser.graphManager.addEdge(out);

        if (!insertedEdge || insertedEdge.length === 0) {
            return res.status(500).send('Failed to insert edge');
        }

        return res.tvJson(insertedEdge[0]);
    };

    fetchAllEdges = async (req: Request, res: Response) => {
        if (!req.params.goalId) {
            return res.status(400).send('Goal ID is required');
        }
        const edges = await req.appUser.graphManager.fetchAllEdges(+req.params.goalId);
        return res.tvJson(edges);
    };

    deleteEdge = async (req: Request, res: Response) => {
        if (!req.params.id) {
            return res.status(400).send('Edge ID is required');
        }
        const deletedEdge = await req.appUser.graphManager.deleteEdge(+req.params.id);
        return res.tvJson(deletedEdge);
    };
}
