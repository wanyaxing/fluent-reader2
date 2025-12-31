import { applyMiddleware, combineReducers, createStore } from "redux"
import thunkMiddleware from "redux-thunk"

import { sourceReducer } from "./models/source"
import { itemReducer } from "./models/item"
import { feedReducer } from "./models/feed"
import { appReducer } from "./models/app"
import { groupReducer } from "./models/group"
import { pageReducer } from "./models/page"
import { serviceReducer } from "./models/service"
import { AppDispatch } from "./utils"
import {
    TypedUseSelectorHook,
    useDispatch,
    useSelector,
    useStore,
} from "react-redux"

export const rootReducer = combineReducers({
    sources: sourceReducer,
    items: itemReducer,
    feeds: feedReducer,
    groups: groupReducer,
    page: pageReducer,
    service: serviceReducer,
    app: appReducer,
})

export type RootState = ReturnType<typeof rootReducer>

// Store with properly typed dispatch
type StoreWithThunk = ReturnType<typeof createStore> & { dispatch: AppDispatch }

// Lazy-create store to ensure settings are loaded first
let _rootStore: StoreWithThunk | null = null

export const createRootStore = (): StoreWithThunk => {
    if (!_rootStore) {
        _rootStore = createStore(
            rootReducer,
            applyMiddleware<AppDispatch, RootState>(thunkMiddleware)
        ) as StoreWithThunk
    }
    return _rootStore
}

export const getRootStore = (): StoreWithThunk => {
    if (!_rootStore) {
        throw new Error("Store not initialized. Call createRootStore() first.")
    }
    return _rootStore
}

// For backwards compatibility - will throw if accessed before init
export const rootStore = new Proxy({} as StoreWithThunk, {
    get(_, prop) {
        return getRootStore()[prop as keyof StoreWithThunk]
    }
})

export type AppStore = StoreWithThunk

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
export const useAppStore: () => AppStore = useStore
