<template>

<!--    <template v-if="route.name == 'ModelListPage'">-->
<!--        <v-divider></v-divider>-->
<!--        <v-list-item v-for="m in getListModels()"-->
<!--                     :to="{ name: 'ModelListPage', params: {model: m.name.toLowerCase()} }">-->
<!--            <template #prepend>-->
<!--                <v-icon :icon="m.icon"></v-icon>-->
<!--            </template>-->
<!--            {{ $t(m.localizationKey) }}-->
<!--        </v-list-item>-->
<!--    </template>-->

    <template v-if="route.name == 'MealPlanPage'">
        <div class="meal-plan-menu-section">
            <v-divider :thickness="3" class="border-opacity-50"></v-divider>
            <v-list-item prepend-icon="fa-solid fa-gear" :title="$t('Settings')" @click="settingsOpen = !settingsOpen">
                <template #append>
                    <v-icon :icon="settingsOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" size="small"></v-icon>
                </template>
            </v-list-item>
            <v-expand-transition>
                <div v-show="settingsOpen">
                    <div class="px-4 pb-2">
                        <meal-plan-device-settings></meal-plan-device-settings>
                    </div>
                    <v-list-item prepend-icon="fa-solid fa-calendar-plus" link>
                        {{ $t('Auto_Planner') }}
                        <auto-plan-dialog></auto-plan-dialog>
                    </v-list-item>
                    <meal-plan-ical-dialog></meal-plan-ical-dialog>
                </div>
            </v-expand-transition>
        </div>
    </template>


</template>

<script setup lang="ts">

import {ref} from "vue";
import {useRoute} from "vue-router";
import {getListModels} from "@/types/Models";
import {useUserPreferenceStore} from "@/stores/UserPreferenceStore";
import MealPlanDeviceSettings from "@/components/settings/MealPlanDeviceSettings.vue";
import AutoPlanDialog from "@/components/dialogs/AutoPlanDialog.vue";
import MealPlanIcalDialog from "@/components/dialogs/MealPlanIcalDialog.vue";

const route = useRoute()
const settingsOpen = ref(false)

</script>

<style scoped>
.meal-plan-menu-section {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
}
</style>