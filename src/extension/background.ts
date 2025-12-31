
declare var chrome: any;

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "index.html" });
});

// AI API helper function
async function callOpenAICompatibleAPI(apiUrl: string, apiKey: string, model: string, messages: any[], options: any = {}) {
    const url = apiUrl ? `${apiUrl.replace(/\/$/, '')}/chat/completions` : 'https://api.openai.com/v1/chat/completions';

    const body: any = {
        model: model,
        messages: messages,
        ...options
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    console.log("[Background] Received message:", request.type);

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
        return true;
    } else if (request.type === "OPEN_EXTERNAL") {
        chrome.tabs.create({ url: request.url });
    } else if (request.type === "AI_SUMMARY") {
        const { settings, title, content, targetLanguage } = request;

        const systemPrompt = `You are a helpful assistant that summarizes RSS articles. Use ${targetLanguage} for the summary.`;
        const userPrompt = `Please provide a concise summary of the following article titled "${title}" in ${targetLanguage}.\n\nContent:\n${content}`;

        const model = settings.model || (settings.provider === 1 ? "gemini-2.0-flash-exp" : "gpt-4o-mini");

        callOpenAICompatibleAPI(settings.apiUrl, settings.apiKey, model, [
            { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
        ])
            .then(response => {
                const result = response.choices?.[0]?.message?.content;
                if (!result) {
                    sendResponse({ success: false, error: "Empty response from AI" });
                } else {
                    sendResponse({ success: true, result });
                }
            })
            .catch(error => {
                console.error("[Background] AI Summary error:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.type === "AI_TRANSLATE") {
        const { settings, targetLanguage, jsonContent } = request;

        const systemPrompt = `You are a professional translator. Translate the values in the following JSON object into ${targetLanguage}. Keep the keys unchanged and return only the translated JSON object. Do not include any other text or markdown formatting in your response.`;
        const userPrompt = `JSON to translate:\n${jsonContent}`;

        const model = settings.model || (settings.provider === 1 ? "gemini-2.0-flash-exp" : "gpt-4o-mini");

        callOpenAICompatibleAPI(settings.apiUrl, settings.apiKey, model, [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ], { response_format: { type: "json_object" } })
            .then(response => {
                const result = response.choices?.[0]?.message?.content || "{}";
                sendResponse({ success: true, result });
            })
            .catch(error => {
                console.error("[Background] AI Translate error:", error);
                sendResponse({ success: false, error: error.message, result: "{}" });
            });
        return true;
    } else if (request.type === "AI_TEST") {
        const { settings } = request;
        const model = settings.model || (settings.provider === 1 ? "gemini-2.0-flash-exp" : "gpt-4o-mini");

        callOpenAICompatibleAPI(settings.apiUrl, settings.apiKey, model, [
            { role: "user", content: "Hello, this is a test connection." }
        ], { max_tokens: 5 })
            .then(() => {
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error("[Background] AI Test error:", error);
                sendResponse({ success: false, message: error.message });
            });
        return true;
    }
});
