
declare var chrome: any;

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "index.html" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[Background] Received message:", request.type, request.url);
    if (request.type === "RSS_FETCH") {
        fetch(request.url)
            .then(response => {
                const contentType = response.headers.get("content-type");
                return response.text().then(text => ({
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    text: text,
                    contentType: contentType
                }));
            })
            .then(result => {
                console.log("[Background] Fetch success for:", request.url, "Status:", result.status);
                sendResponse(result);
            })
            .catch(error => {
                console.error("[Background] Fetch error for:", request.url, error);
                sendResponse({
                    ok: false,
                    status: 0,
                    statusText: error.message,
                    text: "",
                    contentType: null
                });
            });
        return true; // Keep channel open for async response
    } else if (request.type === "OPEN_EXTERNAL") {
        chrome.tabs.create({ url: request.url });
    }
});
