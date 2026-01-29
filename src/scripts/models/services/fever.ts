import intl from "react-intl-universal"
import * as db from "../../db"
import lf from "lovefield"
import { ServiceHooks } from "../service"
import { ServiceConfigs, SyncService } from "../../../schema-types"
import { createSourceGroup } from "../group"
import { RSSSource } from "../source"
import { htmlDecode, domParser } from "../../utils"
import { RSSItem } from "../item"
import { SourceRule } from "../rule"

export interface FeverConfigs extends ServiceConfigs {
    type: SyncService.Fever
    endpoint: string
    username: string
    apiKey: string
    fetchLimit: number
    lastId?: number
    useInt32?: boolean
}

async function fetchAPI(configs: FeverConfigs, params = "", postparams = "") {
    const response = await fetch(configs.endpoint + "?api" + params, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `api_key=${configs.apiKey}${postparams}`,
    })
    if (!response.ok) throw APIError()
    const json = await response.json()
    if (json.auth === 0) throw APIError()
    return json
}

async function markItem(configs: FeverConfigs, item: RSSItem, as: string) {
    if (item.serviceRef) {
        try {
            await fetchAPI(
                configs,
                "",
                `&mark=item&as=${as}&id=${item.serviceRef}`
            )
        } catch (err) {
            console.log(err)
        }
    }
}

const APIError = () => new Error(intl.get("service.failure"))

