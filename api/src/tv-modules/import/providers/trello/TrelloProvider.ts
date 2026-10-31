import { type } from 'arktype';
import type { ImportProvider } from '../../core/ImportProvider';
import { ImportProviderError } from '../../core/ImportProviderError';
import type {
    ImportAttachment,
    ImportAttachmentDownload,
    ImportCredentials,
    ImportOptionField,
    ImportProjectMeta,
    ImportProviderAuth,
    ImportProviderCredentialsArgs,
    ImportProviderOptions,
    ImportProviderProjectArgs,
    ImportProviderReaderArgs,
    ImportProviderSanitizeResult,
    ImportReader,
    ImportRemoteProject,
    ImportStructure,
    ImportTask,
    ImportValidationResult,
} from '../../core/import-provider.types';
import { TrelloClient } from './TrelloClient';
import { TrelloMapper } from './TrelloMapper';
import { TRELLO_PROVIDER_ID } from './trello.constants';
import type { TrelloBoardSnapshot, TrelloCredentials, TrelloDownloadArgs, TrelloOptions } from './trello.types';

const TASK_BATCH_SIZE = 200;
const CREDENTIAL_PATTERN = /^[A-Za-z0-9]{20,256}$/;

const TrelloOptionsArk = type({
    listAs: "'status' | 'list'",
    checklistsAs: "'subtasks' | 'note'",
    includeArchived: 'boolean',
    commentsToNote: 'boolean',
    includeAttachments: 'boolean',
});

const TrelloDownloadRefArk = type({
    cardId: /^[a-f0-9]{24}$/,
    attachmentId: /^[a-f0-9]{24}$/,
    fileName: 'string',
});

export class TrelloProvider implements ImportProvider {
    readonly id = TRELLO_PROVIDER_ID;

    readonly options: ImportOptionField[] = [
        { key: 'listAs', kind: 'select', values: ['status', 'list'], default: 'status' },
        { key: 'checklistsAs', kind: 'select', values: ['subtasks', 'note'], default: 'subtasks' },
        { key: 'includeArchived', kind: 'toggle', default: false },
        { key: 'commentsToNote', kind: 'toggle', default: true },
        { key: 'includeAttachments', kind: 'toggle', default: true },
    ];

    private get serverApiKey(): string | null {
        const key = process.env.TRELLO_API_KEY?.trim();
        return key && CREDENTIAL_PATTERN.test(key) ? key : null;
    }

    auth(): ImportProviderAuth {
        const apiKey = this.serverApiKey;
        const popupAuthorizeUrl = apiKey
            ? `https://trello.com/1/authorize?${new URLSearchParams({
                key: apiKey,
                name: 'TaskView',
                scope: 'read',
                expiration: '1day',
                response_type: 'token',
                callback_method: 'fragment',
            }).toString()}`
            : null;
        return {
            popupAuthorizeUrl,
            popupCredentialKey: apiKey ? 'token' : null,
            manualFields: [
                { key: 'apiKey', secret: false },
                { key: 'token', secret: true },
            ],
        };
    }

    defaultOptions(): ImportProviderOptions {
        return Object.fromEntries(this.options.map((option) => [option.key, option.default]));
    }

    sanitizeOptions(options: unknown): ImportProviderSanitizeResult {
        const parsed = TrelloOptionsArk(options);
        if (parsed instanceof type.errors) return { ok: false, message: parsed.summary };
        const sanitized: TrelloOptions = {
            listAs: parsed.listAs,
            checklistsAs: parsed.checklistsAs,
            includeArchived: parsed.includeArchived,
            commentsToNote: parsed.commentsToNote,
            includeAttachments: parsed.includeAttachments,
        };
        return { ok: true, options: sanitized };
    }

    async validateCredentials(args: ImportProviderCredentialsArgs): Promise<ImportValidationResult> {
        const credentials = this.credentials(args.credentials);
        if (!credentials) return { ok: false, code: 'invalid_credentials' };
        try {
            const me = await new TrelloClient(credentials).fetchMe();
            return { ok: true, accountName: me.fullName || me.username || me.id };
        } catch (err) {
            if (err instanceof ImportProviderError) return { ok: false, code: err.code };
            throw err;
        }
    }

