import {computed, Ref, ref, watch} from "vue"
import {ApiApi, AutomationTypeEnum} from "@/openapi"
import {ErrorMessageType, useMessageStore} from "@/stores/MessageStore"

export function useAliases(aliasType: 'FOOD_ALIAS' | 'UNIT_ALIAS', editingObj: Ref<any>, editingObjChanged: Ref<boolean>) {
    const newAliases = ref('')
    const existingAliases = ref([] as string[])

    const aliasHint = computed(() => {
        if (existingAliases.value.length > 0) {
            return 'Existing aliases: ' + existingAliases.value.join(', ')
        }
        return 'No aliases yet'
    })

    watch(() => editingObj.value?.id, (id) => {
        if (id) {
            loadExistingAliases()
        }
    }, {immediate: true})

    watch(newAliases, (value) => {
        if (value.trim().length > 0) {
            editingObjChanged.value = true
        }
    })

    async function loadExistingAliases() {
        const name = editingObj.value?.name
        if (!name) {
            existingAliases.value = []
            return
        }

        const api = new ApiApi()
        const found: string[] = []
        try {
            let currentPage = 1
            let seen = 0
            let total = 0
            do {
                const r = await api.apiAutomationList({type: [aliasType] as any, page: currentPage, pageSize: 100})
                r.results.forEach((a: any) => {
                    if (a.param1 && a.param2 && a.param2.toLowerCase() == name.toLowerCase()) {
                        found.push(a.param1)
                    }
                })
                seen += r.results.length
                total = r.count
                currentPage++
                if (r.results.length == 0) {
                    break
                }
            } while (seen < total)
            existingAliases.value = found
        } catch (err) {
            useMessageStore().addError(ErrorMessageType.FETCH_ERROR, err)
        }
    }

    async function saveAliases() {
        const name = editingObj.value?.name
        const typed = newAliases.value.split(',').map(a => a.trim()).filter(a => a.length > 0)
        if (!name || typed.length == 0) {
            return
        }

        const known = existingAliases.value.map(a => a.toLowerCase())
        const toCreate = typed.filter((a, index) => {
            const lower = a.toLowerCase()
            return lower != name.toLowerCase() && !known.includes(lower) && typed.findIndex(b => b.toLowerCase() == lower) == index
        })

        const api = new ApiApi()
        for (const alias of toCreate) {
            try {
                await api.apiAutomationCreate({automation: {type: aliasType as AutomationTypeEnum, name: alias, param1: alias, param2: name}})
            } catch (err) {
                useMessageStore().addError(ErrorMessageType.CREATE_ERROR, err)
            }
        }

        newAliases.value = ''
        await loadExistingAliases()
    }

    return {newAliases, aliasHint, saveAliases}
}