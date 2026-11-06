(function(){"use strict";const modules={"./fake-api": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGuides = findGuides;
// Deliberately no AbortSignal: consumers must guard every resolution/rejection.
function findGuides(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    const delay = query === "cedar" ? 1200 : query === "moss" ? 180 : query === "fail" ? 650 : 300;
    return new Promise((resolve, reject) => {
        window.setTimeout(() => {
            if (query === "fail") {
                reject(new Error("The field guide service is temporarily unavailable."));
                return;
            }
            const guides = query === "empty" ? [] : query === "moss" ? [
                { id: "moss-1", title: "Mosses of the rain-soaked northern woodland", habitat: "Woodland", pages: 84 },
                { id: "moss-2", title: "Pocket guide to urban moss", habitat: "Urban", pages: 46 }
            ] : query === "cedar" ? [
                { id: "cedar-1", title: "Cedar trails and their seasonal wildlife", habitat: "Forest", pages: 112 }
            ] : [
                { id: "general-1", title: "An introduction to field observation", habitat: "Mixed", pages: 64 }
            ];
            resolve({ query, guides });
        }, delay);
    });
}

},
"./app": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fake_api_1 = require("./fake-api");
const form = document.querySelector("#search-form");
const input = document.querySelector("#query");
const outcome = document.querySelector("#outcome");
const heading = document.querySelector("#outcome-heading");
const feedback = document.querySelector("#feedback");
const results = document.querySelector("#results");
const retry = document.querySelector("#retry");
let latestRequest = 0;
let submittedQuery = "";
// This fixture cannot cancel. Guard success AND failure before any UI mutation.
async function search(query) {
    const request = ++latestRequest;
    submittedQuery = query;
    outcome.dataset.state = "pending";
    results.setAttribute("aria-busy", "true");
    heading.textContent = `Searching for “${query}”`;
    // The live region stays outside aria-busy so pending is announced immediately.
    feedback.textContent = `Searching for “${query}”… You can submit another search.`;
    results.replaceChildren();
    // A Retry click moves focus to the persistent input before hiding its button.
    if (document.activeElement === retry)
        input.focus();
    retry.hidden = true;
    try {
        const response = await (0, fake_api_1.findGuides)(query);
        if (request !== latestRequest)
            return;
        outcome.dataset.state = response.guides.length ? "success" : "empty";
        heading.textContent = `Guides for “${response.query}”`;
        feedback.textContent = response.guides.length
            ? `${response.guides.length} ${response.guides.length === 1 ? "guide" : "guides"} found for “${response.query}”.`
            : `No guides found for “${response.query}”. Try a broader topic, such as moss or cedar.`;
        for (const guide of response.guides) {
            const item = document.createElement("li");
            const title = document.createElement("h3");
            title.textContent = guide.title;
            const meta = document.createElement("p");
            meta.className = "meta";
            for (const text of [guide.habitat, `${guide.pages} pages`]) {
                const span = document.createElement("span");
                span.textContent = text;
                meta.append(span);
            }
            item.append(title, meta);
            results.append(item);
        }
    }
    catch {
        if (request !== latestRequest)
            return;
        outcome.dataset.state = "error";
        heading.textContent = `Couldn’t load guides for “${query}”`;
        feedback.textContent = `The guide service is temporarily unavailable. Retry “${query}” or search for another topic.`;
        retry.hidden = false;
    }
    finally {
        if (request === latestRequest)
            results.setAttribute("aria-busy", "false");
    }
}
form.addEventListener("submit", event => {
    event.preventDefault();
    const query = input.value.trim();
    if (query)
        void search(query);
});
retry.addEventListener("click", () => void search(submittedQuery));

}};const cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](module,module.exports,require);return module.exports;}require("./app");})();
