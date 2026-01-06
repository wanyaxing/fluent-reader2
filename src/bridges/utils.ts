console.log("[Bridge] Loading utils.ts");
import { ipcRenderer } from "electron"
declare var chrome: any;
import {
    ImageCallbackTypes,
    TouchBarTexts,
    WindowStateListenerType,
    AISettings,
} from "../schema-types"
import { IObjectWithKey } from "@fluentui/react"

const isExtension = !ipcRenderer

const utilsBridge = {
    platform: isExtension ? "web" : process.platform,

    getVersion: (): string => {
        if (isExtension) return "Extension"
        return ipcRenderer.sendSync("get-version")
    },

    openExternal: (url: string, background = false) => {
        if (isExtension) {
            chrome.runtime.sendMessage({ type: "OPEN_EXTERNAL", url })
        } else {
            ipcRenderer.invoke("open-external", url, background)
        }
    },

    showErrorBox: (title: string, content: string, copy?: string) => {
        if (isExtension) {
            alert(`${title}\n${content}`)
        } else {
            ipcRenderer.invoke("show-error-box", title, content, copy)
        }
    },

    showMessageBox: async (
        title: string,
        message: string,
        confirm: string,
        cancel: string,
        defaultCancel = false,
        type = "none"
    ) => {
        if (isExtension) {
            const result = confirm ? window.confirm(message) : window.alert(message)
            return result
        }
        return (await ipcRenderer.invoke(
            "show-message-box",
            title,
            message,
            confirm,
            cancel,
            defaultCancel,
            type
        )) as boolean
    },

    showSaveDialog: async (filters: Electron.FileFilter[], path: string) => {
        if (isExtension) {
            // 在扩展模式下，返回一个使用浏览器下载 API 的写入函数
            const fileName = path.split('/').pop() || 'export.opml'
            return (content: string, _errmsg: string) => {
                const blob = new Blob([content], { type: 'application/xml' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = fileName
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            }
        }
        let result = (await ipcRenderer.invoke(
            "show-save-dialog",
            filters,
            path
        )) as boolean
        if (result) {
            return (result: string, errmsg: string) => {
                ipcRenderer.invoke("write-save-result", result, errmsg)
            }
        } else {
            return null
        }
    },

    showOpenDialog: async (filters: Electron.FileFilter[]) => {
        if (isExtension) {
            // 在扩展模式下，使用 HTML5 File Input API
            return new Promise<string | null>((resolve) => {
                const input = document.createElement('input')
                input.type = 'file'
                // 从 filters 构建 accept 属性
                const extensions = filters.flatMap(f => f.extensions.map(ext => `.${ext}`))
                input.accept = extensions.join(',')
                input.style.display = 'none'

                input.onchange = async () => {
                    if (input.files && input.files.length > 0) {
                        const file = input.files[0]
                        try {
                            const text = await file.text()
                            resolve(text)
                        } catch (err) {
                            console.error('Error reading file:', err)
                            resolve(null)
                        }
                    } else {
                        resolve(null)
                    }
                    document.body.removeChild(input)
                }

                input.oncancel = () => {
                    resolve(null)
                    document.body.removeChild(input)
                }

                document.body.appendChild(input)
                input.click()
            })
        }
        return (await ipcRenderer.invoke("show-open-dialog", filters)) as string
    },

    getCacheSize: async (): Promise<number> => {
        if (isExtension) return 0
        return await ipcRenderer.invoke("get-cache")
    },

    clearCache: async () => {
        if (!isExtension) await ipcRenderer.invoke("clear-cache")
    },

    addMainContextListener: (
        callback: (pos: [number, number], text: string) => any
    ) => {
        if (isExtension) return
        ipcRenderer.removeAllListeners("window-context-menu")
        ipcRenderer.on("window-context-menu", (_, pos, text) => {
            callback(pos, text)
        })
    },
    addWebviewContextListener: (
        callback: (pos: [number, number], text: string, url: string) => any
    ) => {
        if (isExtension) return
        ipcRenderer.removeAllListeners("webview-context-menu")
        ipcRenderer.on("webview-context-menu", (_, pos, text, url) => {
            callback(pos, text, url)
        })
    },
    imageCallback: (type: ImageCallbackTypes) => {
        if (!isExtension) ipcRenderer.invoke("image-callback", type)
    },

    addWebviewKeydownListener: (callback: (event: Electron.Input) => any) => {
        if (isExtension) return
        ipcRenderer.removeAllListeners("webview-keydown")
        ipcRenderer.on("webview-keydown", (_, input) => {
            callback(input)
        })
    },

    addWebviewErrorListener: (callback: (reason: string) => any) => {
        if (isExtension) return
        ipcRenderer.removeAllListeners("webview-error")
        ipcRenderer.on("webview-error", (_, reason) => {
            callback(reason)
        })
    },

    writeClipboard: (text: string) => {
        if (isExtension) {
            navigator.clipboard.writeText(text)
        } else {
            ipcRenderer.invoke("write-clipboard", text)
        }
    },

    closeWindow: () => {
        if (!isExtension) ipcRenderer.invoke("close-window")
    },
    minimizeWindow: () => {
        if (!isExtension) ipcRenderer.invoke("minimize-window")
    },
    maximizeWindow: () => {
        if (!isExtension) ipcRenderer.invoke("maximize-window")
    },
    isMaximized: () => {
        if (isExtension) return false
        return ipcRenderer.sendSync("is-maximized") as boolean
    },
    isFullscreen: () => {
        if (isExtension) return false
        return ipcRenderer.sendSync("is-fullscreen") as boolean
    },
    isFocused: () => {
        if (isExtension) return true
        return ipcRenderer.sendSync("is-focused") as boolean
    },
    focus: () => {
        if (!isExtension) ipcRenderer.invoke("request-focus")
    },
    requestAttention: () => {
        if (!isExtension) ipcRenderer.invoke("request-attention")
    },
    addWindowStateListener: (
        callback: (type: WindowStateListenerType, state: boolean) => any
    ) => {
        if (isExtension) return
        ipcRenderer.removeAllListeners("maximized")
        ipcRenderer.on("maximized", () => {
            callback(WindowStateListenerType.Maximized, true)
        })
        ipcRenderer.removeAllListeners("unmaximized")
        ipcRenderer.on("unmaximized", () => {
            callback(WindowStateListenerType.Maximized, false)
        })
        ipcRenderer.removeAllListeners("enter-fullscreen")
        ipcRenderer.on("enter-fullscreen", () => {
            callback(WindowStateListenerType.Fullscreen, true)
        })
        ipcRenderer.removeAllListeners("leave-fullscreen")
        ipcRenderer.on("leave-fullscreen", () => {
            callback(WindowStateListenerType.Fullscreen, false)
        })
        ipcRenderer.removeAllListeners("window-focus")
        ipcRenderer.on("window-focus", () => {
            callback(WindowStateListenerType.Focused, true)
        })
        ipcRenderer.removeAllListeners("window-blur")
        ipcRenderer.on("window-blur", () => {
            callback(WindowStateListenerType.Focused, false)
        })
    },

    addTouchBarEventsListener: (callback: (IObjectWithKey) => any) => {
        if (isExtension) return
        ipcRenderer.removeAllListeners("touchbar-event")
        ipcRenderer.on("touchbar-event", (_, key: string) => {
            callback({ key: key })
        })
    },
    initTouchBar: (texts: TouchBarTexts) => {
        if (!isExtension) ipcRenderer.invoke("touchbar-init", texts)
    },
    destroyTouchBar: () => {
        if (!isExtension) ipcRenderer.invoke("touchbar-destroy")
    },

    initFontList: (): Promise<Array<string>> => {
        if (isExtension) return Promise.resolve(["Arial", "Helvetica", "Times New Roman", "Courier New"])
        return ipcRenderer.invoke("init-font-list")
    },
    generateSummary: (settings: AISettings, title: string, content: string, targetLanguage: string): Promise<string> => {
        if (isExtension) {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: "AI_SUMMARY", settings, title, content, targetLanguage },
                    (response: any) => {
                        if (response?.success) {
                            resolve(response.result);
                        } else {
                            resolve(`Error: ${response?.error || "Unknown error"}`);
                        }
                    }
                );
            });
        }
        return ipcRenderer.invoke("generate-ai-summary", settings, title, content, targetLanguage)
    },
    generateTranslation: (settings: AISettings, targetLanguage: string, jsonContent: string): Promise<string> => {
        if (isExtension) {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: "AI_TRANSLATE", settings, targetLanguage, jsonContent },
                    (response: any) => {
                        if (response?.success) {
                            resolve(response.result);
                        } else {
                            resolve(response?.result || "{}");
                        }
                    }
                );
            });
        }
        return ipcRenderer.invoke("generate-ai-translation", settings, targetLanguage, jsonContent)
    },
    testAISettings: (settings: AISettings): Promise<{ success: boolean; message?: string }> => {
        if (isExtension) {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: "AI_TEST", settings },
                    (response: any) => {
                        resolve(response || { success: false, message: "No response" });
                    }
                );
            });
        }
        return ipcRenderer.invoke("test-ai-settings", settings)
    },
}

declare global {
    interface Window {
        utils: typeof utilsBridge
        fontList: Array<string>
    }
}

export default utilsBridge
