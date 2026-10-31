import type { ImportPriority } from '../../core/import-provider.types';

export const TODOIST_PROVIDER_ID = 'todoist';

export const TODOIST_WEB_HOST = 'app.todoist.com';

export const TODOIST_FILES_HOST = 'files.todoist.com';

export const TODOIST_DEFAULT_LABEL_COLOR = '#808080';

export const TODOIST_COLORS: Record<string, string> = {
    berry_red: '#B8255F',
    red: '#DC4C3E',
    orange: '#C77100',
    yellow: '#B29104',
    olive_green: '#949C31',
    lime_green: '#65A33A',
    green: '#369307',
    mint_green: '#42A393',
    teal: '#148FAD',
    sky_blue: '#319DC0',
    light_blue: '#6988A4',
    blue: '#4180FF',
    grape: '#692EC2',
    violet: '#CA3FEE',
    lavender: '#A4698C',
    magenta: '#E05095',
    salmon: '#C9766F',
    charcoal: '#808080',
    grey: '#999999',
    taupe: '#8F7A69',
};

// Todoist priority 4 is the most urgent ("p1" in the app); 1 means no priority.
export const TODOIST_PRIORITIES: Record<number, ImportPriority> = {
    4: 3,
    3: 2,
    2: 1,
};
