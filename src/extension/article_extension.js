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
    console.log("[ArticleFrame] Received message:", event.data);
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
    }
});

// Send READY signal to parent
console.log("[ArticleFrame] Sending READY signal");
window.parent.postMessage({ type: "READY" }, "*");
