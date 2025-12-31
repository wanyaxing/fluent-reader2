console.log("[Polyfill] Loading polyfill.ts");
import settingsBridge from "./bridges/settings"
import utilsBridge from "./bridges/utils"

if (!window.settings) {
    window.settings = settingsBridge
}
if (!window.utils) {
    window.utils = utilsBridge
}
