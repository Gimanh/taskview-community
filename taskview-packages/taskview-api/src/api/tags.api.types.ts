export type TagItem = {
    id: number;
    name: string;
    color: string;
    owner: number;
    goalId: number | null;
}

export type TagItemArgAdd = {
    name: string;
    color: string;
    goalId: number;
}

export type TagItemResponseAdd = TagItem | null;

export type TagItemArgDelete = {
    tagId: number;
}

export type TagItemResponseDelete = boolean;

export type TagItemArgUpdate = {
    id: number;
    name: string;
    color: string;
    goalId: number;
}

export type TagItemResponseUpdate = TagItem;

export type TagItemResponseFetch = TagItem[];

export type TagItemArgToggle = {
    tagId: number;
    taskId: number;
}

export type TagItemResponseToggle = {
    action: 'delete' | 'add' | false;
}