    async listRemoteProjects(args: ImportProviderCredentialsArgs): Promise<ImportRemoteProject[]> {
        const boards = await this.client(args.credentials).fetchBoards();
        return boards.map((board) => ({ externalId: board.id, name: board.name, url: board.url ?? null }));
    }

    async fetchProjectMeta(args: ImportProviderProjectArgs): Promise<ImportProjectMeta> {
        const client = this.client(args.credentials);
        const board = await client.fetchBoard(args.externalProjectId);
        const members = await client.fetchMembers(args.externalProjectId);
        const cards = await client.fetchCards({
            boardId: args.externalProjectId,
            filter: 'all',
            fields: 'closed',
            withDetails: false,
        });

        let attachmentCount = 0;
        let attachmentBytes = 0;
        for (const card of cards) {
            for (const attachment of card.attachments ?? []) {
                if (!attachment.isUpload) continue;
                attachmentCount++;
                attachmentBytes += attachment.bytes ?? 0;
            }
        }

        return {
            externalId: board.id,
            name: board.name,
            url: board.url ?? null,
            people: members.map((member) => ({
                externalId: member.id,
                displayName: member.fullName || member.username || member.id,
                username: member.username ?? null,
                email: null,
            })),
            taskCount: cards.filter((card) => !card.closed).length,
            archivedTaskCount: cards.filter((card) => card.closed).length,
            attachmentCount,
            attachmentBytes,
        };
    }

    createReader(args: ImportProviderReaderArgs): ImportReader {
        const client = this.client(args.credentials);
        const sanitized = this.sanitizeOptions(args.options);
        if (!sanitized.ok) throw new Error(`Invalid Trello import options: ${sanitized.message}`);
        const options = sanitized.options as TrelloOptions;
        let mapper: TrelloMapper | null = null;

        const loadMapper = async (): Promise<TrelloMapper> => {
            if (mapper) return mapper;
            const boardId = args.externalProjectId;
            const snapshot: TrelloBoardSnapshot = {
                board: await client.fetchBoard(boardId),
                lists: await client.fetchLists(boardId),
                labels: await client.fetchLabels(boardId),
                cards: await client.fetchCardDetails({ boardId, includeArchived: options.includeArchived }),
                commentsByCard: options.commentsToNote ? await client.fetchComments(boardId) : new Map(),
            };
            mapper = new TrelloMapper({ snapshot, options, locale: args.locale });
            return mapper;
        };

        return {
            readStructure: async (): Promise<ImportStructure> => (await loadMapper()).structure(),
            readTasks: async function* (): AsyncGenerator<ImportTask[]> {
                const tasks = (await loadMapper()).tasks();
                for (let i = 0; i < tasks.length; i += TASK_BATCH_SIZE) {
                    yield tasks.slice(i, i + TASK_BATCH_SIZE);
                }
            },
            downloadAttachment: async (attachment: ImportAttachment): Promise<ImportAttachmentDownload> => {
                const stream = await client.downloadAttachment(this.parseDownloadRef(attachment.downloadRef));
                return { stream, mimeType: attachment.mimeType };
            },
        };
    }

    private parseDownloadRef(ref: string): TrelloDownloadArgs {
        const parsed = TrelloDownloadRefArk(JSON.parse(ref));
        if (parsed instanceof type.errors) throw new ImportProviderError('not_found', 'Invalid Trello attachment reference');
        return { cardId: parsed.cardId, attachmentId: parsed.attachmentId, fileName: parsed.fileName };
    }

    private client(credentials: ImportCredentials): TrelloClient {
        const parsed = this.credentials(credentials);
        if (!parsed) throw new ImportProviderError('invalid_credentials', 'Trello credentials are malformed');
        return new TrelloClient(parsed);
    }

    private credentials(credentials: ImportCredentials): TrelloCredentials | null {
        const apiKey = credentials.apiKey?.trim() || this.serverApiKey;
        const token = credentials.token?.trim();
        if (!apiKey || !token || !CREDENTIAL_PATTERN.test(apiKey) || !CREDENTIAL_PATTERN.test(token)) return null;
        return { apiKey, token };
    }
}
