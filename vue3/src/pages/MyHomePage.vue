<template>
    <v-container>
        <v-row>
            <v-col cols="12" md="7" offset-md="1">
                <v-text-field :label="$t('Search')"
                              v-model="query"
                              :loading="loading"
                              @keydown.enter="flushQuery()"
                              @click:clear="resetQuery()"
                              clearable hide-details>
                    <template v-slot:append>
                        <v-badge bordered :offset-x="5" :offset-y="5" color="secondary" v-model="hasFiltersApplied">
                            <v-btn @click="panel ='search' " v-if="panel == ''" color="primary" icon>
                                <i class="fa-solid fa-caret-down"></i></v-btn>
                            <v-btn @click="panel ='' " v-if="panel == 'search'" color="primary" icon><i class="fa-solid fa-caret-up"></i></v-btn>
                        </v-badge>
                    </template>
                </v-text-field>
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center flex-wrap">
                <v-btn class="me-2 mb-1 mt-1" rounded="xl" color="primary" prepend-icon="fa-solid fa-eye"
                       :variant="useUserPreferenceStore().deviceSettings.myhome_activeQuick == 'recent' ? 'flat' : 'outlined'"
                       @click="toggleQuick('recent')">{{ $t('Recently_Viewed') }}
                </v-btn>
                <v-btn class="mb-1 mt-1" rounded="xl" color="primary" prepend-icon="fa-solid fa-calendar-alt"
                       :variant="useUserPreferenceStore().deviceSettings.myhome_activeQuick == 'new' ? 'flat' : 'outlined'"
                       @click="toggleQuick('new')">{{ $t('New') }}
                </v-btn>
            </v-col>
        </v-row>
       
        <v-row dense>
            <v-col>
                <v-expansion-panels v-model="panel">
                    <v-expansion-panel value="search">
                        <v-expansion-panel-text>
                            <v-form :disabled="loading" class="mt-4">

                                <div v-for="filter in Object.values(filters)" :key="filter.id">
                                    <template v-if="filter.enabled">
                                        <component :="getPropsFromFilter(filter)" :is="filter.is" density="compact" v-model:modelValue="filter.modelValue">
                                            <template #append>
                                                <v-btn icon="fa-solid fa-times" size="small" variant="plain"
                                                       @click="filter.enabled = false; filter.modelValue = filter.default"></v-btn>
                                            </template>
                                        </component>
                                    </template>
                                </div>

                                <v-divider class="mt-2 mb-2"></v-divider>

                                <v-autocomplete :items="availableFilters"
                                                @update:model-value="(item:string) =>{ filters[item].enabled = true; nextTick(() => {addFilterSelect = null})}" density="compact"
                                                :label="$t('AddFilter')" v-model="addFilterSelect"></v-autocomplete>

                                <div class="text-caption mb-1">Keyword shortcuts: buttons in a row mean "any of", rows combine with "and".</div>
                                <v-model-select v-for="(row, i) in draftKeywordRows" :key="'dkw_' + i" model="Keyword" v-model="draftKeywordRows[i]"
                                                :label="'Keyword row ' + (i + 1)" multiple chips :return-object="false" density="compact" class="mb-2"></v-model-select>

                                <div class="text-caption mt-3 mb-1">Food shortcuts: type words separated by commas, or pick a food to add its name. A word matches a Food Grouping name first, otherwise every food containing the word.</div>
                                <div v-for="(row, i) in draftFoodRows" :key="'dfd_' + i" class="mb-2">
                                    <v-text-field v-model="draftFoodRows[i]" :label="'Food row ' + (i + 1)" density="compact" hide-details class="mb-1"
                                                @keydown.enter.prevent="saveShortcuts()"></v-text-field>
                                    <v-model-select :key="'fpick_' + i + '_' + foodPickCounter" model="Food" density="compact" hide-details clearable
                                                    label="Pick a food to add its name" @update:model-value="(food: any) => addFoodName(i, food)"></v-model-select>
                                </div>
                                <v-btn color="save" prepend-icon="$save" class="mt-3" @click="saveShortcuts()">Save Shortcuts</v-btn>
                            </v-form>
                            <v-row>
                                <v-col cols="6">
                                    <v-select :label="$t('View')" v-model="useUserPreferenceStore().deviceSettings.search_viewMode"
                                              :items="[{title: $t('Table'), value: 'table'}, {title: $t('Cards'), value: 'grid'},]" density="compact"></v-select>
                                </v-col>
                                <v-col cols="6">
                                    <v-select class="float-right" :label="$t('PerPage')" v-model="pageSize" :items="[10,25,50,100]" density="compact"
                                              width="100%"></v-select>
                                </v-col>
                            </v-row>

                        </v-expansion-panel-text>

                        <v-card-actions v-if="panel == 'search'">
                            <v-btn @click="reset()" prepend-icon="$reset">{{ $t('Reset') }}</v-btn>
                            <v-btn @click="searchRecipes({page: 1})" prepend-icon="$search">{{ $t('Search') }}</v-btn>
                        </v-card-actions>
                    </v-expansion-panel>
                </v-expansion-panels>

            </v-col>
        </v-row>

        <v-row dense justify="center" class="mt-0" v-if="ds().myhome_keywordButtons.some(r => r.length > 0) || ds().myhome_foodRows.some(r => r.length > 0)">
            <v-col cols="12" md="10" class="text-center">
                <template v-for="(row, r) in ds().myhome_keywordButtons" :key="'kwrow_' + r">
                    <div v-if="row.length > 0" class="mb-1">
                        <v-btn v-for="k in row" :key="'kw_' + r + '_' + k.id" class="me-2 mb-2" size="small" rounded="xl" color="primary"
                               :variant="isKeywordActive(r, k.id) ? 'flat' : 'outlined'"
                               @click="toggleKeyword(r, k.id)">{{ k.name }}
                        </v-btn>
                    </div>
                </template>
                <template v-for="(terms, r) in ds().myhome_foodRows" :key="'fdrow_' + r">
                    <div v-if="terms.length > 0" class="mb-1">
                        <v-btn v-for="term in terms" :key="'fd_' + r + '_' + term" class="me-2 mb-2" size="small" rounded="xl" color="secondary"
                               :variant="isFoodActive(r, term) ? 'flat' : 'outlined'"
                               @click="toggleFood(r, term)">{{ term }}
                        </v-btn>
                    </div>
                </template>
            </v-col>
        </v-row>

        <v-row v-if="recipes.length > 0 && useUserPreferenceStore().deviceSettings.search_viewMode == 'table'">
            <v-col>
                <v-card>
                    <v-data-table-server
                        v-model="selectedItems"
                        return-object
                        @update:options="searchRecipes"
                        :loading="loading"
                        :items="recipes"
                        :headers="tableHeaders"
                        :page="page"
                        :items-per-page="pageSize"
                        :items-length="tableItemCount"
                        @click:row="handleRowClick"
                        disable-sort
                        show-select
                        hide-default-footer
                    >
                        <template v-slot:header.action v-if="selectedItems.length > 0">
                            <v-btn icon="fa-solid fa-ellipsis-v" variant="plain" color="info">
                                <v-icon icon="fa-solid fa-ellipsis-v"></v-icon>
                                <v-menu activator="parent" close-on-content-click>
                                    <v-list density="compact" class="pt-1 pb-1" activatable>
                                        <v-list-item prepend-icon="$edit" @click="batchEditDialog = true">
                                            {{ $t('BatchEdit') }}
                                        </v-list-item>
                                        <v-list-item prepend-icon="$delete" @click="batchDeleteDialog = true">
                                            {{ $t('Delete_All') }}
                                        </v-list-item>
                                    </v-list>
                                </v-menu>
                            </v-btn>
                        </template>

                        <template #item.image="{item}">
                            <v-avatar :image="item.image" size="x-large" class="mt-1 mb-1" v-if="item.image"></v-avatar>
                            <v-avatar color="primary" variant="tonal" size="x-large" class="mt-1 mb-1" v-else>
                                <random-icon></random-icon>
                            </v-avatar>
                        </template>

                        <template #item.keywords="{item}">
                            <keywords-bar :keywords="item.keywords"></keywords-bar>
                        </template>

                        <template #item.action="{item}">
                            <recipe-context-menu :recipe="item"></recipe-context-menu>
                        </template>
                    </v-data-table-server>
                </v-card>
            </v-col>
        </v-row>

        <template v-if="recipes.length > 0 && useUserPreferenceStore().deviceSettings.search_viewMode == 'grid'">
            <v-row>
                <v-col cols="6" md="3" v-for="r in recipes" :key="r.id" class="pa-0">
                    <recipe-card :recipe="r"></recipe-card>
                </v-col>

            </v-row>

        </template>
        <v-row>
            <v-col cols="12" md="6" offset-md="3" class="text-center">
                <v-pagination v-model="page" :length="Math.ceil(tableItemCount/pageSize)"
                              @update:modelValue="searchRecipes({page: page})" class="ms-2 me-2" size="small"
                              v-if="filters['sortOrder'].modelValue != 'random'"
                ></v-pagination>
                <v-btn size="x-large" rounded="xl" prepend-icon="fa-solid fa-dice" variant="tonal" v-if="filters['sortOrder'].modelValue == 'random'"
                       @click="searchRecipes({page: 1})">
                    {{ $t('Random Recipes') }}
                </v-btn>
            </v-col>
        </v-row>


        <v-dialog v-model="dialog">
            <v-card>
                <v-closable-card-title :title="$t('SavedSearch')" v-model="dialog"></v-closable-card-title>
                <v-card-text>
                    <v-text-field :label="$t('Name')" v-model="newFilterName"></v-text-field>
                </v-card-text>
                <v-card-actions>
                    <v-btn prepend-icon="$create" color="create" @click="createCustomFilter()">{{ $t('Create') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <batch-delete-dialog :items="selectedItems" model="Recipe" v-model="batchDeleteDialog" activator="model" @change="searchRecipes({page: 1})"></batch-delete-dialog>
        <batch-edit-recipe-dialog :items="selectedItems" v-model="batchEditDialog" activator="model" @change="searchRecipes({page: page})"></batch-edit-recipe-dialog>

    </v-container>
</template>

<script setup lang="ts">

import {computed, markRaw, nextTick, onMounted, ref, toRaw, watch} from "vue";
import {ApiApi, ApiRecipeListRequest, CustomFilter, RecipeOverview} from "@/openapi";
import {useI18n} from "vue-i18n";
import {ErrorMessageType, MessageType, useMessageStore} from "@/stores/MessageStore";
import ModelSelect from "@/components/inputs/ModelSelect.vue";
import {VDateInput} from 'vuetify/labs/VDateInput'
import RecipeContextMenu from "@/components/inputs/RecipeContextMenu.vue";
import {useRouter} from "vue-router";
import KeywordsBar from "@/components/display/KeywordsBar.vue";
import {VDataTableUpdateOptions} from "@/vuetify";
import VClosableCardTitle from "@/components/dialogs/VClosableCardTitle.vue";
import RecipeCard from "@/components/display/RecipeCard.vue";
import {useDisplay} from "vuetify";
import {useUserPreferenceStore} from "@/stores/UserPreferenceStore";
import {useRouteQuery} from "@vueuse/router";
import {boolOrUndefinedTransformer, numberOrUndefinedTransformer, routeQueryDateTransformer, stringToBool, toNumberArray} from "@/utils/utils";
import {useDebouncedSearch} from "@/composables/useDebouncedSearch";
import RandomIcon from "@/components/display/RandomIcon.vue";
import {VSelect, VTextField, VNumberInput} from "vuetify/components";
import RatingField from "@/components/inputs/RatingField.vue";
import BatchDeleteDialog from "@/components/dialogs/BatchDeleteDialog.vue";
import {EditorSupportedTypes} from "@/types/Models.ts";
import BatchEditRecipeDialog from "@/components/dialogs/BatchEditRecipeDialog.vue";
import VModelSelect from "@/components/inputs/VModelSelect.vue";
import {DateTime} from "luxon";

const {t} = useI18n()
const router = useRouter()
const {mdAndUp} = useDisplay()

const {inputValue: query, debouncedValue: debouncedQuery, signal, flush: flushQuery, reset: resetQuery} = useDebouncedSearch({routeQueryKey: 'query'})
const page = useRouteQuery('page', 1, {transform: Number})
const pageSize = useRouteQuery('pageSize', useUserPreferenceStore().deviceSettings.search_itemsPerPage, {transform: Number})

/**
 * filters that are not yet enabled
 */
const availableFilters = computed(() => {
    let f: Array<{ value: string, title: string }> = []
    useUserPreferenceStore().deviceSettings.search_visibleFilters = []
    Object.entries(filters.value).forEach((entry) => {
        let [key, filter] = entry
        if (!filter.enabled) {
            f.push({value: filter.id, title: filter.label})
        } else {
            useUserPreferenceStore().deviceSettings.search_visibleFilters.push(filter.id)
        }
    })
    return f
})

const loading = ref(false)
const dialog = ref(false)
const panel = ref('')
const addFilterSelect = ref<string | null>(null)
const hasFiltersApplied = ref(false)

const tableHeaders = computed(() => {
    let headers = [
        {title: t('Image'), width: '1%', noBreak: true, key: 'image',},
        {title: t('Name'), key: 'name',},
    ]
    if (mdAndUp.value) {
        headers.push({title: t('Keywords'), key: 'keywords',},)
    }
    headers.push({title: t('Actions'), key: 'action', width: '1%', noBreak: true, align: 'end'},)

    return headers
})

const tableItemCount = ref(0)

const recipes = ref([] as RecipeOverview[])
const selectedCustomFilter = ref<null | CustomFilter>(null)
const newFilterName = ref('')

const selectedItems = ref([] as EditorSupportedTypes[])
const batchDeleteDialog = ref(false)
const batchEditDialog = ref(false)


// ---------- My Home: quick buttons and shortcut rows ----------
const ds = () => useUserPreferenceStore().deviceSettings
let lastRequestId = 0
let multiCache: { key: string, items: RecipeOverview[] } | null = null
const foodIdCache = new Map<string, number[]>()
const keywordNameCache = new Map<number, string>()
let foodGroupingCache: { name: string, foodIds: number[] }[] | null = null
const MAX_FOOD_IDS = 200

class ShortcutError extends Error {
}

// what is typed/picked in the dropdown, only applied when "Save Shortcuts" is clicked
const draftKeywordRows = ref<number[][]>([[], [], []])
const draftFoodRows = ref<string[]>(['', ''])
const foodPickCounter = ref(0)

function parseTerms(text: string): string[] {
    return Array.from(new Set(text.split(',').map(t => t.trim()).filter(t => t.length > 0)))
}

function loadDrafts() {
    draftKeywordRows.value = Array.from({length: 3}, (_, i) => (ds().myhome_keywordButtons[i] ?? []).map(k => k.id))
    draftFoodRows.value = Array.from({length: 2}, (_, i) => (ds().myhome_foodRows[i] ?? []).join(', '))
}

/**
 * add the name of a food picked in the dropdown to the comma list of a food row
 */
function addFoodName(row: number, food: any) {
    if (!food || !food.name) return
    const name = String(food.name).split(',')[0].trim()
    const terms = parseTerms(draftFoodRows.value[row] ?? '')
    if (name != '' && !terms.some(t => t.toLowerCase() == name.toLowerCase())) {
        terms.push(name)
    }
    draftFoodRows.value[row] = terms.join(', ')
    foodPickCounter.value++ // resets the pick dropdowns
}

/**
 * apply the drafts to the buttons, drop active buttons that no longer exist
 */
async function saveShortcuts() {
    const api = new ApiApi()
    ds().myhome_keywordButtons.forEach(row => row.forEach(k => keywordNameCache.set(k.id, k.name)))

    const keywordRows: { id: number, name: string }[][] = []
    try {
        for (const ids of draftKeywordRows.value) {
            const row: { id: number, name: string }[] = []
            for (const id of ids) {
                if (!keywordNameCache.has(id)) {
                    const keyword = await api.apiKeywordRetrieve({id: id})
                    keywordNameCache.set(id, keyword.name)
                }
                row.push({id: id, name: keywordNameCache.get(id)!})
            }
            keywordRows.push(row)
        }
    } catch (err) {
        useMessageStore().addError(ErrorMessageType.FETCH_ERROR, err)
        return
    }

    ds().myhome_keywordButtons = keywordRows
    ds().myhome_foodRows = draftFoodRows.value.map(parseTerms)
    ds().myhome_activeKeywordIds = ds().myhome_keywordButtons.map((row, i) => (ds().myhome_activeKeywordIds[i] ?? []).filter(id => row.some(k => k.id == id)))
    ds().myhome_activeFoodRows = ds().myhome_foodRows.map((terms, i) => (ds().myhome_activeFoodRows[i] ?? []).filter(t => terms.includes(t)))
    loadDrafts()
}

function toggleInRows<T>(rows: T[][], row: number, value: T): T[][] {
    const copy = rows.map(r => [...r])
    while (copy.length <= row) copy.push([])
    copy[row] = copy[row].includes(value) ? copy[row].filter(v => v !== value) : [...copy[row], value]
    return copy
}

function isKeywordActive(row: number, id: number): boolean {
    return (ds().myhome_activeKeywordIds[row] ?? []).includes(id)
}

function toggleKeyword(row: number, id: number) {
    ds().myhome_activeKeywordIds = toggleInRows(ds().myhome_activeKeywordIds, row, id)
}

function isFoodActive(row: number, term: string): boolean {
    return (ds().myhome_activeFoodRows[row] ?? []).includes(term)
}

function toggleFood(row: number, term: string) {
    ds().myhome_activeFoodRows = toggleInRows(ds().myhome_activeFoodRows, row, term)
}

function toggleQuick(mode: 'recent' | 'new') {
    ds().myhome_activeQuick = ds().myhome_activeQuick == mode ? 'none' : mode
}

/**
 * load Food Groupings (saved filters marked as food groupings)
 */
async function loadFoodGroupings() {
    if (foodGroupingCache != null) return foodGroupingCache
    const api = new ApiApi()
    const groupings: { name: string, foodIds: number[] }[] = []
    let seen = 0
    for (let p = 1; p <= 20; p++) {
        const r = await api.apiCustomFilterList({page: p, pageSize: 100})
        r.results.forEach(cf => {
            try {
                const s = JSON.parse(cf.search)
                if (s.food_grouping === true && Array.isArray(s.foods)) {
                    groupings.push({name: cf.name.toLowerCase(), foodIds: s.foods})
                }
            } catch (e) {
                // not a food grouping
            }
        })
        seen += r.results.length
        if (seen >= r.count || r.results.length == 0) break
    }
    foodGroupingCache = groupings
    return groupings
}

/**
 * ids of all foods for a row: a Food Grouping with that name if one exists,
 * otherwise every food whose name contains the word (case-insensitive)
 */
async function resolveFoodIds(terms: string[]): Promise<number[]> {
    const api = new ApiApi()
    const groupings = await loadFoodGroupings()
    const ids = new Set<number>()
    for (const term of terms) {
        const key = term.toLowerCase()
        const grouping = groupings.find(g => g.name == key)
        if (grouping) {
            grouping.foodIds.forEach(id => ids.add(id))
            continue
        }
        if (!foodIdCache.has(key)) {
            const found: number[] = []
            for (let p = 1; p <= 5; p++) {
                const r = await api.apiFoodList({query: term, page: p, pageSize: 100})
                // the server may rank instead of filter (fuzzy search), so the name is checked here
                const matches = r.results.filter(f => f.name.toLowerCase().includes(key))
                matches.forEach(f => found.push(f.id!))
                if (matches.length == 0 || found.length >= r.count || r.results.length == 0) break
            }
            foodIdCache.set(key, found)
        }
        foodIdCache.get(key)!.forEach(id => ids.add(id))
    }
    if (ids.size > MAX_FOOD_IDS) {
        throw new ShortcutError(`The food words in one row match ${ids.size} foods, which is too many to search at once. Use a longer word or create a Food Grouping.`)
    }
    return Array.from(ids)
}

/**
 * load every page of a recipe search (used when several "any of" groups have to be combined)
 */
async function fetchAllRecipes(params: ApiRecipeListRequest): Promise<RecipeOverview[]> {
    const api = new ApiApi()
    const all: RecipeOverview[] = []
    for (let p = 1; p <= 50; p++) {
        const r = await api.apiRecipeList({...params, page: p, pageSize: 100}, {signal: signal.value})
        all.push(...r.results)
        if (all.length >= r.count || r.results.length == 0) break
    }
    return all
}

// any button change triggers a search automatically
watch(() => JSON.stringify([ds().myhome_activeKeywordIds, ds().myhome_activeFoodRows, ds().myhome_activeQuick]), () => {
    searchRecipes({page: 1})
})

loadDrafts()

/**
 * handle query updates when using the GlobalSearchDialog on the search page directly
 */
watch(debouncedQuery, () => {
    searchRecipes({page: 1})
})

/**
 * perform initial search on mounted
 */
onMounted(() => {
    // load filters that were previously enabled
    useUserPreferenceStore().deviceSettings.search_visibleFilters.forEach(f => {
        if (f in filters.value) {
            filters.value[f].enabled = true
        } else {
            useUserPreferenceStore().deviceSettings.search_visibleFilters.splice(useUserPreferenceStore().deviceSettings.search_visibleFilters.indexOf(f), 1)
        }
    })

    enableFiltersWithValues()
    searchRecipes({page: page.value})
})

/**
 * perform the recipe search with the given options
 * @param options
 */
function searchRecipes(options: VDataTableUpdateOptions) {
    let api = new ApiApi()
    loading.value = true
    hasFiltersApplied.value = false
    selectedItems.value = []

    page.value = options.page
    let searchParameters = {
        query: debouncedQuery.value,
    } as ApiRecipeListRequest

    useUserPreferenceStore().deviceSettings.search_itemsPerPage = pageSize.value

    Object.values(filters.value).forEach((filter) => {
        if (!isFilterDefaultValue(filter)) {
            searchParameters[filter.id] = filter.modelValue
            hasFiltersApplied.value = true
        }
    })

    // quick buttons: last 7 days, newest first
    if (ds().myhome_activeQuick == 'recent') {
        searchParameters.viewedonGte = DateTime.now().minus({days: 7}).toJSDate()
        searchParameters.sortOrder = '-lastviewed'
    } else if (ds().myhome_activeQuick == 'new') {
        searchParameters.createdonGte = DateTime.now().minus({days: 7}).toJSDate()
        searchParameters.sortOrder = '-created_at'
    }

    // every active row is an "any of" group, all groups have to match
    // the dropdown keyword/food "any" filters count as one more group each
    const keywordGroups: Promise<number[]>[] = []
    const foodGroups: Promise<number[]>[] = []
    ds().myhome_activeKeywordIds.forEach(ids => {
        if (ids.length > 0) keywordGroups.push(Promise.resolve([...ids]))
    })
    ds().myhome_activeFoodRows.forEach(terms => {
        if (terms.length > 0) foodGroups.push(resolveFoodIds(terms))
    })
    if (searchParameters.keywords && searchParameters.keywords.length > 0) keywordGroups.push(Promise.resolve([...searchParameters.keywords]))
    if (searchParameters.foods && searchParameters.foods.length > 0) foodGroups.push(Promise.resolve([...searchParameters.foods]))
    delete searchParameters.keywords
    delete searchParameters.foods

    const requestId = ++lastRequestId

    Promise.all([Promise.all(keywordGroups), Promise.all(foodGroups)]).then(async ([kwGroups, fdGroups]) => {
        if (requestId != lastRequestId) return

        // an active row that matched nothing means nothing can match
        if ([...kwGroups, ...fdGroups].some(g => g.length == 0)) {
            recipes.value = []
            tableItemCount.value = 0
            return
        }

        // the server can combine one keyword group and one food group per request
        const bundles = Math.max(kwGroups.length, fdGroups.length, 1)
        const makeParams = (i: number) => {
            const p = {...searchParameters} as ApiRecipeListRequest
            if (kwGroups[i]) p.keywords = kwGroups[i]
            if (fdGroups[i]) p.foods = fdGroups[i]
            return p
        }

        if (bundles == 1) {
            const r = await api.apiRecipeList({...makeParams(0), page: options.page, pageSize: pageSize.value}, {signal: signal.value})
            if (requestId != lastRequestId) return
            recipes.value = r.results
            tableItemCount.value = r.count
            return
        }

        // more groups: one request per pair, keep the recipes found by all of them, page client side
        const key = JSON.stringify([searchParameters, kwGroups, fdGroups])
        if (options.page == 1 || multiCache == null || multiCache.key != key) {
            const lists = await Promise.all(Array.from({length: bundles}, (_, i) => fetchAllRecipes(makeParams(i))))
            let common = lists[0]
            for (const l of lists.slice(1)) {
                const ids = new Set(l.map(x => x.id))
                common = common.filter(x => ids.has(x.id))
            }
            multiCache = {key: key, items: common}
        }
        if (requestId != lastRequestId) return
        const start = (options.page - 1) * pageSize.value
        recipes.value = multiCache.items.slice(start, start + pageSize.value)
        tableItemCount.value = multiCache.items.length
    }).catch(err => {
        if (err instanceof ShortcutError) {
            useMessageStore().addMessage(MessageType.WARNING, err.message)
        } else if (err?.name !== 'AbortError' && err?.cause?.name !== 'AbortError') {
    }).finally(() => {
        if (requestId == lastRequestId) {
            loading.value = false
            window.scrollTo({top: 0, behavior: 'smooth'})
        }
    })
}

/**
 * reset all search parameters and perform emtpy search
 */
function reset() {
    page.value = 1
    resetQuery()
    Object.values(filters.value).forEach((filter) => {
        //filter.enabled = false
        filter.modelValue = filter.default
    })
    selectedCustomFilter.value = null
    recipes.value = []
    searchRecipes({page: 1})
}

/**
 * handle clicking a table row by opening the selected recipe
 * @param event
 * @param data
 */
function handleRowClick(event: PointerEvent, data: any) {
    router.push({name: 'RecipeViewPage', params: {id: recipes.value[data.index].id}})
}

/**
 * enable UI of filters that have a value that is not the default for the given filter
 */
function enableFiltersWithValues() {
    Object.values(filters.value).forEach((filter) => {
        if (!isFilterDefaultValue(filter)) {
            filter.enabled = true
        }
    })
}

/**
 * determines if the current value of a filter is its default value
 * @param filter
 */
function isFilterDefaultValue(filter: any) {
    if (Array.isArray(filter.default) && Array.isArray(filter.modelValue)) {
        return filter.default.length == filter.modelValue.length
    } else if (Number.isNaN(filter.default) && Number.isNaN(filter.modelValue)) {
        return true
    } else {
        return toRaw(filter.default) === filter.modelValue
    }
}

/**
 * to prevent browser warnings from unused/wrong props on the target component
 * @param filter
 */
function getPropsFromFilter(filter: any){
    const {
        id,
        enabled,
        is,
        default: defaultValue,
        ...props
    } = filter

    return props
}

// -------------------------------------------
// --------- Logic for saved filters ---------
// -------------------------------------------

/**
 * triggered by save button, if filter exists update it, if not open dialog to create a new filter
 */
function saveCustomFilter() {
    let api = new ApiApi()

    if (selectedCustomFilter.value != null) {
        loading.value = true
        selectedCustomFilter.value.search = JSON.stringify(filtersToCustomFilterFormat())
        api.apiCustomFilterUpdate({id: selectedCustomFilter.value.id!, customFilter: selectedCustomFilter.value}).then((r) => {
            selectedCustomFilter.value = r
        }).catch(err => {
            useMessageStore().addError(ErrorMessageType.UPDATE_ERROR, err)
        }).finally(() => {
            loading.value = false
        })
    } else {
        newFilterName.value = ''
        dialog.value = true
    }
}

/**
 * create a new saved search filter in the database via api
 */
function createCustomFilter() {
    let api = new ApiApi()

    dialog.value = false
    loading.value = true
    api.apiCustomFilterCreate({customFilter: {name: newFilterName.value, search: JSON.stringify(filtersToCustomFilterFormat())} as CustomFilter}).then((r) => {
        selectedCustomFilter.value = r
    }).catch(err => {
        useMessageStore().addError(ErrorMessageType.UPDATE_ERROR, err)
    }).finally(() => {
        loading.value = false
    })
}

/**
 * load selected custom filter into the filters system
 */
function loadSelectedCustomFilter() {
    let customFilterParams = JSON.parse(selectedCustomFilter.value.search)
    if (customFilterParams['version'] == null) {
        customFilterParams = transformTandoor1Filter(customFilterParams)
    }

    if (customFilterParams['query'] != null) {
        query.value = customFilterParams['query']
    }

    Object.values(filters.value).forEach((filter) => {
        let filterName = filter.id.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
        if (customFilterParams[filterName] != null) {
            filter.modelValue = customFilterParams[filterName]
            filter.enabled = true
        }
    })

}

/**
 * convert filters to custom filter format
 */
function filtersToCustomFilterFormat() {
    let customFilterParams: any = {};

    if (query.value != '') {
        customFilterParams['query'] = query.value;
    }

    Object.values(filters.value).forEach((filter) => {
        if (!isFilterDefaultValue(filter)) {
            let filterName = filter.id.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
            customFilterParams[filterName] = filter.modelValue
        }
    })

    customFilterParams['version'] = '2'

    return customFilterParams
}

/**
 * transform a filter that is in the tandoor 1 format into the tandoor 2 format
 * @param customFilterParams
 */
function transformTandoor1Filter(customFilterParams: any) {

    // _or was basically an alias to the standard filter which behaves like an or filter
    [['books_or', 'books'], ['foods_or', 'foods'], ['keywords_or', 'keywords'],].forEach(pair => {
        if (customFilterParams[pair[1]] != null) {
            if (customFilterParams[pair[2]] != null) {
                customFilterParams[pair[2]].concat(customFilterParams[pair[1]])
            } else {
                customFilterParams[pair[2]] = customFilterParams[pair[1]]
            }
        }
    })

    if (customFilterParams['cookedon'] != null) {
        if (customFilterParams['cookedon'].startsWith('-')) {
            customFilterParams['cookedon_lte'] = customFilterParams['cookedon'].substring(1)
        } else {
            customFilterParams['cookedon_gte'] = customFilterParams['cookedon']
        }
    }

    if (customFilterParams['viewedon'] != null) {
        if (customFilterParams['viewedon'].startsWith('-')) {
            customFilterParams['viewedon_lte'] = customFilterParams['viewedon'].substring(1)
        } else {
            customFilterParams['viewedon_gte'] = customFilterParams['viewedon']
        }
    }

    if (customFilterParams['updatedon'] != null) {
        if (customFilterParams['updatedon'].startsWith('-')) {
            customFilterParams['updatedon_lte'] = customFilterParams['updatedon'].substring(1)
        } else {
            customFilterParams['updatedon_gte'] = customFilterParams['updatedon']
        }
    }

    if (customFilterParams['createdon'] != null) {
        if (customFilterParams['createdon'].startsWith('-')) {
            customFilterParams['createdon_lte'] = customFilterParams['createdon'].substring(1)
        } else {
            customFilterParams['createdon_gte'] = customFilterParams['createdon']
        }
    }

    if (customFilterParams['rating'] != null) {
        if (customFilterParams['rating'].startsWith('-')) {
            customFilterParams['rating_lte'] = customFilterParams['rating'].substring(1)
        } else {
            customFilterParams['rating_gte'] = customFilterParams['rating']
        }
    }

    if (customFilterParams['timescooked'] != null) {
        if (customFilterParams['timescooked'].startsWith('-')) {
            customFilterParams['timescooked_lte'] = customFilterParams['timescooked'].substring(1)
        } else {
            customFilterParams['timescooked_gte'] = customFilterParams['timescooked']
        }
    }

    customFilterParams['version'] = '2'

    return customFilterParams
}

/*
[this.$t("search_rank"), "score", "1-9", "9-1"],
[this.$t("Name"), "name", "A-z", "Z-a"],
[this.$t("last_cooked"), "lastcooked", "↑", "↓"],
[this.$t("Rating"), "rating", "1-5", "5-1"],
[this.$t("times_cooked"), "favorite", "x-X", "X-x"],
[this.$t("date_created"), "created_at", "↑", "↓"],
[this.$t("date_viewed"), "lastviewed", "↑", "↓"],
*/
/**
 * all filters available to enable
 */
const filters = ref({
    sortOrder: {
        id: 'sortOrder',
        label: `${t('sort_by')}`,
        hint: '',
        enabled: false,
        default: "",
        is: VSelect,
        items: [
            {value: "random", title: `${t('RandomOrder')}`},
            {value: "score", title: `${t('search_rank')} (1-9)`},
            {value: "-score", title: `${t('search_rank')} (9-1)`},
            {value: "name", title: `${t('Name')} (A-z)`},
            {value: "-name", title: `${t('Name')} (Z-a)`},
            {value: "lastcooked", title: `${t('last_cooked')} (↑)`},
            {value: "-lastcooked", title: `${t('last_cooked')} (↓)`},
            {value: "rating", title: `${t('Rating')} (1-5)`},
            {value: "-rating", title: `${t('Rating')} (5-1)`},
            {value: "times_cooked", title: `${t('favorite')} (↑)`},
            {value: "-times_cooked", title: `${t('favorite')} (↓)`},
            {value: "created_at", title: `${t('date_created')} (↑)`},
            {value: "-created_at", title: `${t('date_created')} (↓)`},
            {value: "lastviewed", title: `${t('date_viewed')} (↑)`},
            {value: "-lastviewed", title: `${t('date_viewed')} (↓)`},
        ],
        modelValue: useRouteQuery('sortOrder', "")
    },
    keywords: {
        id: 'keywords',
        label: `${t('Keywords')} (${t('any')})`,
        hint: t('searchFilterObjectsHelp', {type: t('Keywords')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Keyword',
        modelValue: useRouteQuery('keywords', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    keywordsAnd: {
        id: 'keywordsAnd',
        label: `${t('Keywords')} (${t('all')})`,
        hint: t('searchFilterObjectsAndHelp', {type: t('Keywords')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Keyword',
        modelValue: useRouteQuery('keywordsAnd', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    keywordsOrNot: {
        id: 'keywordsOrNot',
        label: `${t('Keywords')} ${'exclude'} (${t('any')})`,
        hint: t('searchFilterObjectsOrNotHelp', {type: t('Keywords')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Keyword',
        modelValue: useRouteQuery('keywordsOrNot', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    keywordsAndNot: {
        id: 'keywordsAndNot',
        label: `${t('Keywords')} ${'exclude'} (${t('all')})`,
        hint: t('searchFilterObjectsAndNotHelp', {type: t('Keywords')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Keyword',
        modelValue: useRouteQuery('keywordsAndNot', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    foods: {
        id: 'foods',
        label: `${t('Foods')} (${t('any')})`,
        hint: t('searchFilterObjectsHelp', {type: t('Foods')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Food',
        modelValue: useRouteQuery('foods', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    foodsAnd: {
        id: 'foodsAnd',
        label: `${t('Foods')} (${t('all')})`,
        hint: t('searchFilterObjectsAndHelp', {type: t('Foods')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Food',
        modelValue: useRouteQuery('foodsAnd', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    foodsOrNot: {
        id: 'foodsOrNot',
        label: `${t('Foods')} ${'exclude'} (${t('any')})`,
        hint: t('searchFilterObjectsOrNotHelp', {type: t('Foods')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Food',
        modelValue:  useRouteQuery('foodsOrNot', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    foodsAndNot: {
        id: 'foodsAndNot',
        label: `${t('Foods')} ${'exclude'} (${t('all')})`,
        hint: t('searchFilterObjectsAndNotHelp', {type: t('Foods')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Food',
        modelValue: useRouteQuery('foodsAndNot', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    books: {
        id: 'books',
        label: `${t('Books')} (${t('any')})`,
        hint: t('searchFilterObjectsHelp', {type: t('Books')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'RecipeBook',
        modelValue: useRouteQuery('books', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    booksAnd: {
        id: 'booksAnd',
        label: `${t('Books')} (${t('all')})`,
        hint: t('searchFilterObjectsAndHelp', {type: t('Books')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'RecipeBook',
        modelValue: useRouteQuery('booksAnd', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    booksOrNot: {
        id: 'booksOrNot',
        label: `${t('Books')} ${'exclude'} (${t('any')})`,
        hint: t('searchFilterObjectsOrNotHelp', {type: t('Books')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'RecipeBook',
        modelValue: useRouteQuery('booksOrNot', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    booksAndNot: {
        id: 'booksAndNot',
        label: `${t('Books')} ${'exclude'} (${t('all')})`,
        hint: t('searchFilterObjectsAndNotHelp', {type: t('Books')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'RecipeBook',
        modelValue: useRouteQuery('booksAndNot', [], {transform: toNumberArray}),
        returnObject: false,
        multiple: true,
        chips: true,
    },
    createdby: {
        id: 'createdby',
        label: t('CreatedBy'),
        hint: t('searchFilterCreatedByHelp'),
        enabled: false,
        default: undefined,
        is: markRaw(VModelSelect),
        model: 'User',
        modelValue: useRouteQuery('createdby', undefined, {transform: numberOrUndefinedTransformer}),
        returnObject: false,
    },
    units: {
        id: 'units',
        label: `${t('Units')} (${t('any')})`,
        hint: t('searchFilterObjectsHelp', {type: t('Units')}),
        enabled: false,
        default: [],
        is: markRaw(VModelSelect),
        model: 'Unit',
        modelValue: [],
        modelValueId: useRouteQuery('units', [], {transform: toNumberArray}),
        multiple: true,
        chips: true,
    },
    internal: {
        id: 'internal',
        label: t('Hide_External'),
        hint: t('searchFilterHideExternalHelp'),
        enabled: false,
        default: undefined,
        is: markRaw(VSelect),
        items: [{value: true, title: 'Yes'}, {value: false, title: 'No'}],
        modelValue: useRouteQuery('internal', undefined, {transform: boolOrUndefinedTransformer})
    },
    // random: {
    //     id: 'random',
    //     label: t('RandomOrder'),
    //     hint: t('searchFilterRandomHelp'),
    //     enabled: false,
    //     default: "false",
    //     is: VSelect,
    //     items: [{value: "true", title: 'Yes'}, {value: "false", title: 'No'}],
    //     modelValue: useRouteQuery('random', "false")
    // },
    rating: {
        id: 'rating',
        label: `${t('Rating')} (${t('exact')})`,
        hint: '',
        enabled: false,
        clearable: true,
        default: undefined,
        is: markRaw(RatingField),
        modelValue: useRouteQuery('rating', undefined, {transform: numberOrUndefinedTransformer}),
    },
    ratingGte: {
        id: 'ratingGte',
        label: `${t('Rating')} (>=)`,
        hint: '',
        enabled: false,
        clearable: true,
        default: undefined,
        is: markRaw(RatingField),
        modelValue: useRouteQuery('ratingGte', undefined, {transform: numberOrUndefinedTransformer}),
    },
    ratingLte: {
        id: 'ratingLte',
        label: `${t('Rating')} (<=)`,
        hint: '',
        enabled: false,
        clearable: true,
        default: undefined,
        is: markRaw(RatingField),
        modelValue: useRouteQuery('ratingLte', undefined, {transform: numberOrUndefinedTransformer}),
    },
    timescooked: {
        id: 'timescooked',
        label: `${t('times_cooked')} (${t('exact')})`,
        hint: 'Recipes that were cooked at least X times',
        enabled: false,
        default: undefined,
        clearable: true,
        is: markRaw(VNumberInput),
        modelValue: useRouteQuery('timescooked', undefined, {transform: numberOrUndefinedTransformer}),
    },
    timescookedGte: {
        id: 'timescookedGte',
        label: `${t('times_cooked')} (>=)`,
        hint: '',
        enabled: false,
        clearable: true,
        default: undefined,
        is: markRaw(VNumberInput),
        modelValue: useRouteQuery('timescookedGte', undefined, {transform: numberOrUndefinedTransformer}),
    },
    timescookedLte: {
        id: 'timescookedLte',
        label: `${t('times_cooked')} (<=)`,
        hint: '',
        enabled: false,
        clearable: true,
        default: undefined,
        is: markRaw(VNumberInput),
        modelValue: useRouteQuery('timescookedLte', undefined, {transform: numberOrUndefinedTransformer}),
    },
    makenow: {
        id: 'makenow',
        label: t('OnHand'),
        hint: t('searchFilterOnHandHelp'),
        enabled: false,
        default: "false",
        is: markRaw(VSelect),
        items: [{value: "true", title: 'Yes'}, {value: "false", title: 'No'}],
        modelValue: useRouteQuery('makenow', "false"),
    },
    cookedonGte: {
        id: 'cookedonGte',
        label: `${t('Cooked')} ${t('after')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('cookedonGte', null, {transform: routeQueryDateTransformer}),
    },
    cookedonLte: {
        id: 'cookedonLte',
        label: `${t('Cooked')} ${t('before')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('cookedonLte', null, {transform: routeQueryDateTransformer}),
    },
    viewedonGte: {
        id: 'viewedonGte',
        label: `${t('Viewed')} ${t('after')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('viewedonGte', null, {transform: routeQueryDateTransformer}),
    },
    viewedonLte: {
        id: 'viewedonLte',
        label: `${t('Viewed')} ${t('before')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('viewedonLte', null, {transform: routeQueryDateTransformer}),
    },
    createdon: {
        id: 'createdon',
        label: `${t('Created')} ${t('on')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('createdon', null, {transform: routeQueryDateTransformer}),
    },
    createdonGte: {
        id: 'createdonGte',
        label: `${t('Created')} ${t('on')}/${t('after')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('createdonGte', null, {transform: routeQueryDateTransformer}),
    },
    createdonLte: {
        id: 'createdonLte',
        label: `${t('Created')} ${t('on')}/${t('before')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('createdonLte', null, {transform: routeQueryDateTransformer}),
    },
    updatedon: {
        id: 'updatedon',
        label: `${t('Updated')} ${t('on')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('updatedon', null, {transform: routeQueryDateTransformer}),
    },
    updatedonGte: {
        id: 'updatedonGte',
        label: `${t('Updated')} ${t('on')}/${t('after')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('updatedonGte', null, {transform: routeQueryDateTransformer}),
    },
    updatedonLte: {
        id: 'updatedonLte',
        label: `${t('Updated')} ${t('on')}/${t('before')}`,
        hint: '',
        enabled: false,
        default: null,
        is: markRaw(VDateInput),
        modelValue: useRouteQuery('updatedonLte', null, {transform: routeQueryDateTransformer}),
    },
    includeChildren: {
        id: 'includeChildren',
        label: t('Include Children'),
        hint: t('Include child keywords and foods in search results'),
        enabled: false,
        default: "true",  // Default enabled like v1
        is: markRaw(VSelect),
        items: [{value: "true", title: 'Yes'}, {value: "false", title: 'No'}],
        modelValue: useRouteQuery('includeChildren', 'true')
    },
})

</script>

<style scoped>

</style>