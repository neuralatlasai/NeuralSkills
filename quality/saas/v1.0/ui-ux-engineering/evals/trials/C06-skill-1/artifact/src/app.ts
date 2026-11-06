import { findGuides, type GuideResponse } from "./fake-api";

const form = document.querySelector<HTMLFormElement>("#search-form")!;
const input = document.querySelector<HTMLInputElement>("#query")!;
const outcome = document.querySelector<HTMLElement>("#outcome")!;
const heading = document.querySelector<HTMLHeadingElement>("#outcome-heading")!;
const feedback = document.querySelector<HTMLElement>("#feedback")!;
const results = document.querySelector<HTMLUListElement>("#results")!;
const retry = document.querySelector<HTMLButtonElement>("#retry")!;
let latestRequest = 0;
let submittedQuery = "";

// This fixture cannot cancel. Guard success AND failure before any UI mutation.
async function search(query: string): Promise<void> {
  const request = ++latestRequest;
  submittedQuery = query;
  outcome.dataset.state = "pending";
  results.setAttribute("aria-busy", "true");
  heading.textContent = `Searching for “${query}”`;
  // The live region stays outside aria-busy so pending is announced immediately.
  feedback.textContent = `Searching for “${query}”… You can submit another search.`;
  results.replaceChildren();
  // A Retry click moves focus to the persistent input before hiding its button.
  if (document.activeElement === retry) input.focus();
  retry.hidden = true;
  try {
    const response: GuideResponse = await findGuides(query);
    if (request !== latestRequest) return;
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
  } catch {
    if (request !== latestRequest) return;
    outcome.dataset.state = "error";
    heading.textContent = `Couldn’t load guides for “${query}”`;
    feedback.textContent = `The guide service is temporarily unavailable. Retry “${query}” or search for another topic.`;
    retry.hidden = false;
  } finally {
    if (request === latestRequest) results.setAttribute("aria-busy", "false");
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const query = input.value.trim();
  if (query) void search(query);
});
retry.addEventListener("click", () => void search(submittedQuery));
