<template>
    <model-editor-base
        :loading="loading"
        :dialog="dialog"
        @save="saveAll()"
        @delete="deleteObject"
        @close="emit('close'); editingObjChanged = false"
        :is-update="isUpdate()"
        :is-changed="editingObjChanged"
        :model-class="modelClass"
        :object-name="editingObjName()"
        :editing-object="editingObj">

        <v-card-text class="pa-0">
            <v-tabs v-model="tab" :disabled="loading" grow>
                <v-tab value="keyword">{{ $t('Keyword') }}</v-tab>
                <v-tab value="hierarchy">{{ $t('Hierarchy') }}</v-tab>
            </v-tabs>
        </v-card-text>


        <v-card-text>
            <v-tabs-window v-model="tab">
                <v-tabs-window-item value="keyword">
                    <v-form :disabled="loading">

                        <v-text-field :label="$t('Name')" v-model="editingObj.name"></v-text-field>
                        <v-text-field label="Add aliases (separate with commas)" v-model="newAliases" :hint="aliasHint" persistent-hint class="mb-2"></v-text-field>
                        <v-textarea :label="$t('Description')" v-model="editingObj.description"></v-textarea>

                    </v-form>
                </v-tabs-window-item>
                <v-tabs-window-item value="hierarchy">
                    <hierarchy-editor v-model="editingObj" :model="modelClass.model.name"></hierarchy-editor>
                </v-tabs-window-item>
            </v-tabs-window>
        </v-card-text>
    </model-editor-base>

</template>

<script setup lang="ts">

import {onMounted, PropType, ref, watch} from "vue";
import {Keyword} from "@/openapi";
import ModelEditorBase from "@/components/model_editors/ModelEditorBase.vue";
import {useModelEditorFunctions} from "@/composables/useModelEditorFunctions";
import HierarchyEditor from "@/components/inputs/HierarchyEditor.vue";
import {useAliases} from "@/composables/useAliases";

const props = defineProps({
    item: {type: {} as PropType<Keyword>, required: false, default: null},
    itemId: {type: [Number, String], required: false, default: undefined},
    itemDefaults: {type: {} as PropType<Keyword>, required: false, default: {} as Keyword},
    dialog: {type: Boolean, default: false}
})

const emit = defineEmits(['create', 'save', 'delete', 'close', 'changedState'])
const modelEditorFunctions = useModelEditorFunctions<Keyword>('Keyword', emit)
const {setupState, deleteObject, saveObject, isUpdate, editingObjName, loading, editingObj, editingObjChanged, modelClass} = modelEditorFunctions
const model = defineModel<typeof modelEditorFunctions>()
const {newAliases, aliasHint, saveAliases} = useAliases('KEYWORD_ALIAS', editingObj, editingObjChanged)

async function saveAll() {
    await saveAliases()
    saveObject()
}
model.value = {...modelEditorFunctions, saveObject: saveAll} as typeof modelEditorFunctions

const tab = ref("keyword")

/**
 * watch prop changes and re-initialize editor
 * required to embed editor directly into pages and be able to change item from the outside
 */
watch([() => props.item, () => props.itemId], () => {
    initializeEditor()
})

// object specific data (for selects/display)

onMounted(() => {
    initializeEditor()
})

/**
 * component specific state setup logic
 */
function initializeEditor() {
    setupState(props.item, props.itemId, {itemDefaults: props.itemDefaults})
}

</script>

<style scoped>

</style>