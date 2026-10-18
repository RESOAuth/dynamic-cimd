import { encodeMetadata, prepareMetadata } from "./metadata.js";

const form = document.querySelector("#generator-form");
const input = document.querySelector("#metadata-input");
const errorMessage = document.querySelector("#error-message");
const emptyState = document.querySelector("#empty-state");
const resultContent = document.querySelector("#result-content");
const readyIndicator = document.querySelector("#ready-indicator");
const resultUrl = document.querySelector("#result-url");
const responsePreview = document.querySelector("#response-preview");
const openLink = document.querySelector("#open-link");
const copyButton = document.querySelector("#copy-button");
const copyStatus = document.querySelector("#copy-status");
const localNote = document.querySelector("#local-note");
const themeToggle = document.querySelector("#theme-toggle");
const themeLabel = document.querySelector("#theme-label");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  copyStatus.textContent = "";

  try {
    const parsed = JSON.parse(input.value);
    const metadata = prepareMetadata(parsed);
    const url = new URL(`/cimd/${encodeMetadata(metadata)}`, location.origin).href;

    resultUrl.value = url;
    responsePreview.textContent = JSON.stringify({ ...metadata, client_id: url }, null, 2);
    openLink.href = url;
    emptyState.hidden = true;
    resultContent.hidden = false;
    readyIndicator.textContent = "Document ready";
    readyIndicator.classList.add("is-ready");
    localNote.hidden = location.protocol === "https:";
  } catch (error) {
    errorMessage.textContent = error instanceof SyntaxError ? "Enter a valid JSON object." : error.message;
    errorMessage.hidden = false;
    emptyState.hidden = false;
    resultContent.hidden = true;
    readyIndicator.textContent = "Ready to generate";
    readyIndicator.classList.remove("is-ready");
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultUrl.value);
    copyButton.textContent = "Copied";
    copyStatus.textContent = "URL copied to clipboard.";
    setTimeout(() => { copyButton.textContent = "Copy"; }, 2000);
  } catch {
    resultUrl.focus();
    resultUrl.select();
    copyStatus.textContent = "Select and copy the highlighted URL.";
  }
});

function updateThemeLabel() {
  const isDark = document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

themeToggle.addEventListener("click", () => {
  document.documentElement.dataset.theme = themeToggle.getAttribute("aria-pressed") === "true" ? "light" : "dark";
  updateThemeLabel();
});

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateThemeLabel);
updateThemeLabel();
