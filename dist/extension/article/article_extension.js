console.log("[ArticleFrame] Script loaded");
const params = new URLSearchParams(window.location.search);

function render(header, content) {
    const main = document.getElementById("main");
    main.innerHTML = header;

    // Put content inside the article tag
    const article = main.querySelector("article");
    if (article) {
        article.innerHTML = content;
    } else {
        // Fallback: append content directly
        main.innerHTML += content;
    }

    // Add show class to make content visible
    main.classList.add("show");

    // External links
    document.querySelectorAll("a").forEach(a => {
        a.onclick = (e) => {
            e.preventDefault();
            const href = a.getAttribute("href");
            if (href && href.startsWith("http")) {
                window.parent.postMessage({ type: "OPEN_EXTERNAL", url: href }, "*");
            }
        }
    });
}

function updateAIUI(data) {
    const container = document.getElementById("ai-summary-container");
    if (!container) {
        console.log("[ArticleFrame] AI container not found");
        return;
    }

    if (data.hasSummary) {
        container.innerHTML = `<div class="ai-summary-card"><p class="ai-summary-title">${data.summaryTitle}</p><div class="ai-summary-content">${data.summaryHtml}</div></div>`;
    } else if (data.isLoading) {
        container.innerHTML = `<div class="ai-summary-loading"><span class="spinner"></span> ${data.loadingText}</div>`;
    } else {
        container.innerHTML = `<button id="generate-ai-btn" class="ai-btn">${data.buttonText}</button>`;
        const btn = document.getElementById("generate-ai-btn");
        if (btn) {
            btn.onclick = function () {
                console.log("[ArticleFrame] AI button clicked, sending message to parent");
                window.parent.postMessage({ type: "EXECUTE_AI_SUMMARY" }, "*");
            };
        }
    }
}

function injectTranslations(map) {
    const article = document.querySelector("article");
    if (!article) {
        console.log("[ArticleFrame] No article tag found for translations");
        return;
    }
    const elements = article.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6");
    let injectedCount = 0;

    for (const index in map) {
        const el = elements[parseInt(index)];
        if (el && !el.nextElementSibling?.classList?.contains("ai-translation")) {
            const transEl = document.createElement(el.tagName === "LI" ? "div" : el.tagName);
            transEl.className = "ai-translation";
            transEl.innerText = map[index];
            if (el.tagName === "LI") {
                el.appendChild(transEl);
            } else {
                el.insertAdjacentElement('afterend', transEl);
            }
            injectedCount++;
        }
    }
    console.log("[ArticleFrame] Injected " + injectedCount + " translations");
}

// Initial render from params (legacy/fallback) using try-catch
try {
    const a = params.get("a");
    const h = params.get("h");
    if (a && h) {
        render(decodeURIComponent(h), decodeURIComponent(a));
    }
} catch (e) {
    console.error("Error parsing params", e);
}

// Listen for message from parent
window.addEventListener("message", (event) => {
    console.log("[ArticleFrame] Received message:", event.data?.type);

    if (event.data && event.data.type === "RENDER_ARTICLE") {
        const { content, header } = event.data;
        render(header, content);

        // Apply font settings
        if (event.data.fontFamily) document.body.style.fontFamily = event.data.fontFamily;
        if (event.data.fontSize) document.body.style.fontSize = event.data.fontSize + "px";
        if (event.data.textDir) document.body.dir = event.data.textDir;

        // Apply theme/dark mode class if needed
        if (event.data.isDark) {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
    } else if (event.data && event.data.type === "UPDATE_AI_UI") {
        updateAIUI(event.data);
    } else if (event.data && event.data.type === "INJECT_TRANSLATIONS") {
        injectTranslations(event.data.map);
    }
});

// Send READY signal to parent
console.log("[ArticleFrame] Sending READY signal");
window.parent.postMessage({ type: "READY" }, "*");
