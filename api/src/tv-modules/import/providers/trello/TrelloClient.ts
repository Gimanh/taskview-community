import type { Readable } from 'stream';
import { ImportHttpClient } from '../../core/ImportHttpClient';
import { ImportProviderError } from '../../core/ImportProviderError';
import type {
    TrelloBoard,
    TrelloBoardSummary,
    TrelloCard,
    TrelloComment,
    TrelloCommentAction,
    TrelloCredentials,
    TrelloDownloadArgs,
    TrelloFetchCardDetailsArgs,
    TrelloFetchCardsArgs,
    TrelloLabel,
    TrelloList,
    TrelloMember,
} from './trello.types';

const TRELLO_API_URL = 'https://api.trello.com/1';
const PAGE_SIZE = 1000;
const MAX_CARD_PAGES = 20;
const MAX_COMMENT_PAGES = 50;
const MIN_REQUEST_INTERVAL_MS = 120;
const CARD_DETAIL_FIELDS = 'name,desc,closed,idList,idLabels,idMembers,pos,start,due,dueComplete,url,dateLastActivity';

export class TrelloClient {
    private readonly http: ImportHttpClient;

    constructor(credentials: TrelloCredentials) {
        this.http = new ImportHttpClient({
            providerName: 'Trello',
            baseUrl: TRELLO_API_URL,
            headers: {
                Authorization: `OAuth oauth_consumer_key="${credentials.apiKey}", oauth_token="${credentials.token}"`,
            },
            minRequestIntervalMs: MIN_REQUEST_INTERVAL_MS,
        });
    }

    async fetchMe(): Promise<TrelloMember> {
        return this.http.get<TrelloMember>({ path: '/members/me', params: { fields: 'fullName,username' } });
    }

    async fetchBoards(): Promise<TrelloBoardSummary[]> {
        return this.http.get<TrelloBoardSummary[]>({
            path: '/members/me/boards',
            params: { filter: 'open', fields: 'name,url' },
        });
    }

    async fetchBoard(boardId: string): Promise<TrelloBoard> {
        return this.http.get<TrelloBoard>({ path: `/boards/${boardId}`, params: { fields: 'name,desc,url' } });
    }

    async fetchMembers(boardId: string): Promise<TrelloMember[]> {
        return this.http.get<TrelloMember[]>({ path: `/boards/${boardId}/members`, params: { fields: 'fullName,username' } });
    }

    async fetchLists(boardId: string): Promise<TrelloList[]> {
        return this.http.get<TrelloList[]>({ path: `/boards/${boardId}/lists`, params: { filter: 'all', fields: 'name,closed,pos' } });
    }

    async fetchLabels(boardId: string): Promise<TrelloLabel[]> {
        return this.http.get<TrelloLabel[]>({ path: `/boards/${boardId}/labels`, params: { fields: 'name,color', limit: PAGE_SIZE } });
    }

    async fetchCards(args: TrelloFetchCardsArgs): Promise<TrelloCard[]> {
        const params: Record<string, string | number> = {
            filter: args.filter,
            fields: args.fields,
            limit: PAGE_SIZE,
            sort: '-id',
            attachments: 'true',
            attachment_fields: args.withDetails ? 'name,fileName,url,bytes,mimeType,isUpload' : 'bytes,isUpload',
        };
        if (args.withDetails) params.checklists = 'all';

        const cards = new Map<string, TrelloCard>();
        let before: string | null = null;
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_CARD_PAGES) throw new ImportProviderError('too_large', 'Trello board has too many cards');
            const page: TrelloCard[] = await this.http.get<TrelloCard[]>({
                path: `/boards/${args.boardId}/cards`,
                params: before ? { ...params, before } : params,
            });
            const sizeBefore = cards.size;
            for (const card of page) cards.set(card.id, card);
            if (page.length < PAGE_SIZE || cards.size === sizeBefore) break;
            before = this.cardCreatedBefore(page[page.length - 1].id);
        }
        return [...cards.values()];
    }

    async fetchCardDetails(args: TrelloFetchCardDetailsArgs): Promise<TrelloCard[]> {
        return this.fetchCards({
            boardId: args.boardId,
            filter: args.includeArchived ? 'all' : 'open',
            fields: CARD_DETAIL_FIELDS,
            withDetails: true,
        });
    }

    async fetchComments(boardId: string): Promise<Map<string, TrelloComment[]>> {
        const byCard = new Map<string, TrelloComment[]>();
        let before: string | null = null;
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_COMMENT_PAGES) throw new ImportProviderError('too_large', 'Trello board has too many comments');
            const params: Record<string, string | number> = {
                filter: 'commentCard',
                limit: PAGE_SIZE,
                fields: 'date,data',
                memberCreator_fields: 'fullName,username',
            };
            if (before) params.before = before;
            const page = await this.http.get<TrelloCommentAction[]>({ path: `/boards/${boardId}/actions`, params });
            for (const action of page) {
                const cardId = action.data.card?.id;
                const text = action.data.text;
                if (!cardId || !text) continue;
                const list = byCard.get(cardId) ?? [];
                list.push({
                    authorName: action.memberCreator?.fullName || action.memberCreator?.username || '',
                    date: action.date,
                    text,
                });
                byCard.set(cardId, list);
            }
            if (page.length < PAGE_SIZE) break;
            before = page[page.length - 1].id;
        }
        for (const comments of byCard.values()) comments.sort((a, b) => a.date.localeCompare(b.date));
        return byCard;
    }

    async downloadAttachment(args: TrelloDownloadArgs): Promise<Readable> {
        const path = `/cards/${args.cardId}/attachments/${args.attachmentId}/download/${encodeURIComponent(args.fileName)}`;
        return this.http.stream(path);
    }

    // Card pages are windowed by creation time, which Trello encodes in the
    // id; the extra second overlaps the boundary and duplicates are dropped.
    private cardCreatedBefore(cardId: string): string {
        const seconds = parseInt(cardId.slice(0, 8), 16);
        return new Date((seconds + 1) * 1000).toISOString();
    }
}
