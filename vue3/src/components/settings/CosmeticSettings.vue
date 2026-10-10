<template>
    <v-form>
        <p class="text-h6">{{ $t('Cosmetic') }}</p>
        <v-divider class="mb-3"></v-divider>

        <language-select></language-select>

        <v-label>{{$t('Nav_Color')}}</v-label>
        <v-color-picker v-model="useUserPreferenceStore().userSettings.navBgColor" mode="hex" :modes="['hex']" show-swatches :swatches="[['#ddbf86'],['#b98766'],['#b55e4f'],['#82aa8b'],['#385f84']]"></v-color-picker>

        <v-select :label="$t('Theme')" class="mt-4" v-model="useUserPreferenceStore().userSettings.theme" :items="[{title: 'Tandoor', value: 'TANDOOR'}, {title: 'Tandoor Dark', value: 'TANDOOR_DARK'}, ]">
        </v-select>

        <v-checkbox :label="$t('Show_Logo')" :hint="$t('Show_Logo_Help')" persistent-hint v-model="useUserPreferenceStore().userSettings.navShowLogo"></v-checkbox>
        <v-checkbox :label="$t('Sticky_Nav')" :hint="$t('Sticky_Nav_Help')" persistent-hint v-model="useUserPreferenceStore().userSettings.navSticky"></v-checkbox>

        <v-btn class="mt-3" color="success" @click="useUserPreferenceStore().updateUserSettings()" prepend-icon="$save">{{$t('Save')}}</v-btn>

        <p class="text-h6 mt-3">Menu</p>
        <v-divider class="mb-3"></v-divider>
        <p class="text-body-2 mb-2">Uncheck an item to hide it from the menu on this device. If Home is hidden, the app opens on the first checked item in this list.</p>
        <v-checkbox v-for="item in getMenuItems()" :key="item.id" density="compact" hide-details
                    :model-value="!useUserPreferenceStore().deviceSettings.nav_hiddenItems.includes(item.id)"
                    @update:model-value="(checked: boolean | null) => setMenuItemVisible(item.id, !!checked)">
            <template #label>
                <v-icon :icon="item.prependIcon" class="me-3 fa-fw"></v-icon>{{ item.title }}
            </template>
        </v-checkbox>

        <p class="text-h6 mt-3">{{ $t('Preferences') }}</p>
        <v-divider class="mb-3"></v-divider>

        <v-text-field v-model="useUserPreferenceStore().userSettings.defaultUnit" :label="$t('Default_Unit')"></v-text-field>
        <v-number-input v-model="useUserPreferenceStore().userSettings.ingredientDecimals" :label="$t('Decimals')" :step="1" :min="0" :max="4"></v-number-input>

<!--        <v-select-->
<!--            :label="$t('DefaultPage')"-->
<!--            v-model="useUserPreferenceStore().userSettings.defaultPage"-->
<!--            :items="availableDefaultPages"-->
<!--            item-title="label"-->
<!--            item-value="page"-->
<!--        ></v-select>-->

        <v-checkbox :label="$t('Use_Fractions')" :hint="$t('Use_Fractions_Help')" persistent-hint v-model="useUserPreferenceStore().userSettings.useFractions"></v-checkbox>
        <v-checkbox :label="$t('Comments_setting')" v-model="useUserPreferenceStore().userSettings.comments"></v-checkbox>
        <v-checkbox :label="$t('left_handed')" :hint="$t('left_handed_help')" persistent-hint v-model="useUserPreferenceStore().userSettings.leftHanded"></v-checkbox>
        <v-checkbox :label="$t('show_step_ingredients_setting')" :hint="$t('show_step_ingredients_setting_help')" persistent-hint v-model="useUserPreferenceStore().userSettings.showStepIngredients"></v-checkbox>
        <v-btn class="mt-3" color="success" @click="useUserPreferenceStore().updateUserSettings()" prepend-icon="$save">{{$t('Save')}}</v-btn>
    </v-form>
</template>


<script setup lang="ts">


import {onMounted, ref} from "vue";
import {ApiApi, Localization} from "@/openapi";
import {ErrorMessageType, useMessageStore} from "@/stores/MessageStore";
import {useI18n} from "vue-i18n";
import {useUserPreferenceStore} from "@/stores/UserPreferenceStore";
import LanguageSelect from "@/components/inputs/LanguageSelect.vue";
import {useNavigation} from "@/composables/useNavigation";

const {t} = useI18n()

const {getMenuItems} = useNavigation()

function setMenuItemVisible(id: string, visible: boolean) {
    const hidden = useUserPreferenceStore().deviceSettings.nav_hiddenItems.filter(x => x != id)
    if (!visible) {
        hidden.push(id)
    }
    useUserPreferenceStore().deviceSettings.nav_hiddenItems = hidden
}

const availableDefaultPages = ref([
    {page: 'SEARCH', label: t('Search')},
    {page: 'SHOPPING', label: t('Shopping_list')},
    {page: 'PLAN', label: t('Meal_Plan')},
    {page: 'BOOKS', label: t('Books')},
])

onMounted(() => {

})

</script>

<style scoped>

</style>