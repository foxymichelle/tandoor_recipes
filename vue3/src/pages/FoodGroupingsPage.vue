<template>
    <v-container>
        <v-row>
            <v-col>
                <v-card prepend-icon="fa-solid fa-layer-group" title="Food Groupings">
                    <template #subtitle>
                        <div class="text-wrap">
                            A grouping is a search word that points to a specific list of foods. If a food shortcut on My Home matches a grouping name,
                            only the foods listed here are searched. Words without a grouping search every food whose name contains the word.
                        </div>
                    </template>
                    <template #append>
                        <v-btn icon="$create" color="create" @click="openEditor(null)"></v-btn>
                    </template>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col>
                <v-card :loading="loading">
                    <v-list>
                        <v-list-item v-for="g in groupings" :key="g.id" @click="openEditor(g)">
                            <v-list-item-title>{{ g.name }}</v-list-item-title>
                            <v-list-item-subtitle class="text-wrap">{{ g.foodNames.join(', ') }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="!loading && groupings.length == 0">No food groupings yet</v-list-item>
                    </v-list>
                </v-card>
            </v-col>
        </v-row>

        <v-dialog v-model="dialog" max-width="600">
            <v-card :title="editing == null ? 'New Food Grouping' : 'Edit Food Grouping'" :loading="loading">
                <v-card-text>
                    <v-text-field label="Search word" v-model="editName" class="mb-2"
                                  :error-messages="nameTaken ? ['A grouping with this name already exists'] : []"></v-text-field>
                    <v-model-select model="Food" v-model="editFoodIds" label="Foods" multiple chips :return-object="false"></v-model-select>
                </v-card-text>
                <v-card-actions>
                    <v-btn color="delete" v-if="editing != null">
                        Delete
                        <delete-confirm-dialog :object-name="editing.name" model-name="Food Grouping" @delete="remove()"></delete-confirm-dialog>
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn @click="dialog = false">Cancel</v-btn>
                    <v-btn color="save" prepend-icon="$save" :disabled="!canSave" @click="save()">Save</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from "vue"
import {ApiApi, CustomFilter} from "@/openapi"
import {ErrorMessageType, PreparedMessage, useMessageStore} from "@/stores/MessageStore"
import VModelSelect from "@/components/inputs/VModelSelect.vue"
import DeleteConfirmDialog from "@/components/dialogs/DeleteConfirmDialog.vue"

type Grouping = { id: number, filter: CustomFilter, name: string, foodIds: number[], foodNames: string[] }

const groupings = ref<Grouping[]>([])
const loading = ref(false)
const dialog = ref(false)
const editing = ref<Grouping | null>(null)
const editName = ref('')
const editFoodIds = ref<number[]>([])

const nameTaken = computed(() => groupings.value.some(g => g.name.toLowerCase() == editName.value.trim().toLowerCase() && g.id != editing.value?.id))
const canSave = computed(() => editName.value.trim() != '' && editFoodIds.value.length > 0 && !nameTaken.value)

onMounted(() => {
    loadGroupings()
})

/**
 * groupings are saved filters whose search JSON is marked with food_grouping: true
 */
async function loadGroupings() {
    loading.value = true
    const api = new ApiApi()
    const result: Grouping[] = []
    try {
        let seen = 0
        for (let p = 1; p <= 20; p++) {
            const r = await api.apiCustomFilterList({page: p, pageSize: 100})
            r.results.forEach(cf => {
                try {
                    const s = JSON.parse(cf.search)
                    if (s.food_grouping === true && Array.isArray(s.foods)) {
                        result.push({id: cf.id!, filter: cf, name: cf.name, foodIds: s.foods, foodNames: s.food_names ?? []})
                    }
                } catch (e) {
                    // not a food grouping
                }
            })
            seen += r.results.length
            if (seen >= r.count || r.results.length == 0) break
        }
        result.sort((a, b) => a.name.localeCompare(b.name))
        groupings.value = result
    } catch (err) {
        useMessageStore().addError(ErrorMessageType.FETCH_ERROR, err)
    } finally {
        loading.value = false
    }
}

function openEditor(grouping: Grouping | null) {
    editing.value = grouping
    editName.value = grouping ? grouping.name : ''
    editFoodIds.value = grouping ? [...grouping.foodIds] : []
    dialog.value = true
}

async function save() {
    if (!canSave.value) return
    loading.value = true
    const api = new ApiApi()
    try {
        // names are stored along with the ids so the list can show them without extra requests
        const foods = await Promise.all(editFoodIds.value.map(id => api.apiFoodRetrieve({id: id})))
        const search = JSON.stringify({foods: editFoodIds.value, food_names: foods.map(f => f.name), food_grouping: true, version: '2'})
        if (editing.value == null) {
            await api.apiCustomFilterCreate({customFilter: {name: editName.value.trim(), search: search} as CustomFilter})
        } else {
            await api.apiCustomFilterUpdate({id: editing.value.id, customFilter: {...editing.value.filter, name: editName.value.trim(), search: search}})
        }
        dialog.value = false
        useMessageStore().addPreparedMessage(PreparedMessage.UPDATE_SUCCESS)
        await loadGroupings()
    } catch (err) {
        useMessageStore().addError(ErrorMessageType.UPDATE_ERROR, err)
    } finally {
        loading.value = false
    }
}

async function remove() {
    if (editing.value == null) return
    loading.value = true
    try {
        await new ApiApi().apiCustomFilterDestroy({id: editing.value.id})
        dialog.value = false
        useMessageStore().addPreparedMessage(PreparedMessage.DELETE_SUCCESS)
        await loadGroupings()
    } catch (err) {
        useMessageStore().addError(ErrorMessageType.DELETE_ERROR, err)
    } finally {
        loading.value = false
    }
}
</script>