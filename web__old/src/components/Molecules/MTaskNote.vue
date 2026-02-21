<template>
    <component
        :is="component"
        v-model="dialog"
        scrollable
        fullscreen
    >
        <v-card
            class="rounded-tv10 flex flex-col"
            max-height="500px"
        >
            <v-card-title>
                <div class="flex gap-2 flex-wrap">
                    <template v-if="!isReadonlyNote">
                        <div
                            v-for="button in buttons"
                            :key="button.icon"
                            class="flex p-2 rounded cursor-pointer"
                            @click="handleButtonClick(button)"
                        >
                            <v-icon
                                :color="button.active ? '#8e71ff' : 'gray'"
                                size="24"
                            >
                                {{ button.icon }}
                            </v-icon>
                        </div>
                    </template>
                    
                    <div class="flex-grow" />
                    <div 
                        class="flex p-2 rounded cursor-pointer"
                        @click="enableFullscreen"
                    >
                        <v-icon size="24">
                            {{ fullscreen ? mdiFullscreenExit : mdiFullscreen }}
                        </v-icon>
                    </div>
                </div>
                <v-divider />
            </v-card-title>
            <v-card-text
                v-if="editor && canWatchTaskNote"
                class="overflow-auto tip-tap-wrapper flex"
            >
                <EditorContent :editor="editor" />
            </v-card-text>
        </v-card>
    </component>
</template>
<script setup lang="ts">
import './TaskNote.scss';
import {
    mdiArrowULeftTop,
    mdiArrowURightTop,
    mdiCodeBraces,
    mdiCodeTags,
    mdiEraser,
    mdiFormatBold,
    mdiFormatColorFill,
    mdiFormatHeader1,
    mdiFormatHeader2,
    mdiFormatHeader3,
    mdiFormatItalic,
    mdiFormatListBulleted,
    mdiFormatListNumbered,
    mdiFormatParagraph,
    mdiFormatQuoteClose,
    mdiFormatStrikethroughVariant,
    mdiFullscreen,
    mdiFullscreenExit,
} from '@mdi/js';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Editor, EditorContent } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { debounce } from '@/helpers/app-helper';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ButtonItem = { icon: string; active?: boolean; action: (...rest: any) => void; disabled?: boolean; args?: any[] };

const props = defineProps<{ taskId: TaskItem['id']; note: TaskItem['note'] }>();
const tasksStorage = useTasksStore();
const editor = ref();
const dialog = ref(true);
const fullscreen = ref(false);
const { t } = useI18n();
const { canEditTaskNote, canViewTaskNote } = useGoalPermissions();

const component = computed(() => (fullscreen.value ? 'v-dialog' : 'div'));
const isReadonlyNote = computed(() => !canEditTaskNote.value);
const canWatchTaskNote = computed(() => canViewTaskNote.value);

const enableFullscreen = () => {
    if(!canViewTaskNote.value) return;
    fullscreen.value = !fullscreen.value;
};

const updateNote = debounce((note: string) => {
    tasksStorage.updateTaskNote({ id: props.taskId, note: note });
}, 1000);

watch(
    () => [editor.value],
    () => {
        if (!editor.value) return;
        editor.value.setEditable(!isReadonlyNote.value);
    },
    { immediate: true, deep: true }
);

const handleButtonClick = (button: ButtonItem) => {
    if (isReadonlyNote.value) return;
    button.action(...(button.args || []));
};

const buttons: Ref<ButtonItem[]> = computed(() => {
    const ed = editor.value;
    if (!ed) return [];

    return [
        {
            icon: mdiFormatHeader1,
            active: ed.isActive('heading', { level: 1 }),
            action: () => ed.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
            icon: mdiFormatHeader2,
            active: ed.isActive('heading', { level: 2 }),
            action: () => ed.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            icon: mdiFormatHeader3,
            active: ed.isActive('heading', { level: 3 }),
            action: () => ed.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        {
            icon: mdiFormatBold,
            active: ed.isActive('bold'),
            disabled: !ed.can().chain().focus().toggleBold().run(),
            action: () => ed.chain().focus().toggleBold().run(),
        },
        {
            icon: mdiFormatItalic,
            active: ed.isActive('italic'),
            disabled: !ed.can().chain().focus().toggleItalic().run(),
            action: () => ed.chain().focus().toggleItalic().run(),
        },
        {
            icon: mdiFormatStrikethroughVariant,
            active: ed.isActive('strike'),
            disabled: !ed.can().chain().focus().toggleStrike().run(),
            action: () => ed.chain().focus().toggleStrike().run(),
        },
        {
            icon: mdiCodeTags,
            active: ed.isActive('code'),
            disabled: !ed.can().chain().focus().toggleCode().run(),
            action: () => ed.chain().focus().toggleCode().run(),
        },
        {
            icon: mdiEraser,
            action: () => ed.chain().focus().unsetAllMarks().run(),
        },
        {
            icon: mdiFormatParagraph,
            active: ed.isActive('paragraph'),
            action: () => ed.chain().focus().setParagraph().run(),
        },

        {
            icon: mdiFormatListBulleted,
            active: ed.isActive('bulletList'),
            action: () => ed.chain().focus().toggleBulletList().run(),
        },
        {
            icon: mdiFormatListNumbered,
            active: ed.isActive('orderedList'),
            action: () => ed.chain().focus().toggleOrderedList().run(),
        },
        {
            icon: mdiCodeBraces,
            active: ed.isActive('codeBlock'),
            action: () => ed.chain().focus().toggleCodeBlock().run(),
        },
        {
            icon: mdiFormatQuoteClose,
            active: ed.isActive('blockquote'),
            action: () => ed.chain().focus().toggleBlockquote().run(),
        },
        {
            icon: mdiArrowULeftTop,
            disabled: !ed.can().chain().focus().undo().run(),
            action: () => ed.chain().focus().undo().run(),
        },
        {
            icon: mdiArrowURightTop,
            disabled: !ed.can().chain().focus().redo().run(),
            action: () => ed.chain().focus().redo().run(),
        },
        {
            icon: mdiFormatColorFill,
            active: ed.isActive('textStyle', { color: '#5b52ca' }),
            action: () => ed.chain().focus().setColor('#5b52ca').run(),
        },
    ];
});

onMounted(() => {
    let justMounted = true;

    setTimeout(() => {
        justMounted = false;
    }, 2000);
    editor.value = new Editor({
        injectCSS: false,
        extensions: [
            Color.configure({ types: [TextStyle.name, ListItem.name] }),
            // @ts-expect-error - TextStyle types configuration issue
            TextStyle.configure({ types: [ListItem.name, Link.name] }),
            StarterKit,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                defaultProtocol: 'https',
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
                },
            }),
            Placeholder.configure({
                placeholder: `${t('msg.note')} …`, //'Write something …',
            }),
        ],
        onUpdate({ editor }) {
            if(justMounted) {
                return;
            }
            const html = editor.getHTML();
           
            updateNote(html);
            console.log('Контент обновился:', html);
        },
        content: props.note,
    });
});

onBeforeUnmount(() => {
    if (!editor.value) return;
    editor.value.destroy();
});
</script>