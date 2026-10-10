import {ref} from "vue"
import {ApiApi} from "@/openapi"
import {ErrorMessageType, useMessageStore} from "@/stores/MessageStore"

/**
 * helps the recipe importer flag foods and units that do not exist yet.
 * the import response only contains names, so all existing foods/units are
 * loaded each time loadExistingItems() is called and names are checked against them
 */
export function useImportNewItems() {
    const foodNames = ref<string[]>([])
    const unitNames = ref<string[]>([])
    const foodLookup = ref(new Set<string>())
    const unitLookup = ref(new Set<string>())
    const loaded = ref(false)
    let loading = false

    async function loadAllPages(list: (page: number) => Promise<any>): Promise<any[]> {
        let all: any[] = []
        let page = 1
        let hasNext = true
        while (hasNext) {
            const r = await list(page)
            all = all.concat(r.results)
            hasNext = !!r.next
            page++
        }
        return all
    }

    function buildLookup(items: any[]): Set<string> {
        const lookup = new Set<string>()
        items.forEach(i => {
            lookup.add(i.name.toLowerCase())
            if (i.pluralName) {
                lookup.add(i.pluralName.toLowerCase())
            }
        })
        return lookup
    }

    function sortedNames(items: any[]): string[] {
        return [...new Set<string>(items.map(i => i.name))].sort((a, b) => a.localeCompare(b))
    }

    async function loadExistingItems() {
        if (loading) return
        loading = true
        loaded.value = false
        const api = new ApiApi()
        try {
            const [foods, units] = await Promise.all([
                loadAllPages((page) => api.apiFoodList({page: page, pageSize: 200})),
                loadAllPages((page) => api.apiUnitList({page: page, pageSize: 200})),
            ])
            foodLookup.value = buildLookup(foods)
            unitLookup.value = buildLookup(units)
            foodNames.value = sortedNames(foods)
            unitNames.value = sortedNames(units)
            loaded.value = true
        } catch (err) {
            useMessageStore().addError(ErrorMessageType.FETCH_ERROR, err)
        } finally {
            loading = false
        }
    }

    // only flag once the existing items have loaded, otherwise everything would show as new
    function isNewFood(name?: string | null): boolean {
        return loaded.value && !!name && !foodLookup.value.has(name.trim().toLowerCase())
    }

    function isNewUnit(name?: string | null): boolean {
        return loaded.value && !!name && !unitLookup.value.has(name.trim().toLowerCase())
    }

    return {loadExistingItems, isNewFood, isNewUnit, foodNames, unitNames, loaded}
}