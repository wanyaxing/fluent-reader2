import "./polyfill"
console.log("[App] index.tsx executing");
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Provider } from "react-redux"
import { initializeIcons } from "@fluentui/react/lib/Icons"
import Root from "./components/root"
import { applyThemeSettings } from "./scripts/settings"
import { initApp, openTextMenu } from "./scripts/models/app"
import { createRootStore, getRootStore } from "./scripts/reducer"

window.settings.setProxy()

initializeIcons("icons/")

window.fontList = [""]
window.utils.initFontList().then(fonts => {
    window.fontList.push(...fonts)
})

const render = () => {
    console.log("[App] Settings initialized, creating store and rendering");
    // Create store AFTER settings are loaded
    const rootStore = createRootStore()

    applyThemeSettings()
    rootStore.dispatch(initApp())

    // Setup context menu listener after store is created
    window.utils.addMainContextListener((pos, text) => {
        getRootStore().dispatch(openTextMenu(pos, text))
    })

    ReactDOM.render(
        <Provider store={rootStore}>
            <Root />
        </Provider>,
        document.getElementById("app")
    )
}

if (window.settings.init) {
    window.settings.init().then(render)
} else {
    render()
}
