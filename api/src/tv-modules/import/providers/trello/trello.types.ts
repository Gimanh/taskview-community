import type { ImportLocale, ImportNoteComment } from '../../core/import-provider.types';

export type TrelloCredentials = {
    apiKey: string;
    token: string;
};

export type TrelloListAs = 'status' | 'list';

export type TrelloChecklistsAs = 'subtasks' | 'note';

export type TrelloOptions = {
    listAs: TrelloListAs;
    checklistsAs: TrelloChecklistsAs;
    includeArchived: boolean;
    commentsToNote: boolean;
    includeAttachments: boolean;
};

export type TrelloMember = {
    id: string;
    fullName: string | null;
    username: string | null;
};

export type TrelloBoardSummary = {
    id: string;
    name: string;
    url: string | null;
};

export type TrelloBoard = {
    id: string;
    name: string;
    desc: string | null;
    url: string | null;
};

export type TrelloList = {
    id: string;
    name: string;
    closed: boolean;
    pos: number;
};

export type TrelloLabel = {
    id: string;
    name: string | null;
    color: string | null;
};

export type TrelloAttachment = {
    id: string;
    name: string | null;
    fileName: string | null;
    url: string | null;
    bytes: number | null;
    mimeType: string | null;
    isUpload: boolean;
};

export type TrelloCheckItem = {
    id: string;
    name: string;
    state: 'complete' | 'incomplete';
    pos: number;
    due: string | null;
    idMember: string | null;
};

export type TrelloChecklist = {
    id: string;
    name: string;
    pos: number;
    checkItems: TrelloCheckItem[];
};

export type TrelloCard = {
    id: string;
    name: string;
    desc: string | null;
    closed: boolean;
    idList: string;
    idLabels: string[];
    idMembers: string[];
    pos: number;
    start: string | null;
    due: string | null;
    dueComplete: boolean;
    url: string | null;
    dateLastActivity: string | null;
    attachments?: TrelloAttachment[];
    checklists?: TrelloChecklist[];
};

export type TrelloCommentAction = {
    id: string;
    date: string;
    data: {
        text?: string;
        card?: { id: string };
    };
    memberCreator?: { fullName?: string | null; username?: string | null };
};

export type TrelloComment = ImportNoteComment;

export type TrelloBoardSnapshot = {
    board: TrelloBoard;
    lists: TrelloList[];
    labels: TrelloLabel[];
    cards: TrelloCard[];
    commentsByCard: Map<string, TrelloComment[]>;
};

export type TrelloFetchCardsArgs = {
    boardId: string;
    filter: 'all' | 'open';
    fields: string;
    withDetails: boolean;
};

export type TrelloFetchCardDetailsArgs = {
    boardId: string;
    includeArchived: boolean;
};

export type TrelloDownloadArgs = {
    cardId: string;
    attachmentId: string;
    fileName: string;
};

export type TrelloMapperArgs = {
    snapshot: TrelloBoardSnapshot;
    options: TrelloOptions;
    locale: ImportLocale;
};
