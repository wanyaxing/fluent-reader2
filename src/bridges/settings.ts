import {
    SourceGroup,
    ViewType,
    ThemeSettings,
    SearchEngines,
    ServiceConfigs,
    ViewConfigs,
    AISettings,
    SyncService,
} from "../schema-types"
import { ipcRenderer } from "electron"

const isExtension = !ipcRenderer

// Cache for extension mode to support synchronous reads
const settingsCache: any = {}

const syncToStorage = (key: string, value: any) => {
    if (isExtension && window.chrome && window.chrome.storage) {
        window.chrome.storage.local.set({ [key]: value })
    }
}

// Initialize cache from storage (must be called on startup)
export const initSettings = async () => {
    if (isExtension && window.chrome && window.chrome.storage) {
        return new Promise<void>(resolve => {
            window.chrome.storage.local.get(null, items => {
                Object.assign(settingsCache, items)
                resolve()
            })
        })
    }
}

const settingsBridge = {
    init: initSettings,

    saveGroups: (groups: SourceGroup[]) => {
        if (isExtension) {
            settingsCache["groups"] = groups
            syncToStorage("groups", groups)
        } else {
            ipcRenderer.invoke("set-groups", groups)
        }
    },
    loadGroups: (): SourceGroup[] => {
        if (isExtension) return settingsCache["groups"] || []
        return ipcRenderer.sendSync("get-groups")
    },

    getDefaultMenu: (): boolean => {
        if (isExtension) return false // No menu in extension
        return ipcRenderer.sendSync("get-menu")
    },
    setDefaultMenu: (state: boolean) => {
        if (!isExtension) ipcRenderer.invoke("set-menu", state)
    },

    getProxyStatus: (): boolean => {
        if (isExtension) return false // No proxy setting support directly yet
        return ipcRenderer.sendSync("get-proxy-status")
    },
    toggleProxyStatus: () => {
        if (!isExtension) ipcRenderer.send("toggle-proxy-status")
    },
    getProxy: (): string => {
        if (isExtension) return ""
        return ipcRenderer.sendSync("get-proxy")
    },
    setProxy: (address: string = null) => {
        if (!isExtension) ipcRenderer.invoke("set-proxy", address)
    },

    getDefaultView: (): ViewType => {
        if (isExtension) return settingsCache["view"] || ViewType.Cards
        return ipcRenderer.sendSync("get-view")
    },
    setDefaultView: (viewType: ViewType) => {
        if (isExtension) {
            settingsCache["view"] = viewType
            syncToStorage("view", viewType)
        } else {
            ipcRenderer.invoke("set-view", viewType)
        }
    },

    getThemeSettings: (): ThemeSettings => {
        if (isExtension) return settingsCache["theme"] || ThemeSettings.Default
        return ipcRenderer.sendSync("get-theme")
    },
    setThemeSettings: (theme: ThemeSettings) => {
        if (isExtension) {
            settingsCache["theme"] = theme
            syncToStorage("theme", theme)
        } else {
            ipcRenderer.invoke("set-theme", theme)
        }
    },
    shouldUseDarkColors: (): boolean => {
        if (isExtension) {
            // Simple check, can be improved
            return settingsCache["theme"] === ThemeSettings.Dark
        }
        return ipcRenderer.sendSync("get-theme-dark-color")
    },
    addThemeUpdateListener: (callback: (shouldDark: boolean) => any) => {
        if (isExtension) return // Todo: implement listener
        ipcRenderer.on("theme-updated", (_, shouldDark) => {
            callback(shouldDark)
        })
    },

    setLocaleSettings: (option: string) => {
        if (isExtension) {
            settingsCache["locale"] = option
            syncToStorage("locale", option)
        } else {
            ipcRenderer.invoke("set-locale", option)
        }
    },
    getLocaleSettings: (): string => {
        if (isExtension) return settingsCache["locale"] || "auto"
        return ipcRenderer.sendSync("get-locale-settings")
    },
    getCurrentLocale: (): string => {
        if (isExtension) {
            const setLocale = settingsCache["locale"]
            if (setLocale && setLocale !== "auto") return setLocale
            const sysLocale = window.chrome.i18n.getUILanguage()
            // Convert chrome locale (e.g. en-US, zh-CN) to match app expectations if needed
            // App usually expects 'en-US', 'zh-CN', etc. chrome.i18n returns with hyphen usually.
            return sysLocale
        }
        return ipcRenderer.sendSync("get-locale")
    },

    getFontSize: (): number => {
        if (isExtension) return settingsCache["fontSize"] || 16
        return ipcRenderer.sendSync("get-font-size")
    },
    setFontSize: (size: number) => {
        if (isExtension) {
            settingsCache["fontSize"] = size
            syncToStorage("fontSize", size)
        } else {
            ipcRenderer.invoke("set-font-size", size)
        }
    },

    getFont: (): string => {
        if (isExtension) return settingsCache["font"] || ""
        return ipcRenderer.sendSync("get-font")
    },
    setFont: (font: string) => {
        if (isExtension) {
            settingsCache["font"] = font
            syncToStorage("font", font)
        } else {
            ipcRenderer.invoke("set-font", font)
        }
    },

    getFetchInterval: (): number => {
        if (isExtension) return settingsCache["fetchInterval"] || 0
        return ipcRenderer.sendSync("get-fetch-interval")
    },
    setFetchInterval: (interval: number) => {
        if (isExtension) {
            settingsCache["fetchInterval"] = interval
            syncToStorage("fetchInterval", interval)
        } else {
            ipcRenderer.invoke("set-fetch-interval", interval)
        }
    },

    getSearchEngine: (): SearchEngines => {
        if (isExtension) return settingsCache["searchEngine"] || SearchEngines.Google
        return ipcRenderer.sendSync("get-search-engine")
    },
    setSearchEngine: (engine: SearchEngines) => {
        if (isExtension) {
            settingsCache["searchEngine"] = engine
            syncToStorage("searchEngine", engine)
        } else {
            ipcRenderer.invoke("set-search-engine", engine)
        }
    },

    getServiceConfigs: (): ServiceConfigs => {
        if (isExtension) return settingsCache["serviceConfigs"] || { type: SyncService.None }
        return ipcRenderer.sendSync("get-service-configs")
    },
    setServiceConfigs: (configs: ServiceConfigs) => {
        if (isExtension) {
            settingsCache["serviceConfigs"] = configs
            syncToStorage("serviceConfigs", configs)
        } else {
            ipcRenderer.invoke("set-service-configs", configs)
        }
    },

    getFilterType: (): number => {
        if (isExtension) return settingsCache["filterType"] === undefined ? 3 : settingsCache["filterType"]
        return ipcRenderer.sendSync("get-filter-type")
    },
    setFilterType: (filterType: number) => {
        if (isExtension) {
            settingsCache["filterType"] = filterType
            syncToStorage("filterType", filterType)
        } else {
            ipcRenderer.invoke("set-filter-type", filterType)
        }
    },

    getViewConfigs: (view: ViewType): ViewConfigs => {
        if (isExtension) return settingsCache[`viewConfigs_${view}`] || {}
        return ipcRenderer.sendSync("get-view-configs", view)
    },
    setViewConfigs: (view: ViewType, configs: ViewConfigs) => {
        if (isExtension) {
            settingsCache[`viewConfigs_${view}`] = configs
            syncToStorage(`viewConfigs_${view}`, configs)
        } else {
            ipcRenderer.invoke("set-view-configs", view, configs)
        }
    },

    getNeDBStatus: (): boolean => {
        if (isExtension) return false
        return ipcRenderer.sendSync("get-nedb-status")
    },
    setNeDBStatus: (flag: boolean) => {
        if (!isExtension) ipcRenderer.invoke("set-nedb-status", flag)
    },

    getAll: () => {
        if (isExtension) return { ...settingsCache }
        return ipcRenderer.sendSync("get-all-settings") as Object
    },

    setAll: configs => {
        if (isExtension) {
            Object.assign(settingsCache, configs)
            for (const [key, value] of Object.entries(configs)) {
                syncToStorage(key, value)
            }
        } else {
            ipcRenderer.invoke("import-all-settings", configs)
        }
    },

    getSortDirection: (): number => {
        if (isExtension) return settingsCache["sortDirection"] === undefined ? 0 : settingsCache["sortDirection"]
        return ipcRenderer.sendSync("get-sort-direction")
    },
    setSortDirection: (direction: number) => {
        if (isExtension) {
            settingsCache["sortDirection"] = direction
            syncToStorage("sortDirection", direction)
        } else {
            ipcRenderer.invoke("set-sort-direction", direction)
        }
    },
    getAISettings: (): AISettings => {
        if (isExtension) return settingsCache["aiSettings"] || {}
        return ipcRenderer.sendSync("get-ai-settings")
    },
    setAISettings: (settings: AISettings) => {
        if (isExtension) {
            settingsCache["aiSettings"] = settings
            syncToStorage("aiSettings", settings)
        } else {
            ipcRenderer.invoke("set-ai-settings", settings)
        }
    },
    getListViewWidth: (): number => {
        if (isExtension) return settingsCache["listViewWidth"] || 300
        return ipcRenderer.sendSync("get-list-view-width")
    },
    setListViewWidth: (width: number) => {
        if (isExtension) {
            settingsCache["listViewWidth"] = width
            syncToStorage("listViewWidth", width)
        } else {
            ipcRenderer.invoke("set-list-view-width", width)
        }
    },
}

declare global {
    interface Window {
        settings: typeof settingsBridge
        chrome: any
    }
}

export default settingsBridge
