/* @section: document-initialization */
document.documentElement.classList.add("js-ready");

const article = document.querySelector(".article-body");
const searchInput = document.querySelector("#doc-search");
const searchCount = document.querySelector("#search-count");
const clearSearch = document.querySelector("#clear-search");
const copyStatus = document.querySelector("#copy-status");
const currentSection = document.querySelector("#current-section");
const backToTop = document.querySelector(".back-to-top");
const sectionLinks = [...document.querySelectorAll('[data-section]')];
const sections = [...document.querySelectorAll(".doc-section[id]")];

/* @section: article-search */
function collectTextNodes() {
  if (!article) return [];
  const nodes = [];
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest("script, style, mark, .code-toolbar")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function clearHighlights() {
  article?.querySelectorAll("mark.search-hit").forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ""));
  });
  article?.normalize();
}

function highlightSearch(rawQuery) {
  clearHighlights();
  const query = rawQuery.trim();
  if (!query) {
    searchCount.textContent = "검색어를 입력하세요";
    return;
  }

  let matches = 0;
  const nodes = collectTextNodes();
  for (const node of nodes) {
    const text = node.nodeValue;
    const lower = text.toLocaleLowerCase("ko-KR");
    const needle = query.toLocaleLowerCase("ko-KR");
    let cursor = 0;
    let index = lower.indexOf(needle, cursor);
    if (index < 0) continue;

    const fragment = document.createDocumentFragment();
    while (index >= 0) {
      fragment.append(text.slice(cursor, index));
      const mark = document.createElement("mark");
      mark.className = "search-hit";
      mark.textContent = text.slice(index, index + query.length);
      fragment.append(mark);
      matches += 1;
      cursor = index + query.length;
      index = lower.indexOf(needle, cursor);
    }
    fragment.append(text.slice(cursor));
    node.replaceWith(fragment);
  }
  searchCount.textContent = `${matches.toLocaleString("ko-KR")}개 결과`;
  article?.querySelector("mark.search-hit")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

let searchTimer;
searchInput?.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => highlightSearch(searchInput.value), 120);
});

clearSearch?.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  clearHighlights();
  searchCount.textContent = "검색어를 입력하세요";
  searchInput?.focus();
});

/* @section: keyboard-shortcuts */
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  if (event.key === "/" && !isTyping) {
    event.preventDefault();
    searchInput?.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    if (searchInput) searchInput.value = "";
    clearHighlights();
    searchCount.textContent = "검색어를 입력하세요";
    searchInput.blur();
  }
});

/* @section: active-section-tracking */
function setActiveSection(id) {
  const section = document.getElementById(id);
  const title = section?.querySelector("h2")?.textContent?.replace(/^\d+\.\s*/, "") || "";
  if (currentSection && title) currentSection.textContent = title;
  sectionLinks.forEach((link) => {
    const active = link.dataset.section === id;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) setActiveSection(visible[0].target.id);
  }, { rootMargin: "-18% 0px -70% 0px", threshold: 0 });
  sections.forEach((section) => observer.observe(section));
} else {
  setActiveSection(sections[0]?.id || "s1");
}

sectionLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const mobileToc = link.closest(".mobile-toc");
    if (mobileToc) mobileToc.removeAttribute("open");
  });
});

/* @section: code-copy */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

document.querySelectorAll(".copy-code").forEach((button) => {
  button.addEventListener("click", async () => {
    const code = button.closest(".code-block")?.querySelector("code")?.textContent || "";
    try {
      await copyText(code);
      button.textContent = "복사됨";
      button.classList.add("is-copied");
      if (copyStatus) copyStatus.textContent = "코드가 클립보드에 복사되었습니다.";
      window.setTimeout(() => {
        button.textContent = "복사";
        button.classList.remove("is-copied");
      }, 1600);
    } catch {
      button.textContent = "실패";
      if (copyStatus) copyStatus.textContent = "코드를 복사하지 못했습니다.";
    }
  });
});

/* @section: back-to-top */
function updateBackToTop() {
  backToTop?.classList.toggle("is-visible", window.scrollY > 700);
}
window.addEventListener("scroll", updateBackToTop, { passive: true });
updateBackToTop();
