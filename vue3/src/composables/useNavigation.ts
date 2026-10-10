import {useI18n} from "vue-i18n";
import {VDivider, VListItem} from "vuetify/components";
import {useUserPreferenceStore} from "@/stores/UserPreferenceStore.ts";
import {useDjangoUrls} from "@/composables/useDjangoUrls.ts";
import {TANDOOR_PLUGINS} from "@/types/Plugins.ts";
import {plugin} from "@/plugins/open_data_plugin/plugin.ts";

/**
 * manages configuration and loading of navigation entries for tandoor main app and plugins
 */
export function useNavigation() {
    const {t} = useI18n()

    /**
     * every entry that can be shown/hidden in the menu (Settings is not included so the menu can always be changed back)
     * the order of this list is the order of the drawer and decides which entry opens when Home is hidden
     */
    function getMenuItems() {
        return [
            {id: 'home', component: VListItem, prependIcon: '$recipes', title: 'Home', to: {name: 'StartPage', params: {}}},
            {id: 'myhome', component: VListItem, prependIcon: 'fa-solid fa-house-user', title: 'My Home', to: {name: 'MyHomePage', params: {}}},
            {id: 'search', component: VListItem, prependIcon: '$search', title: t('Search'), to: {name: 'SearchPage', params: {}}},
            {id: 'mealplan', component: VListItem, prependIcon: '$mealplan', title: t('Meal_Plan'), to: {name: 'MealPlanPage', params: {}}},
            {id: 'shopping', component: VListItem, prependIcon: '$shopping', title: t('Shopping'), to: {name: 'ShoppingListPage', params: {}}},
            {id: 'import', component: VListItem, prependIcon: 'fas fa-globe', title: t('Import'), to: {name: 'RecipeImportPage', params: {}}},
            {id: 'pantry', component: VListItem, prependIcon: '$pantry', title: t('Pantry'), to: {name: 'PantryPage', params: {}}},
            {id: 'books', component: VListItem, prependIcon: '$books', title: t('Books'), to: {name: 'BooksPage', params: {}}},
            {id: 'database', component: VListItem, prependIcon: 'fa-solid fa-folder-tree', title: t('Database'), to: {name: 'DatabasePage', params: {}}},
        ]
    }

    function isMenuItemHidden(id: string): boolean {
        return useUserPreferenceStore().deviceSettings.nav_hiddenItems.includes(id)
    }

    /**
     * strips the id so it is not passed on to the list item as an html attribute
     */
    function toListEntry(item: ReturnType<typeof getMenuItems>[number]) {
        return {component: item.component, prependIcon: item.prependIcon, title: item.title, to: item.to}
    }

    /**
     * where "home" leads: the start page, or the first visible menu entry if Home is hidden
     */
    function getHomeRoute() {
        const first = getMenuItems().find(item => !isMenuItemHidden(item.id))
        return first ? first.to : {name: 'StartPage', params: {}}
    }

    /**
     * icon of the first button of the mobile bottom bar
     */
    function getHomeIcon() {
        if (!isMenuItemHidden('home')) {
            return 'fa-fw fas fa-book '
        }
        const first = getMenuItems().find(item => !isMenuItemHidden(item.id))
        return first ? first.prependIcon : 'fa-fw fas fa-book '
    }
    
    function getNavigationDrawer() {
        let navigation = getMenuItems().filter(item => !isMenuItemHidden(item.id)).map(toListEntry)

        TANDOOR_PLUGINS.forEach(plugin => {
            plugin.navigationDrawer.forEach(navEntry => {
                let navEntryCopy = Object.assign({}, navEntry)
                if ('title' in navEntryCopy) {
                    navEntryCopy.title = t(navEntryCopy.title)
                }
                navigation.push(navEntryCopy)
            })
        })

        return navigation
    }

    function getBottomNavigation() {
        const bottomIds = ['import', 'database', 'myhome', 'search', 'pantry', 'books']
        const menuItems = getMenuItems()
        let navigation = [
            {component: VListItem, prependIcon: 'fa-solid fa-sliders', title: t('Settings'), to: {name: 'SettingsPage', params: {}}},
            ...bottomIds
                .map(id => menuItems.find(item => item.id == id)!)
                .filter(item => !isMenuItemHidden(item.id))
                .map(toListEntry),
        ]

        TANDOOR_PLUGINS.forEach(plugin => {
            plugin.bottomNavigation.forEach(navEntry => {
                let navEntryCopy = Object.assign({}, navEntry)
                if ('title' in navEntryCopy) {
                    navEntryCopy.title = t(navEntryCopy.title)
                }
                navigation.push(navEntryCopy)
            })
        })

        return navigation
    }

    function getUserNavigation() {
        let navigation = []

        navigation.push({component: VListItem, prependIcon: 'fa-solid fa-sliders', title: t('Settings'), to: {name: 'SettingsPage', params: {}}})
        navigation.push({component: VListItem, prependIcon: 'fa-solid fa-question', title: t('Help'), to: {name: 'HelpPage', params: {}}})

        if (useUserPreferenceStore().userSettings.user.isSuperuser) {
            navigation.push({component: VListItem, prependIcon: 'fa-solid fa-shield', title: t('Admin'), href: useDjangoUrls().getDjangoUrl('admin')})
        }

        if (useUserPreferenceStore().spaces.length > 1) {
            navigation.push({component: VDivider})
            useUserPreferenceStore().spaces.forEach(space => {
                navigation.push({
                    component: VListItem,
                    prependIcon: (useUserPreferenceStore().activeSpace.id == space.id) ? 'fa-solid fa-circle-dot' : 'fa-solid fa-circle',
                    title: space.name,
                    onClick: () => {
                        useUserPreferenceStore().switchSpace(space)
                    }
                })
            })
            navigation.push({component: VDivider})
        }

        TANDOOR_PLUGINS.forEach(plugin => {
            plugin.userNavigation.forEach(navEntry => {
                let navEntryCopy = Object.assign({}, navEntry)
                if ('title' in navEntryCopy) {
                    navEntryCopy.title = t(navEntryCopy.title)
                }
                navigation.push(navEntryCopy)
            })
        })

        navigation.push({component: VListItem, prependIcon: 'fa-solid fa-arrow-right-from-bracket', title: t('Logout'), href: useDjangoUrls().getDjangoUrl('accounts/logout')})

        return navigation
    }

    return {getNavigationDrawer, getBottomNavigation, getUserNavigation, getMenuItems, isMenuItemHidden, getHomeRoute, getHomeIcon}
}