export const feverServiceHooks: ServiceHooks = {
    authenticate: async (configs: FeverConfigs) => {
        try {
            return Boolean((await fetchAPI(configs)).auth)
        } catch {
            return false
        }
    },

    updateSources: () => async (dispatch, getState) => {
        const configs = getState().service as FeverConfigs
        const response = await fetchAPI(configs, "&feeds")
        const feeds: any[] = response.feeds
        const feedGroups: any[] = response.feeds_groups
        if (feeds === undefined) throw APIError()
        let groupsMap: Map<string, string>
        if (configs.importGroups) {
            // Import groups on the first sync
            const groups: any[] = (await fetchAPI(configs, "&groups")).groups
            if (groups === undefined || feedGroups === undefined)
                throw APIError()
            const groupsIdMap = new Map<number, string>()
            for (let group of groups) {
                const title = group.title.trim()
                dispatch(createSourceGroup(title))
                groupsIdMap.set(group.id, title)
            }
            groupsMap = new Map()
            for (let group of feedGroups) {
                for (let fid of group.feed_ids.split(",")) {
                    groupsMap.set(fid, groupsIdMap.get(group.group_id))
                }
            }
        }
        const sources = feeds.map(f => {
            const source = new RSSSource(f.url, f.title)
            source.serviceRef = String(f.id)
            return source
        })
        return [sources, groupsMap]
    },

    fetchItems: () => async (_, getState) => {
        const state = getState()
        const configs = state.service as FeverConfigs
        const items = new Array()
        configs.lastId = configs.lastId || 0

        // 1. Unread Discovery: Fetch authoritative unread IDs from server
        let unreadIdsFromServer: string[] = []
        try {
            const unreadResponse = await fetchAPI(configs, "&unread_item_ids")
            if (typeof unreadResponse.unread_item_ids === "string") {
                unreadIdsFromServer = unreadResponse.unread_item_ids.split(",")
            }
        } catch (err) {
            console.log("Fever unread discovery failed", err)
        }

        // 2. Identify missing articles (unread on server but not in local DB)
        let missingIds: string[] = []
        if (unreadIdsFromServer.length > 0) {
            const existingRefsRows = await db.itemsDB
                .select(db.items.serviceRef)
                .from(db.items)
                .where(db.items.serviceRef.in(unreadIdsFromServer))
                .exec()
            const existingRefs = new Set(existingRefsRows.map(r => String(r["serviceRef"])))
            missingIds = unreadIdsFromServer.filter(id => !existingRefs.has(id))
        }

        // 3. Targeted Fetching: Fetch missing articles in batches
        if (missingIds.length > 0) {
            const batchSize = 50
            for (let i = 0; i < missingIds.length && items.length < configs.fetchLimit; i += batchSize) {
                const batch = missingIds.slice(i, i + batchSize)
                try {
                    const response = await fetchAPI(configs, `&items&with_ids=${batch.join(",")}`)
                    if (response.items) {
                        items.push(...response.items)
                    }
                } catch (err) {
                    console.log("Fever targeted fetch failed", err)
                }
            }
        }

        // 4. Enhanced Kindle Crawl: Fetch new/recent items if we have room
        if (items.length < configs.fetchLimit) {
            let min = configs.useInt32 ? 2147483647 : Number.MAX_SAFE_INTEGER
            let response
            do {
                response = await fetchAPI(configs, `&items&max_id=${min}`)
                if (response.items === undefined) throw APIError()

                // Only add items we haven't already fetched in this session (Discovery)
                const existingFetchedIds = new Set(items.map(i => i.id))
                const newItems = response.items.filter(i => i.id > configs.lastId && !existingFetchedIds.has(i.id))
                items.push(...newItems)

                if (response.items.length === 0 && min === Number.MAX_SAFE_INTEGER) {
                    configs.useInt32 = true
                    min = 2147483647
                    response = undefined
                } else if (response.items.length > 0) {
                    min = response.items.reduce((m, n) => Math.min(m, n.id), min)
                } else {
                    break // End of history on server
                }
            } while (
                min > configs.lastId &&
                (response === undefined || response.items.length > 0) &&
                items.length < configs.fetchLimit
            )
        }

        // 5. Update lastId to track the newest item for future incremental syncs
        if (items.length > 0) {
            configs.lastId = items.reduce(
                (m, n) => Math.max(m, n.id),
                configs.lastId
            )
        }

        if (items.length > 0) {
            const fidMap = new Map<string, RSSSource>()
            for (let source of Object.values(state.sources)) {
                if (source.serviceRef) {
                    fidMap.set(source.serviceRef, source)
                }
            }
            const parsedItems = items.map(i => {
                const source = fidMap.get(String(i.feed_id))
                if (!source) return null
                const item = {
                    source: source.sid,
                    title: i.title,
                    link: i.url,
                    date: new Date(i.created_on_time * 1000),
                    fetchedDate: new Date(),
                    content: i.html,
                    snippet: htmlDecode(i.html).trim(),
                    creator: i.author,
                    hasRead: Boolean(i.is_read),
                    starred: Boolean(i.is_saved),
                    hidden: false,
                    notify: false,
                    serviceRef: String(i.id),
                } as RSSItem
                // Try to get the thumbnail of the item
                let dom = domParser.parseFromString(item.content, "text/html")
                let baseEl = dom.createElement("base")
                baseEl.setAttribute(
                    "href",
                    item.link.split("/").slice(0, 3).join("/")
                )
                dom.head.append(baseEl)
                let img = dom.querySelector("img")
                if (img && img.src) {
                    item.thumb = img.src
                } else if (configs.useInt32) {
                    // TTRSS Fever Plugin attachments
                    let a = dom.querySelector(
                        "body>ul>li:first-child>a"
                    ) as HTMLAnchorElement
                    if (a && /, image\/generic$/.test(a.innerText) && a.href)
                        item.thumb = a.href
                }
                // Apply rules and sync back to the service
                if (source.rules) SourceRule.applyAll(source.rules, item)

                // Only mark if local status differs from server status to avoid loops
                // Note: items from Fever are already in server status. 
                // We only need to check if user has local rules that override status.
                if (Boolean(i.is_read) !== item.hasRead)
                    markItem(configs, item, item.hasRead ? "read" : "unread")
                if (Boolean(i.is_saved) !== Boolean(item.starred))
                    markItem(configs, item, item.starred ? "saved" : "unsaved")
                return item
            }).filter(i => i !== null)
            return [parsedItems, configs]
        } else {
            return [[], configs]
        }
    },

    syncItems: () => async (_, getState) => {
        const configs = getState().service as FeverConfigs
        const [unreadResponse, starredResponse] = await Promise.all([
            fetchAPI(configs, "&unread_item_ids"),
            fetchAPI(configs, "&saved_item_ids"),
        ])
        if (
            typeof unreadResponse.unread_item_ids !== "string" ||
            typeof starredResponse.saved_item_ids !== "string"
        ) {
            throw APIError()
        }
        const unreadFids: string[] = unreadResponse.unread_item_ids.split(",")
        const starredFids: string[] = starredResponse.saved_item_ids.split(",")
        return [new Set(unreadFids), new Set(starredFids)]
    },

    markAllRead: (sids, date, before) => async (_, getState) => {
        const state = getState()
        const configs = state.service as FeverConfigs

        // 1. Query local DB for unread items in the selected view/range
        const predicates: lf.Predicate[] = [
            db.items.source.in(sids),
            db.items.hasRead.eq(false),
            db.items.serviceRef.isNotNull(),
        ]
        if (date) {
            predicates.push(
                before ? db.items.date.lte(date) : db.items.date.gte(date)
            )
        }
        const query = lf.op.and.apply(null, predicates)
        const rows = await db.itemsDB
            .select(db.items.serviceRef)
            .from(db.items)
            .where(query)
            .exec()

        const refs = rows.map(row => String(row["serviceRef"]))

        // 2. Mark each ID individually with throttle (Fever level 3 doesn't support multiple IDs)
        if (refs.length > 0) {
            const throttleLimit = 5
            for (let i = 0; i < refs.length; i += throttleLimit) {
                const batch = refs.slice(i, i + throttleLimit)
                await Promise.all(
                    batch.map(ref =>
                        fetchAPI(configs, "", `&mark=item&as=read&id=${ref}`).catch(
                            err => console.log(err)
                        )
                    )
                )
            }
        }
    },

    markRead: (item: RSSItem) => async (_, getState) => {
        await markItem(getState().service as FeverConfigs, item, "read")
    },

    markUnread: (item: RSSItem) => async (_, getState) => {
        await markItem(getState().service as FeverConfigs, item, "unread")
    },

    star: (item: RSSItem) => async (_, getState) => {
        await markItem(getState().service as FeverConfigs, item, "saved")
    },

    unstar: (item: RSSItem) => async (_, getState) => {
        await markItem(getState().service as FeverConfigs, item, "unsaved")
    },
}
