import * as pdfjsLib from "./vendor/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.min.mjs", import.meta.url).href;

const STORAGE_KEY = "resume-layout-editor-v2-blank";
const LAYOUT_KEY = "resume-layout-editor-layout-v1";
const LEGACY_STORAGE_KEYS = ["resume-layout-editor-v1"];
const OCR_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js";
const OCR_IMAGE_LIMIT = 20;
const OCR_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const allowedModuleTypes = new Set(["text", "list", "metrics", "experience", "images"]);
const allowedStyles = new Set(["classic", "sidebar", "compact"]);
const allowedPalettes = new Set(["coffee", "cobalt", "graphite"]);
const metricIconNames = new Set(["wallet", "flask", "store", "play", "users", "trend"]);
const defaultMetricIcons = ["wallet", "flask", "store", "play", "users", "trend"];
const metricIconLabels = {
  wallet: "客单价",
  flask: "新品研发",
  store: "门店营收",
  play: "内容播放",
  users: "粉丝增长",
  trend: "转化提升",
};

const defaultState = {
  avatar: { src: "", shape: "circle", size: 92 },
  basics: {
    name: "",
    title: "",
    phone: "",
    email: "",
    education: "",
  },
  modules: [
    {
      id: "summary",
      type: "list",
      title: "核心能力",
      enabled: true,
      options: { titleVisible: true, emphasis: "standard", spacing: "standard", columns: 3, bulletStyle: "dot" },
      items: [],
    },
    {
      id: "metrics",
      type: "metrics",
      title: "关键成果",
      enabled: true,
      options: { titleVisible: true, emphasis: "strong", spacing: "standard", columns: 3, bulletStyle: "dot" },
      items: [],
    },
    {
      id: "experience",
      type: "experience",
      title: "工作经历",
      enabled: true,
      options: { titleVisible: true, emphasis: "standard", spacing: "standard", columns: 3, bulletStyle: "dot" },
      items: [],
    },
    {
      id: "images",
      type: "images",
      title: "作品图片",
      enabled: false,
      options: { titleVisible: true, emphasis: "quiet", spacing: "standard", columns: 3, bulletStyle: "dot" },
      items: [],
    },
  ],
  sourceText: "",
  jobText: "",
  jobTips: [],
  settings: { fontScale: "1", density: "comfortable", style: "classic", palette: "coffee" },
};

LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

const elements = {
  saveState: document.querySelector("#saveState"),
  resumeFile: document.querySelector("#resumeFile"),
  fileDrop: document.querySelector("#fileDrop"),
  fileStatus: document.querySelector("#fileStatus"),
  resumeText: document.querySelector("#resumeText"),
  jobText: document.querySelector("#jobText"),
  jobOcrButton: document.querySelector("#jobOcrButton"),
  jobImageFiles: document.querySelector("#jobImageFiles"),
  jobOcrStatus: document.querySelector("#jobOcrStatus"),
  gptFlowButton: document.querySelector("#gptFlowButton"),
  mobileGptButton: document.querySelector("#mobileGptButton"),
  exportButton: document.querySelector("#exportButton"),
  fontScale: document.querySelector("#fontScale"),
  density: document.querySelector("#density"),
  resumeStyle: document.querySelector("#resumeStyle"),
  resumePalette: document.querySelector("#resumePalette"),
  paletteSwatches: document.querySelector("#paletteSwatches"),
  paperViewport: document.querySelector(".paper-viewport"),
  workbench: document.querySelector(".workbench"),
  sourceResizer: document.querySelector("#sourceResizer"),
  editorResizer: document.querySelector("#editorResizer"),
  resumePrintRoot: document.querySelector("#resumePrintRoot"),
  pixelGenerate: document.querySelector("#pixelGenerate"),
  pixelGenerateGrid: document.querySelector("#pixelGenerateGrid"),
  pixelGenerateTitle: document.querySelector("#pixelGenerateTitle"),
  pixelGenerateStatus: document.querySelector("#pixelGenerateStatus"),
  pageIndicator: document.querySelector("#pageIndicator"),
  jobTipsCard: document.querySelector("#jobTipsCard"),
  jobTipsToggle: document.querySelector("#jobTipsToggle"),
  jobTipsBody: document.querySelector("#jobTipsBody"),
  jobTipsCount: document.querySelector("#jobTipsCount"),
  jobTipsContent: document.querySelector("#jobTipsContent"),
  refreshTipsButton: document.querySelector("#refreshTipsButton"),
  basicName: document.querySelector("#basicName"),
  basicTitle: document.querySelector("#basicTitle"),
  basicPhone: document.querySelector("#basicPhone"),
  basicEmail: document.querySelector("#basicEmail"),
  basicEducation: document.querySelector("#basicEducation"),
  avatarPreview: document.querySelector("#avatarPreview"),
  avatarUploadButton: document.querySelector("#avatarUploadButton"),
  avatarUpload: document.querySelector("#avatarUpload"),
  avatarStatus: document.querySelector("#avatarStatus"),
  avatarShape: document.querySelector("#avatarShape"),
  avatarSize: document.querySelector("#avatarSize"),
  avatarSizeValue: document.querySelector("#avatarSizeValue"),
  removeAvatarButton: document.querySelector("#removeAvatarButton"),
  sortByJobButton: document.querySelector("#sortByJobButton"),
  sortStatus: document.querySelector("#sortStatus"),
  addModuleButton: document.querySelector("#addModuleButton"),
  resetButton: document.querySelector("#resetButton"),
  panelUndoButton: document.querySelector("#panelUndoButton"),
  modulePanel: document.querySelector(".module-panel"),
  basicsEditor: document.querySelector(".basics-editor"),
  moduleList: document.querySelector("#moduleList"),
  editorEmpty: document.querySelector("#editorEmpty"),
  editorFields: document.querySelector("#editorFields"),
  moduleTitleInput: document.querySelector("#moduleTitleInput"),
  moduleContentInput: document.querySelector("#moduleContentInput"),
  moduleFormatHint: document.querySelector("#moduleFormatHint"),
  moduleTitleVisible: document.querySelector("#moduleTitleVisible"),
  moduleMetricIconsVisible: document.querySelector("#moduleMetricIconsVisible"),
  moduleMetricIconsField: document.querySelector("#moduleMetricIconsField"),
  moduleEmphasis: document.querySelector("#moduleEmphasis"),
  moduleSpacing: document.querySelector("#moduleSpacing"),
  moduleColumns: document.querySelector("#moduleColumns"),
  moduleColumnsField: document.querySelector("#moduleColumnsField"),
  moduleBulletStyle: document.querySelector("#moduleBulletStyle"),
  moduleBulletField: document.querySelector("#moduleBulletField"),
  structuredEditor: document.querySelector("#structuredEditor"),
  bulkEditor: document.querySelector("#bulkEditor"),
  duplicateModuleButton: document.querySelector("#duplicateModuleButton"),
  deleteModuleButton: document.querySelector("#deleteModuleButton"),
  imageEditor: document.querySelector("#imageEditor"),
  imageUpload: document.querySelector("#imageUpload"),
  imageList: document.querySelector("#imageList"),
  gptDialog: document.querySelector("#gptDialog"),
  promptOutput: document.querySelector("#promptOutput"),
  copyPromptButton: document.querySelector("#copyPromptButton"),
  gptResponseInput: document.querySelector("#gptResponseInput"),
  gptParseStatus: document.querySelector("#gptParseStatus"),
  gptReviewSection: document.querySelector("#gptReviewSection"),
  gptReviewSummary: document.querySelector("#gptReviewSummary"),
  gptDiffList: document.querySelector("#gptDiffList"),
  selectSafeChangesButton: document.querySelector("#selectSafeChangesButton"),
  clearGptChangesButton: document.querySelector("#clearGptChangesButton"),
  applyGptButton: document.querySelector("#applyGptButton"),
  preflightDialog: document.querySelector("#preflightDialog"),
  preflightSummary: document.querySelector("#preflightSummary"),
  preflightList: document.querySelector("#preflightList"),
  confirmExportButton: document.querySelector("#confirmExportButton"),
  undoBar: document.querySelector("#undoBar"),
  undoMessage: document.querySelector("#undoMessage"),
  undoButton: document.querySelector("#undoButton"),
};

let state = loadState();
let selectedModuleId = state.modules[0]?.id ?? null;
let draggedModuleId = null;
let undoState = null;
let undoTimer = null;
let saveTimer = null;
let pendingGptReview = null;
let resumeFitScale = 1;
let layoutWidths = loadLayoutWidths();
let ocrLibraryPromise = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadLayoutWidths() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY));
    return {
      source: Number.isFinite(saved?.source) ? saved.source : null,
      editor: Number.isFinite(saved?.editor) ? saved.editor : null,
    };
  } catch {
    return { source: null, editor: null };
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.basics && Array.isArray(saved.modules)) {
      return normalizeState(saved);
    }
  } catch (error) {
    console.warn("无法读取本地草稿，将使用空白模板。", error);
  }
  return clone(defaultState);
}

function normalizeState(input) {
  const normalized = clone(defaultState);
  normalized.avatar = {
    src: typeof input.avatar?.src === "string" && input.avatar.src.startsWith("data:image/") ? input.avatar.src : "",
    shape: input.avatar?.shape === "rounded" ? "rounded" : "circle",
    size: Math.min(136, Math.max(64, Number(input.avatar?.size) || 92)),
  };
  normalized.basics = { ...normalized.basics, ...(input.basics ?? {}) };
  normalized.modules = normalizeModules(input.modules);
  normalized.sourceText = typeof input.sourceText === "string" ? input.sourceText : normalized.sourceText;
  normalized.jobText = typeof input.jobText === "string" ? input.jobText : "";
  normalized.jobTips = Array.isArray(input.jobTips) ? input.jobTips.map((tip) => ({
    kind: ["case", "knowledge", "risk"].includes(tip?.kind) ? tip.kind : "case",
    topic: String(tip?.topic || tip?.label || "重点问题").slice(0, 60),
    why: String(tip?.why || "面试官可能借此判断岗位胜任度。").slice(0, 240),
    questions: (Array.isArray(tip?.questions) ? tip.questions : tip?.text ? [tip.text] : []).map((item) => String(item).slice(0, 240)).filter(Boolean).slice(0, 3),
    prepare: (Array.isArray(tip?.prepare) ? tip.prepare : []).map((item) => String(item).slice(0, 180)).filter(Boolean).slice(0, 4),
    answer: normalizeReferenceAnswer(tip?.answer || tip?.referenceAnswer).slice(0, 600),
    advice: (Array.isArray(tip?.advice) ? tip.advice : Array.isArray(tip?.answerAdvice) ? tip.answerAdvice : []).map((item) => String(item).slice(0, 180)).filter(Boolean).slice(0, 4),
    industryNotes: (Array.isArray(tip?.industryNotes) ? tip.industryNotes : []).map((item) => String(item).slice(0, 220)).filter(Boolean).slice(0, 4),
  })).filter((tip) => tip.questions.length || tip.prepare.length || tip.answer || tip.advice.length || tip.industryNotes.length).slice(0, 5) : [];
  normalized.settings = { ...normalized.settings, ...(input.settings ?? {}) };
  normalized.settings.style = allowedStyles.has(normalized.settings.style) ? normalized.settings.style : "classic";
  normalized.settings.palette = allowedPalettes.has(normalized.settings.palette) ? normalized.settings.palette : "coffee";
  return normalized;
}

function normalizeReferenceAnswer(value) {
  return String(value || "").replace(/_{4,}/g, "__通用参考内容__");
}

function normalizeModuleOptions(type, input) {
  const emphasis = ["standard", "strong", "quiet"].includes(input?.emphasis) ? input.emphasis : "standard";
  const spacing = ["tight", "standard", "loose"].includes(input?.spacing) ? input.spacing : "standard";
  const bulletStyle = ["dot", "line", "none"].includes(input?.bulletStyle) ? input.bulletStyle : "dot";
  const columns = [2, 3].includes(Number(input?.columns)) ? Number(input.columns) : (type === "metrics" || type === "images" ? 3 : 2);
  return {
    titleVisible: input?.titleVisible !== false,
    metricIconsVisible: input?.metricIconsVisible !== false,
    emphasis,
    spacing,
    columns,
    bulletStyle,
  };
}

function normalizeModules(modules) {
  const ids = new Set();
  return (Array.isArray(modules) ? modules : [])
    .map((module, index) => {
      const type = allowedModuleTypes.has(module?.type) ? module.type : "list";
      let id = String(module?.id || `module-${Date.now()}-${index}`).replace(/[^a-zA-Z0-9-_]/g, "-");
      while (ids.has(id)) id = `${id}-${index + 1}`;
      ids.add(id);
      return {
        id,
        type,
        title: String(module?.title || "未命名模块").slice(0, 60),
        enabled: module?.enabled !== false,
        options: normalizeModuleOptions(type, module?.options),
        items: normalizeItems(type, module?.items),
      };
    })
    .filter(Boolean);
}

function normalizeItems(type, items) {
  if (!Array.isArray(items)) return [];
  if (type === "metrics") {
    return items.map((item, index) => ({
      value: String(item?.value ?? "").slice(0, 30),
      label: String(item?.label ?? "").slice(0, 100),
      icon: metricIconNames.has(item?.icon) ? item.icon : defaultMetricIcons[index % defaultMetricIcons.length],
    })).filter((item) => item.value || item.label);
  }
  if (type === "experience") {
    return items.map((item) => ({
      company: String(item?.company ?? "").slice(0, 100),
      role: String(item?.role ?? "").slice(0, 100),
      date: String(item?.date ?? "").slice(0, 40),
      bullets: (Array.isArray(item?.bullets) ? item.bullets : []).map((bullet) => String(bullet).slice(0, 280)).filter(Boolean),
    })).filter((item) => item.company || item.role || item.bullets.length);
  }
  if (type === "images") {
    return items.map((item) => ({
      src: String(item?.src ?? ""),
      caption: String(item?.caption ?? "").slice(0, 100),
    })).filter((item) => item.src.startsWith("data:image/") || item.src.startsWith("./assets/"));
  }
  return items.map((item) => String(item ?? "").slice(0, 320)).filter(Boolean);
}

function scheduleSave() {
  elements.saveState.textContent = "正在保存…";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      elements.saveState.textContent = "已保存在本机";
    } catch (error) {
      elements.saveState.textContent = "本机空间不足，图片未保存";
      console.warn("无法保存本地草稿。", error);
    }
  }, 180);
}

function renderAll() {
  syncFormFromState();
  renderJobTips();
  renderModuleList();
  renderModuleEditor();
  renderResume();
  scheduleSave();
}

function syncFormFromState() {
  elements.resumeText.value = state.sourceText;
  elements.jobText.value = state.jobText;
  elements.fontScale.value = state.settings.fontScale;
  elements.density.value = state.settings.density;
  elements.resumeStyle.value = state.settings.style;
  elements.resumePalette.value = state.settings.palette;
  elements.paletteSwatches.dataset.palette = state.settings.palette;
  elements.basicName.value = state.basics.name;
  elements.basicTitle.value = state.basics.title;
  elements.basicPhone.value = state.basics.phone;
  elements.basicEmail.value = state.basics.email;
  elements.basicEducation.value = state.basics.education;
  elements.avatarShape.value = state.avatar.shape;
  elements.avatarSize.value = String(state.avatar.size);
  elements.avatarSizeValue.value = `${state.avatar.size} px`;
  elements.avatarPreview.style.setProperty("--avatar-editor-size", `${Math.min(112, state.avatar.size)}px`);
  elements.removeAvatarButton.disabled = !state.avatar.src;
  elements.avatarUploadButton.textContent = state.avatar.src ? "更换头像" : "选择头像";
  elements.avatarPreview.setAttribute("aria-label", state.avatar.src ? "更换头像" : "插入头像");
  elements.avatarPreview.dataset.shape = state.avatar.shape;
  elements.avatarPreview.replaceChildren();
  if (state.avatar.src) {
    const image = document.createElement("img");
    image.src = state.avatar.src;
    image.alt = "当前头像预览";
    elements.avatarPreview.append(image);
  } else {
    elements.avatarPreview.append(create("span", "", "点击插入头像"));
  }
}

function create(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildResumeHeader() {
  const header = create("header", "resume-header");
  header.tabIndex = 0;
  header.setAttribute("role", "button");
  header.setAttribute("aria-label", "编辑基本信息");
  const identity = create("div", "resume-identity");
  identity.append(create("h1", "resume-name", state.basics.name || "姓名"));
  identity.append(create("p", "resume-title", state.basics.title || "目标职位"));
  const contact = create("div", "resume-contact");
  [state.basics.phone, state.basics.email, state.basics.education].filter(Boolean).forEach((value) => contact.append(create("span", "", value)));
  identity.append(contact);
  header.append(identity);
  if (state.avatar.src) {
    const portrait = create("figure", "resume-avatar");
    portrait.dataset.shape = state.avatar.shape;
    const image = document.createElement("img");
    image.src = state.avatar.src;
    image.alt = `${state.basics.name || "候选人"}的头像`;
    portrait.append(image);
    header.append(portrait);
  }
  return header;
}

function moduleHasContent(module) {
  if (module.type === "metrics") return module.items.some((item) => item.value.trim() || item.label.trim());
  if (module.type === "experience") return module.items.some((item) => item.company.trim() || item.role.trim() || item.date.trim() || item.bullets.some((bullet) => bullet.trim()));
  if (module.type === "images") return module.items.some((item) => item.src);
  return module.items.some((item) => String(item).trim());
}

function createMetricIcon(iconName) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("metric-icon");

  const definitions = {
    wallet: [
      ["rect", { x: "2", y: "5", width: "20", height: "14", rx: "2" }],
      ["path", { d: "M16 11h6v4h-6a2 2 0 0 1 0-4Z" }],
      ["path", { d: "M2 9h16" }],
    ],
    flask: [
      ["path", { d: "M9 3h6" }],
      ["path", { d: "M10 3v5l-5.5 9.2A2.5 2.5 0 0 0 6.7 21h10.6a2.5 2.5 0 0 0 2.2-3.8L14 8V3" }],
      ["path", { d: "M7.5 16h9" }],
    ],
    store: [
      ["path", { d: "M4 10v11h16V10" }],
      ["path", { d: "M3 10l2-7h14l2 7" }],
      ["path", { d: "M8 21v-6h8v6" }],
      ["path", { d: "M3 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0" }],
    ],
    play: [
      ["circle", { cx: "12", cy: "12", r: "9" }],
      ["path", { d: "m10 8 6 4-6 4Z" }],
    ],
    users: [
      ["circle", { cx: "9", cy: "8", r: "3" }],
      ["path", { d: "M3 20c0-4 2.5-6 6-6s6 2 6 6" }],
      ["path", { d: "M16 5a3 3 0 0 1 0 6" }],
      ["path", { d: "M18 14c2 .7 3 2.7 3 6" }],
    ],
    trend: [
      ["path", { d: "m3 17 6-6 4 4 8-8" }],
      ["path", { d: "M15 7h6v6" }],
    ],
  };

  (definitions[iconName] || definitions.trend).forEach(([tag, attributes]) => {
    const node = document.createElementNS(namespace, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    svg.append(node);
  });
  return svg;
}

function renderResumeModule(module) {
  const options = normalizeModuleOptions(module.type, module.options);
  const section = create("section", "resume-module");
  section.dataset.moduleId = module.id;
  section.dataset.type = module.type;
  section.dataset.emphasis = options.emphasis;
  section.dataset.spacing = options.spacing;
  section.dataset.bullets = options.bulletStyle;
  section.tabIndex = 0;
  section.setAttribute("role", "button");
  section.setAttribute("aria-label", `编辑${module.title}`);
  section.style.setProperty("--module-columns", options.columns);
  if (options.titleVisible) section.append(create("h2", "", module.title));

  if (module.type === "metrics") {
    const grid = create("div", "metric-grid");
    grid.classList.toggle("is-iconless", !options.metricIconsVisible);
    const metricColumns = module.items.length <= 4 ? Math.max(1, module.items.length) : Math.ceil(module.items.length / 2);
    grid.classList.toggle("is-two-row", module.items.length > 4);
    grid.style.setProperty("--metric-columns", metricColumns);
    module.items.forEach((item) => {
      const metric = create("div", "metric-item");
      const copy = create("div", "metric-copy");
      copy.append(create("span", "metric-value", item.value));
      copy.append(create("span", "metric-label", item.label));
      if (options.metricIconsVisible) metric.append(createMetricIcon(item.icon));
      metric.append(copy);
      grid.append(metric);
    });
    section.append(grid);
  } else if (module.type === "experience") {
    const list = create("div", "experience-list");
    module.items.forEach((item) => {
      const entry = create("section", "experience-item");
      const heading = create("div", "experience-heading");
      const identity = create("div", "");
      identity.append(create("span", "experience-company", item.company));
      if (item.role) identity.append(document.createTextNode(" · "), create("span", "experience-role", item.role));
      heading.append(identity, create("time", "experience-date", item.date));
      entry.append(heading);
      const bullets = create("ul", "resume-list");
      item.bullets.forEach((bullet) => bullets.append(create("li", "", bullet)));
      entry.append(bullets);
      list.append(entry);
    });
    section.append(list);
  } else if (module.type === "images") {
    const grid = create("div", "image-grid");
    module.items.forEach((item) => {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.caption || "作品图片";
      figure.append(image);
      if (item.caption) figure.append(create("figcaption", "", item.caption));
      grid.append(figure);
    });
    section.append(grid);
  } else {
    const list = create("ul", "resume-list");
    module.items.forEach((item) => list.append(create("li", "", item)));
    section.append(list);
  }
  return section;
}

function renderResume() {
  const root = elements.resumePrintRoot;
  root.replaceChildren();
  const content = create("div", "resume-content");
  root.append(content);
  root.style.setProperty("--resume-scale", state.settings.fontScale);
  root.style.setProperty("--resume-avatar-size", `${state.avatar.size}px`);
  root.dataset.density = state.settings.density;
  root.dataset.style = state.settings.style;
  root.dataset.palette = state.settings.palette;

  const enabledModules = state.modules.filter((module) => module.enabled && moduleHasContent(module));
  const hasBasicContent = Object.values(state.basics).some((value) => value.trim()) || state.avatar.src;
  if (!hasBasicContent && !enabledModules.length) {
    const emptyState = create("div", "resume-empty-state");
    emptyState.append(
      create("strong", "", "从右侧开始填写"),
      create("p", "", "也可以先上传 PDF、TXT 或图片，再逐项整理成 A4 简历。"),
    );
    content.append(emptyState);
    requestAnimationFrame(fitResumeToOnePage);
    return;
  }
  if (state.settings.style === "sidebar") {
    const layout = create("div", "resume-layout resume-layout--sidebar");
    const sidebar = create("aside", "resume-sidebar");
    const main = create("div", "resume-main");
    if (hasBasicContent) sidebar.append(buildResumeHeader());
    enabledModules.forEach((module) => {
      const target = module.id === "summary" ? sidebar : main;
      target.append(renderResumeModule(module));
    });
    if (!main.children.length) main.append(create("p", "resume-empty", "请在右侧开启至少一个主要内容模块。"));
    layout.append(sidebar, main);
    content.append(layout);
  } else {
    if (hasBasicContent) content.append(buildResumeHeader());
    enabledModules.forEach((module) => content.append(renderResumeModule(module)));
  }

  const selectedPreviewModule = [...root.querySelectorAll("[data-module-id]")]
    .find((node) => node.dataset.moduleId === selectedModuleId);
  selectedPreviewModule?.classList.add("is-preview-selected");

  requestAnimationFrame(fitResumeToOnePage);
}

function fitResumeToOnePage() {
  const root = elements.resumePrintRoot;
  const content = root.querySelector(".resume-content");
  if (!content) return updatePreviewSize();
  root.style.setProperty("--fit-scale", "1");
  const contentHeight = Math.max(1, content.scrollHeight);
  resumeFitScale = Math.max(0.72, Math.min(1, (1123 - 128) / contentHeight));
  root.style.setProperty("--fit-scale", resumeFitScale.toFixed(3));
  root.classList.toggle("is-auto-fitted", resumeFitScale < 0.995);
  updatePreviewSize();
}

function updatePreviewSize() {
  const viewportWidth = elements.paperViewport.clientWidth;
  const rawHeight = 1123;
  const widthScale = viewportWidth / 794;
  const isDesktopWorkbench = window.matchMedia("(min-width: 70rem)").matches;
  const heightScale = isDesktopWorkbench ? Math.max(0.28, (elements.paperViewport.clientHeight - 8) / rawHeight) : 1;
  const scale = Math.min(1, Math.max(0.28, widthScale), heightScale);
  elements.paperViewport.style.setProperty("--preview-scale", scale.toFixed(3));
  if (!isDesktopWorkbench) elements.paperViewport.style.height = `${Math.ceil(rawHeight * scale + 8)}px`;
  const fitPercent = Math.round(resumeFitScale * 100);
  const contentHeight = elements.resumePrintRoot.querySelector(".resume-content")?.scrollHeight || 0;
  const stillOverflowing = contentHeight * resumeFitScale > 995;
  elements.pageIndicator.textContent = stillOverflowing
    ? `1 页 · ${fitPercent}% · 超量裁切`
    : resumeFitScale < 0.995 ? `1 页 · 自动 ${fitPercent}%` : "1 页";
  elements.pageIndicator.title = stillOverflowing
    ? `预计导出 1 页；内容已压缩至可读下限 ${fitPercent}%，超出内容将裁切`
    : resumeFitScale < 0.995 ? `预计导出 1 页；内容已自动压缩至 ${fitPercent}%` : "预计导出 1 页";
  elements.pageIndicator.classList.toggle("is-fitted", resumeFitScale < 0.995);
}

function moduleSearchText(module) {
  if (module.type === "metrics") return module.items.map((item) => `${item.value} ${item.label}`).join(" ");
  if (module.type === "experience") return module.items.map((item) => `${item.company} ${item.role} ${item.date} ${item.bullets.join(" ")}`).join(" ");
  if (module.type === "images") return module.items.map((item) => item.caption).join(" ");
  return module.items.join(" ");
}

function renderModuleList() {
  elements.moduleList.replaceChildren();
  const keywords = extractKeywords(state.jobText);
  state.modules.forEach((module, index) => {
    const row = create("li", `module-row${module.id === selectedModuleId ? " is-selected" : ""}`);
    row.draggable = true;
    row.dataset.moduleId = module.id;
    row.tabIndex = 0;
    row.setAttribute("aria-label", `${module.title}，第 ${index + 1} 个模块`);

    const handle = create("span", "module-row__handle", "⠿");
    handle.setAttribute("aria-hidden", "true");
    const selectButton = create("button", "module-row__select", module.title);
    selectButton.type = "button";
    selectButton.addEventListener("click", () => selectModule(module.id));

    const score = scoreText(moduleSearchText(module), keywords);
    const scoreLabel = create("span", "module-row__score", state.jobText.trim() ? `相关度 ${score}` : moduleTypeLabel(module.type));

    const moves = create("span", "module-row__moves");
    const up = create("button", "move-button", "↑");
    up.type = "button";
    up.setAttribute("aria-label", `上移${module.title}`);
    up.disabled = index === 0;
    up.addEventListener("click", () => moveModule(index, index - 1));
    const down = create("button", "move-button", "↓");
    down.type = "button";
    down.setAttribute("aria-label", `下移${module.title}`);
    down.disabled = index === state.modules.length - 1;
    down.addEventListener("click", () => moveModule(index, index + 1));
    moves.append(up, down);

    const switchLabel = create("label", "switch");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = module.enabled;
    checkbox.setAttribute("aria-label", `${module.enabled ? "隐藏" : "显示"}${module.title}`);
    checkbox.addEventListener("change", () => {
      module.enabled = checkbox.checked;
      renderAll();
    });
    switchLabel.append(checkbox, create("span", "switch__track"));

    row.append(handle, selectButton, scoreLabel, moves, switchLabel);
    bindDragEvents(row);
    row.addEventListener("keydown", (event) => {
      if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      moveModule(index, index + (event.key === "ArrowUp" ? -1 : 1));
      requestAnimationFrame(() => elements.moduleList.children[Math.max(0, Math.min(state.modules.length - 1, index + (event.key === "ArrowUp" ? -1 : 1)))]?.focus());
    });
    elements.moduleList.append(row);
  });
}

function moduleTypeLabel(type) {
  return ({ text: "文本", list: "列表", metrics: "数据", experience: "经历", images: "图片" })[type] ?? "模块";
}

function bindDragEvents(row) {
  row.addEventListener("dragstart", () => {
    draggedModuleId = row.dataset.moduleId;
    row.classList.add("is-dragging");
  });
  row.addEventListener("dragend", () => {
    draggedModuleId = null;
    row.classList.remove("is-dragging");
  });
  row.addEventListener("dragover", (event) => event.preventDefault());
  row.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedModuleId || draggedModuleId === row.dataset.moduleId) return;
    const from = state.modules.findIndex((module) => module.id === draggedModuleId);
    const to = state.modules.findIndex((module) => module.id === row.dataset.moduleId);
    moveModule(from, to);
  });
}

function moveModule(from, to) {
  if (from < 0 || to < 0 || from >= state.modules.length || to >= state.modules.length || from === to) return;
  showUndo(`已调整“${state.modules[from].title}”的位置`);
  const [moved] = state.modules.splice(from, 1);
  state.modules.splice(to, 0, moved);
  renderAll();
}

function selectModule(id) {
  selectedModuleId = id;
  renderModuleList();
  renderModuleEditor();
}

function selectModuleFromPreview(id) {
  if (!state.modules.some((module) => module.id === id)) return;
  selectModule(id);
  elements.resumePrintRoot.querySelectorAll(".resume-module.is-preview-selected").forEach((node) => node.classList.remove("is-preview-selected"));
  const previewModule = elements.resumePrintRoot.querySelector(`[data-module-id="${CSS.escape(id)}"]`);
  previewModule?.classList.add("is-preview-selected");
  requestAnimationFrame(() => {
    if (window.matchMedia("(min-width: 70rem)").matches) elements.modulePanel.scrollTo({ top: Math.max(0, elements.editorFields.offsetTop - 84), behavior: "smooth" });
    else elements.editorFields.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.moduleTitleInput.focus({ preventScroll: true });
  });
}

function selectBasicsFromPreview() {
  elements.resumePrintRoot.querySelectorAll(".is-preview-selected").forEach((node) => node.classList.remove("is-preview-selected"));
  elements.resumePrintRoot.querySelector(".resume-header")?.classList.add("is-preview-selected");
  if (window.matchMedia("(min-width: 70rem)").matches) elements.modulePanel.scrollTo({ top: Math.max(0, elements.basicsEditor.offsetTop - 84), behavior: "smooth" });
  else elements.basicsEditor.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => elements.basicName.focus({ preventScroll: true }), 220);
}

function renderModuleEditor() {
  const module = state.modules.find((item) => item.id === selectedModuleId);
  elements.editorEmpty.hidden = Boolean(module);
  elements.editorFields.hidden = !module;
  if (!module) return;

  module.options = normalizeModuleOptions(module.type, module.options);
  elements.moduleTitleInput.value = module.title;
  elements.imageEditor.hidden = module.type !== "images";
  elements.bulkEditor.hidden = module.type === "images";
  elements.moduleTitleVisible.checked = module.options.titleVisible;
  elements.moduleMetricIconsVisible.checked = module.options.metricIconsVisible;
  elements.moduleMetricIconsField.hidden = module.type !== "metrics";
  elements.moduleEmphasis.value = module.options.emphasis;
  elements.moduleSpacing.value = module.options.spacing;
  elements.moduleColumns.value = String(module.options.columns);
  elements.moduleColumnsField.hidden = module.type !== "images";
  elements.moduleBulletStyle.value = module.options.bulletStyle;
  elements.moduleBulletField.hidden = !["text", "list", "experience"].includes(module.type);
  elements.moduleContentInput.value = serializeModuleContent(module);
  elements.moduleFormatHint.textContent = moduleFormatHint(module.type);
  renderStructuredEditor(module);
  renderImageEditor(module);
}

function serializeModuleContent(module) {
  if (module.type === "metrics") return module.items.map((item) => `${item.value} | ${item.label}`).join("\n");
  if (module.type === "experience") {
    return module.items.map((item) => `[[${item.company} | ${item.role} | ${item.date}]]\n${item.bullets.map((bullet) => `- ${bullet}`).join("\n")}`).join("\n\n");
  }
  if (module.type === "images") return "";
  return module.items.join("\n");
}

function moduleFormatHint(type) {
  if (type === "metrics") return "每行一项：数值 | 说明";
  if (type === "experience") return "经历头写作 [[公司 | 职位 | 时间]]，要点每行以 - 开头。";
  return "每行是一条内容；空行会被忽略。";
}

function parseModuleContent(type, text) {
  if (type === "metrics") {
    return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [value, ...labelParts] = line.split("|");
      return { value: value.trim(), label: labelParts.join("|").trim() };
    }).filter((item) => item.value || item.label);
  }
  if (type === "experience") {
    const items = [];
    let current = null;
    text.split("\n").forEach((rawLine) => {
      const line = rawLine.trim();
      const heading = line.match(/^\[\[(.*?)\]\]$/);
      if (heading) {
        const [company = "", role = "", date = ""] = heading[1].split("|").map((part) => part.trim());
        current = { company, role, date, bullets: [] };
        items.push(current);
      } else if (line && current) {
        current.bullets.push(line.replace(/^[-•]\s*/, ""));
      }
    });
    return items;
  }
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

function syncBulkEditor(module) {
  if (module.type !== "images") elements.moduleContentInput.value = serializeModuleContent(module);
}

function refreshSelectedModule(module) {
  syncBulkEditor(module);
  renderStructuredEditor(module);
  renderResume();
  scheduleSave();
}

function moveItem(items, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return;
  const [moved] = items.splice(index, 1);
  items.splice(target, 0, moved);
}

function createItemActions(label, items, index, onChange) {
  const actions = create("div", "item-actions");
  const up = create("button", "move-button", "↑");
  up.type = "button";
  up.disabled = index === 0;
  up.setAttribute("aria-label", `上移${label}`);
  up.addEventListener("click", () => {
    showUndo(`已上移${label}`);
    moveItem(items, index, -1);
    onChange();
  });
  const down = create("button", "move-button", "↓");
  down.type = "button";
  down.disabled = index === items.length - 1;
  down.setAttribute("aria-label", `下移${label}`);
  down.addEventListener("click", () => {
    showUndo(`已下移${label}`);
    moveItem(items, index, 1);
    onChange();
  });
  const remove = create("button", "item-remove", "移除");
  remove.type = "button";
  remove.setAttribute("aria-label", `移除${label}`);
  remove.addEventListener("click", () => {
    showUndo(`已移除${label}`);
    items.splice(index, 1);
    onChange();
  });
  actions.append(up, down, remove);
  return actions;
}

function fieldWithInput(labelText, value, onInput, options = {}) {
  const label = create("label", options.className || "structured-field");
  label.append(create("span", "", labelText));
  const input = options.multiline ? document.createElement("textarea") : document.createElement("input");
  if (!options.multiline) input.type = "text";
  input.value = value;
  if (options.placeholder) input.placeholder = options.placeholder;
  input.addEventListener("input", () => onInput(input.value));
  label.append(input);
  return label;
}

function createMetricIconPicker(value, onChange) {
  const fieldset = create("fieldset", "metric-icon-picker");
  fieldset.append(create("legend", "", "图案"));
  const options = create("div", "metric-icon-picker__options");
  Object.entries(metricIconLabels).forEach(([iconName, label]) => {
    const button = create("button", "metric-icon-choice");
    button.type = "button";
    button.title = label;
    button.setAttribute("aria-label", `使用${label}图案`);
    button.setAttribute("aria-pressed", String(iconName === value));
    button.append(createMetricIcon(iconName));
    button.addEventListener("click", () => {
      onChange(iconName);
      options.querySelectorAll(".metric-icon-choice").forEach((choice) => {
        choice.setAttribute("aria-pressed", String(choice === button));
      });
    });
    options.append(button);
  });
  fieldset.append(options);
  return fieldset;
}

function renderStructuredEditor(module) {
  elements.structuredEditor.replaceChildren();
  const heading = create("div", "structured-editor__heading");
  heading.append(create("strong", "", module.type === "experience" ? "逐段编辑" : module.type === "images" ? "逐张编辑" : "逐项编辑"));
  const add = create("button", "button button--quiet", module.type === "experience" ? "＋ 添加经历" : module.type === "images" ? "＋ 添加图片" : "＋ 添加一项");
  add.type = "button";
  if (module.type === "images") {
    add.addEventListener("click", () => elements.imageUpload.click());
  } else {
    add.addEventListener("click", () => {
      showUndo(module.type === "experience" ? "已添加一段经历" : "已添加一项内容");
      if (module.type === "metrics") module.items.push({ value: "", label: "", icon: "trend" });
      else if (module.type === "experience") module.items.push({ company: "", role: "", date: "", bullets: [""] });
      else module.items.push("");
      refreshSelectedModule(module);
      requestAnimationFrame(() => elements.structuredEditor.querySelector("input:last-of-type, textarea:last-of-type")?.focus());
    });
  }
  heading.append(add);
  elements.structuredEditor.append(heading);

  if (module.type === "metrics") {
    elements.structuredEditor.append(create("p", "field-hint", "关键成果会优先排成一行；超过 4 项时自动换成两行。每项可单独选择图案。"));
  }

  if (!module.items.length) {
    elements.structuredEditor.append(create("p", "structured-empty", "当前没有内容，点击上方按钮添加。"));
    return;
  }

  if (module.type === "experience") {
    module.items.forEach((item, index) => {
      const entry = create("section", "experience-editor-row");
      const entryHeading = create("div", "structured-row__heading");
      entryHeading.append(create("strong", "", `经历 ${index + 1}`));
      entryHeading.append(createItemActions(`第 ${index + 1} 段经历`, module.items, index, () => refreshSelectedModule(module)));
      entry.append(entryHeading);

      const identity = create("div", "experience-editor-grid");
      identity.append(
        fieldWithInput("公司", item.company, (value) => { item.company = value; renderResume(); syncBulkEditor(module); scheduleSave(); }),
        fieldWithInput("职位", item.role, (value) => { item.role = value; renderResume(); syncBulkEditor(module); scheduleSave(); }),
        fieldWithInput("时间", item.date, (value) => { item.date = value; renderResume(); syncBulkEditor(module); scheduleSave(); }),
      );
      entry.append(identity);

      const bulletList = create("div", "bullet-editor-list");
      item.bullets.forEach((bullet, bulletIndex) => {
        const row = create("div", "structured-row");
        const field = fieldWithInput(`要点 ${bulletIndex + 1}`, bullet, (value) => {
          item.bullets[bulletIndex] = value;
          renderResume();
          syncBulkEditor(module);
          scheduleSave();
        }, { multiline: true });
        row.append(field, createItemActions(`第 ${bulletIndex + 1} 条要点`, item.bullets, bulletIndex, () => refreshSelectedModule(module)));
        bulletList.append(row);
      });
      const addBullet = create("button", "button button--quiet", "＋ 添加要点");
      addBullet.type = "button";
      addBullet.addEventListener("click", () => {
        item.bullets.push("");
        refreshSelectedModule(module);
      });
      bulletList.append(addBullet);
      entry.append(bulletList);
      elements.structuredEditor.append(entry);
    });
    return;
  }

  module.items.forEach((item, index) => {
    const row = create("div", `structured-row structured-row--${module.type}`);
    if (module.type === "metrics") {
      const fields = create("div", "metric-editor-fields");
      fields.classList.toggle("is-iconless", !module.options.metricIconsVisible);
      if (module.options.metricIconsVisible) {
        fields.append(createMetricIconPicker(item.icon, (value) => {
          item.icon = metricIconNames.has(value) ? value : "trend";
          renderResume();
          scheduleSave();
        }));
      }
      fields.append(
        fieldWithInput("数字", item.value, (value) => { item.value = value; renderResume(); syncBulkEditor(module); scheduleSave(); }),
        fieldWithInput("说明", item.label, (value) => { item.label = value; renderResume(); syncBulkEditor(module); scheduleSave(); }),
      );
      row.append(fields);
    } else if (module.type === "images") {
      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.caption || `作品图片 ${index + 1}`;
      row.append(image, fieldWithInput("图片说明", item.caption, (value) => { item.caption = value; renderResume(); scheduleSave(); }));
    } else {
      row.append(fieldWithInput(`内容 ${index + 1}`, item, (value) => {
        module.items[index] = value;
        renderResume();
        syncBulkEditor(module);
        scheduleSave();
      }, { multiline: true }));
    }
    row.append(createItemActions(`第 ${index + 1} 项`, module.items, index, () => refreshSelectedModule(module)));
    elements.structuredEditor.append(row);
  });
}

function renderImageEditor(module) {
  elements.imageList.replaceChildren();
  if (module.type !== "images") return;
  const note = create("p", "field-hint", "图片会在本机压缩保存；建议优先保留 2–3 张。 ");
  elements.imageList.append(note);
}

function extractKeywords(text) {
  const source = String(text || "").toLowerCase();
  const stopwords = new Set(["负责", "具备", "能够", "以及", "相关", "工作", "岗位", "优先", "经验", "要求", "进行", "完成", "我们", "公司"]);
  const tokens = new Set(source.match(/[a-z][a-z0-9+.#-]{1,20}/g) ?? []);
  for (const run of source.match(/[\p{Script=Han}]{2,}/gu) ?? []) {
    for (let length = 2; length <= Math.min(4, run.length); length += 1) {
      for (let index = 0; index <= run.length - length; index += 1) {
        const token = run.slice(index, index + length);
        if (!stopwords.has(token)) tokens.add(token);
      }
    }
  }
  return [...tokens].slice(0, 260);
}

function scoreText(text, keywords) {
  const haystack = String(text || "").toLowerCase();
  return keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? Math.min(4, keyword.length) : 0), 0);
}

function matchedJobKeywords() {
  const resumeContent = `${state.sourceText} ${state.modules.map(moduleSearchText).join(" ")}`.toLowerCase();
  const jobContent = state.jobText.toLowerCase();
  const stopwords = new Set(["负责", "具备", "要求", "能够", "以及", "相关", "工作", "岗位", "优先", "经验", "进行", "完成", "我们", "公司"]);
  const words = [];
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    for (const part of segmenter.segment(jobContent)) {
      const word = part.segment.trim();
      if (part.isWordLike && (word.length >= 2 || /^[a-z]/i.test(word))) words.push(word);
    }
  } else {
    words.push(...(jobContent.match(/[a-z][a-z0-9+.#-]{1,20}|[\p{Script=Han}]{2,8}/gu) ?? []));
  }
  return [...new Set(words)]
    .filter((keyword) => !stopwords.has(keyword) && resumeContent.includes(keyword))
    .sort((left, right) => right.length - left.length)
    .slice(0, 6);
}

function segmentJobWords() {
  const content = state.jobText.toLowerCase();
  const stopwords = new Set(["负责", "具备", "要求", "能够", "以及", "相关", "工作", "岗位", "优先", "经验", "进行", "完成", "我们", "公司", "任职", "职位", "加分"]);
  const words = [];
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    for (const part of segmenter.segment(content)) {
      const word = part.segment.trim();
      if (part.isWordLike && (word.length >= 2 || /^[a-z]/i.test(word))) words.push(word);
    }
  } else {
    words.push(...(content.match(/[a-z][a-z0-9+.#-]{1,20}|[\p{Script=Han}]{2,8}/gu) ?? []));
  }
  return [...new Set(words)].filter((word) => !stopwords.has(word)).slice(0, 40);
}

function inferIndustryNotes(topic = "") {
  const context = `${state.jobText} ${topic}`.toLowerCase();
  const notes = [];
  const add = (condition, ...entries) => {
    if (condition) entries.forEach((entry) => { if (!notes.includes(entry)) notes.push(entry); });
  };
  add(/咖啡|餐饮|门店|饮品|烘焙|茶饮/.test(context),
    "门店运营不要只谈营业额；还要准备毛利、损耗、人效、复购与客诉等指标的真实口径。",
    "产品研发需要同时说明成本、出品稳定性、供应链可得性与食品安全，不能只描述创意。",
  );
  add(/品牌|内容|营销|策划|社媒|小红书|抖音|传播/.test(context),
    "品牌内容要区分曝光、互动、引流与实际转化，并明确哪些结果由你直接推动。",
    "涉及素材、联名或宣传表达时，要主动说明版权、授权和平台规则意识。",
  );
  add(/运营|零售|电商|销售|会员|用户/.test(context),
    "增长结果要同时看成本与质量，避免只报销售额、GMV、粉丝数或会员数。",
  );
  add(/团队|管理|店长|排班|培训/.test(context),
    "管理岗位常被追问排班、培训、目标拆解、冲突处理和人员流动，需准备具体处理过程。",
  );
  add(/供应链|采购|库存|仓储/.test(context),
    "供应链回答要覆盖交期、质量、成本、库存和备选供应商，而不是只强调压价。",
  );
  add(/数据|分析|指标|预算|财务/.test(context),
    "先说明指标定义、数据来源、统计周期和基线；无法核实的数据不要给精确结论。",
  );
  if (!notes.length) notes.push("先确认目标公司的业务模式、核心客户和岗位协作边界；不同公司的同名岗位，实际重点可能不同。");
  return notes.slice(0, 3);
}

function analyzeJobTips() {
  if (!state.jobText.trim()) return [];
  const resumeContent = `${state.sourceText} ${JSON.stringify(state.basics)} ${state.modules.map(moduleSearchText).join(" ")}`.toLowerCase();
  const words = segmentJobWords();
  const matched = words.filter((word) => resumeContent.includes(word)).slice(0, 5);
  const missing = words.filter((word) => !resumeContent.includes(word)).slice(0, 5);
  const tips = [];
  if (matched.length) tips.push({
    kind: "case",
    topic: `${matched.slice(0, 3).join(" / ")}实践`,
    why: "这些能力同时出现在岗位要求和你的简历中，面试官很可能要求你用具体案例证明。",
    questions: [`请挑一个最有代表性的${matched[0]}案例，说明目标、你的动作和结果。`, "过程中最大的困难是什么，你如何判断方案有效？"],
    prepare: ["准备一个完整 STAR 案例", "记清规模、周期、个人职责和结果数据", "准备一次失败或调整方案的经历"],
    answer: "虚构示例：在一家社区咖啡店负责 __门店运营项目__ 时，我发现需要解决 __客流与复购不足__。我负责 __方案规划与执行__，通过 __调整产品和服务流程__ 推进，最终得到 __经营指标改善__。复盘来看，最关键的判断是 __先确认问题再投入资源__；如果重做，我会 __更早建立数据记录__。",
    advice: ["先用一句话给出结论，再补场景、动作和结果。", "明确个人贡献，不把团队成果全部归给自己。", "结果数据必须能解释口径、周期与基线。"],
    industryNotes: inferIndustryNotes(matched.join(" ")),
  });
  if (missing.length) tips.push({
    kind: "risk",
    topic: `${missing.slice(0, 3).join(" / ")}相关经验`,
    why: "岗位有要求，但当前简历没有直接证据，面试官可能确认你是否真正接触过。",
    questions: [`你是否做过与${missing[0]}相关的工作？请说明具体参与程度。`, `如果没有直接经验，你会如何快速补齐${missing[0]}？`],
    prepare: ["有经历：准备真实场景、动作和结果", "无经历：明确承认边界，准备可迁移经验", `提前了解${missing.slice(0, 2).join("、")}的基础流程和常用指标`],
    answer: `虚构示例：我目前没有直接负责过${missing[0]}的完整工作，但曾在 __相近的运营项目__ 中处理过 __流程建立与协作推进__。我理解这项工作的关键是 __目标、流程和指标一致__；如果入职，我会先通过 __了解现有业务资料__ 学习，再用 __小范围任务和阶段复盘__ 验证。`,
    advice: ["先诚实说明经验边界，再说明相近能力。", "给出具体学习路径，不使用“我学习能力强”代替方案。", "不要背诵行业术语；要能解释它如何影响工作结果。"],
    industryNotes: inferIndustryNotes(missing.join(" ")),
  });
  const metricCount = state.modules.find((module) => module.type === "metrics" && module.enabled)?.items.length ?? 0;
  if (metricCount < 3) tips.push({ kind: "case", topic: "成果与数据可信度", why: "面试官通常会追问成果如何计算，以及你个人的真实贡献。", questions: ["这个结果的统计口径是什么？", "如果去掉团队和外部因素，你个人贡献了什么？"], prepare: ["确认每个数据的计算口径", "准备基线、结果和周期", "区分个人贡献与团队成果"], answer: "虚构示例：这个结果以 __调整前的经营数据__ 为基线，统计周期是 __一个完整业务周期__，数据来自 __后台报表与门店记录__。我直接负责 __方案设计和落地__，结果从 __原有水平__ 变为 __改善后的水平__；其中 __季节和团队协作__ 也有影响，所以我的实际贡献边界是 __负责的决策与执行部分__。", advice: ["数字之前先说明口径，避免只报一个百分比。", "允许说明外部因素，可信度比夸大贡献更重要。"], industryNotes: inferIndustryNotes("数据 指标") });
  const longBullets = state.modules.filter((module) => module.type === "experience").flatMap((module) => module.items.flatMap((item) => item.bullets)).filter((bullet) => bullet.length > 70).length;
  if (longBullets) tips.push({ kind: "risk", topic: "职责边界", why: "经历描述包含多项职责，面试官可能分辨哪些是你主导、协作或仅参与。", questions: ["这项工作具体由谁决策，你负责哪一部分？"], prepare: ["逐项标注主导 / 协作 / 参与", "准备说明关键决策和个人动作"], answer: "虚构示例：这项工作由 __项目负责人__ 最终决策，我的职责是 __负责具体方案和执行__。我独立完成 __需求整理与方案落地__，与 __团队成员及合作方__ 共同完成 __跨部门协作事项__，没有直接负责 __最终预算审批__。", advice: ["使用“主导、协作、参与”准确区分责任。", "说明一个由你亲自作出的关键判断。"], industryNotes: inferIndustryNotes("团队 管理 协作") });
  if (!missing.length) tips.push({ kind: "knowledge", topic: "岗位方法论", why: "经历匹配较好后，面试官更可能进一步考察你的判断框架和行业理解。", questions: ["如果让你重新做一次，你会如何拆解问题和设定指标？"], prepare: ["复习岗位常用指标", "准备自己的工作流程", "关注目标公司近期产品和业务"], answer: "虚构示例：我会先确认 __业务目标与用户需求__，再拆成过程指标 __执行进度和质量__ 与结果指标 __经营结果和用户反馈__；随后识别约束 __时间、预算和人员__、安排优先级，用 __小范围测试__ 验证，最后根据 __数据与一线反馈__ 调整。", advice: ["方法论要落到一个真实案例，避免只说步骤。", "说明为什么选择这些指标，而不是罗列术语。"], industryNotes: inferIndustryNotes("岗位 方法论") });
  return tips.slice(0, 4);
}

function createReferenceAnswer(text) {
  const paragraph = create("p", "job-tip__answer");
  const parts = String(text || "").split(/(__[^_]+__)/g);
  parts.forEach((part) => {
    if (part.startsWith("__") && part.endsWith("__")) {
      paragraph.append(create("span", "reference-fill", part.slice(2, -2)));
    } else if (part) {
      paragraph.append(document.createTextNode(part));
    }
  });
  return paragraph;
}

function renderJobTips() {
  const tips = state.jobTips.length ? state.jobTips : analyzeJobTips();
  elements.jobTipsContent.replaceChildren();
  elements.jobTipsCount.textContent = tips.length ? `${tips.length} 个重点` : "等待岗位分析";
  elements.jobTipsCard.classList.toggle("has-tips", Boolean(tips.length));
  if (!tips.length) {
    elements.jobTipsContent.append(create("p", "job-tips-empty", "粘贴招聘需求后，这里会生成面试关注点、参考答法、回答建议和行业注意。"));
    return;
  }
  tips.forEach((tip) => {
    const item = create("article", `job-tip job-tip--${tip.kind}`);
    item.append(create("strong", "job-tip__topic", tip.topic), create("p", "job-tip__why", tip.why));
    if (tip.questions.length) {
      const group = create("div", "job-tip__group");
      group.append(create("span", "job-tip__label", "可能会问"));
      const list = create("ul", "job-tip__list");
      tip.questions.forEach((question) => list.append(create("li", "", question)));
      group.append(list);
      item.append(group);
    }
    if (tip.prepare.length) {
      const group = create("div", "job-tip__group");
      group.append(create("span", "job-tip__label", "准备什么"));
      const list = create("ul", "job-tip__list");
      tip.prepare.forEach((entry) => list.append(create("li", "", entry)));
      group.append(list);
      item.append(group);
    }
    if (tip.answer) {
      const group = create("div", "job-tip__group");
      group.append(create("span", "job-tip__label", "参考答法"), createReferenceAnswer(tip.answer));
      item.append(group);
    }
    if (tip.advice?.length) {
      const group = create("div", "job-tip__group");
      group.append(create("span", "job-tip__label", "回答建议"));
      const list = create("ul", "job-tip__list");
      tip.advice.forEach((entry) => list.append(create("li", "", entry)));
      group.append(list);
      item.append(group);
    }
    if (tip.industryNotes?.length) {
      const group = create("div", "job-tip__group job-tip__group--industry");
      group.append(create("span", "job-tip__label", "行业注意"));
      const list = create("ul", "job-tip__list");
      tip.industryNotes.forEach((entry) => list.append(create("li", "", entry)));
      group.append(list);
      item.append(group);
    }
    elements.jobTipsContent.append(item);
  });
}

function setTipsExpanded(expanded) {
  elements.jobTipsBody.hidden = !expanded;
  elements.jobTipsToggle.setAttribute("aria-expanded", String(expanded));
  elements.jobTipsCard.classList.toggle("is-expanded", expanded);
  elements.jobTipsCard.querySelector(".job-tips-card__chevron").textContent = expanded ? "−" : "＋";
}

async function playPixelGenerate(onCovered) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onCovered();
    return;
  }
  const rect = elements.paperViewport.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    onCovered();
    return;
  }
  const cellSize = rect.width < 520 ? 32 : 56;
  const columns = Math.ceil(rect.width / cellSize);
  const rows = Math.ceil(rect.height / cellSize);
  const totalDuration = 1700;
  const pixelDuration = 460;
  const swapAt = 930;
  const maxEnterDelay = swapAt - pixelDuration;
  const maxExitDelay = totalDuration - swapAt - pixelDuration;
  elements.pixelGenerateGrid.replaceChildren();
  elements.pixelGenerateGrid.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
  elements.pixelGenerateGrid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
  elements.pixelGenerateGrid.style.width = `${columns * cellSize}px`;
  elements.pixelGenerateGrid.style.height = `${rows * cellSize}px`;
  const pixels = Array.from({ length: rows * columns }, (_, index) => {
    const pixel = document.createElement("span");
    elements.pixelGenerateGrid.append(pixel);
    return { pixel, enter: ((index * 73 + index * index * 17) % 101) / 100, exit: ((index * 31 + index * index * 11) % 101) / 100 };
  });
  elements.pixelGenerateTitle.textContent = "正在生成简历";
  elements.pixelGenerateStatus.textContent = "应用 AI 建议并重新排版";
  elements.pixelGenerate.hidden = false;
  elements.pixelGenerate.classList.add("is-running");
  const animations = [];
  pixels.forEach(({ pixel, enter, exit }) => {
    animations.push(pixel.animate([
      { opacity: 0, transform: "scale(0.2)" },
      { opacity: 1, transform: "scale(1.03)" },
    ], { duration: pixelDuration, delay: enter * maxEnterDelay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }));
    animations.push(pixel.animate([
      { opacity: 1, transform: "scale(1.03)" },
      { opacity: 0, transform: "scale(0.15)" },
    ], { duration: pixelDuration, delay: swapAt + exit * maxExitDelay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }));
  });
  await new Promise((resolve) => window.setTimeout(resolve, swapAt));
  onCovered();
  elements.pixelGenerateTitle.textContent = "改写完成";
  elements.pixelGenerateStatus.textContent = "正在适配一页 A4";
  await new Promise((resolve) => window.setTimeout(resolve, totalDuration - swapAt));
  animations.forEach((animation) => animation.cancel());
  elements.pixelGenerate.classList.remove("is-running");
  elements.pixelGenerate.hidden = true;
  elements.pixelGenerateGrid.replaceChildren();
}

function sortItemsByJob() {
  const keywords = extractKeywords(state.jobText);
  if (!keywords.length) {
    elements.sortStatus.textContent = "请先粘贴招聘需求，再按相关性排序。";
    elements.jobText.focus();
    return;
  }
  state.modules.forEach((module) => {
    if (module.type === "experience") {
      module.items.forEach((item) => item.bullets.sort((a, b) => scoreText(b, keywords) - scoreText(a, keywords)));
    } else if (module.type !== "images") {
      module.items.sort((a, b) => scoreText(typeof b === "string" ? b : JSON.stringify(b), keywords) - scoreText(typeof a === "string" ? a : JSON.stringify(a), keywords));
    }
  });
  elements.sortStatus.textContent = "已在各模块内部优先展示更相关的内容；工作经历顺序未改动。";
  renderAll();
}

function buildGptPrompt() {
  const source = state.sourceText.trim() || "（未提供；请提醒用户补充，不要推测）";
  const job = state.jobText.trim() || "（未提供；仅整理原简历，不要假设岗位需求）";
  return `你是一名严谨的简历内容编辑。请根据“原简历”和“招聘需求”，筛选、压缩并重排内容，最终只输出一个 JSON 对象。此提示词必须兼容不同 AI 助手，不依赖任何特定产品功能。

硬性规则：
1. 不得发明原简历中不存在的公司、职位、项目、数字、日期、学历、技能或成果。
2. 保留姓名、电话、邮箱的原始事实；不确定的内容宁可删除，不要补写。
3. 优先保留能直接证明招聘需求的经历和量化结果，每条尽量短、以动作或结果开头。
4. 工作经历按时间倒序；可以重排同一段经历中的要点，但不得改变归属。
5. 重点分析“面试官可能更加在意并追问什么”，而不是泛泛评价匹配度。
6. 每个重点必须说明面试官为什么在意，并给出 1–3 个贴近该岗位的具体面试问题。
7. 为每个重点给出准备清单，区分需要准备的真实案例、数据口径、业务知识、行业术语或方法论。
8. 为每个重点提供一段可练习的“参考答法”。用双下划线包住通用参考词，例如 __门店运营项目__、__经营指标改善__；不要留空白占位符或使用方括号。可以使用通用虚构场景帮助理解结构，但必须以“虚构示例：”开头，不得编造具体公司名、日期或数字，也不得把示例当作求职者事实。
9. 回答建议必须针对该问题，提醒求职者如何说明个人贡献、数据口径和经验边界，避免“自信一点”等泛泛建议。
10. 行业注意应覆盖与该岗位直接相关的常用指标、业务风险、术语理解、协作或合规边界；不确定的政策和公司规则要写“需结合公司业务确认”，不得编造法规或内部流程。
11. 如果岗位要求在当前简历中没有证据，只能说“当前简历未体现”，不得断言求职者不会；建议诚实准备可迁移经验或学习方案，不得鼓励虚构。
12. 只输出合法 JSON，不要 Markdown 代码块，不要解释。

JSON 结构必须是：
{
  "basics": {
    "name": "姓名",
    "title": "建议的目标定位",
    "phone": "电话",
    "email": "邮箱",
    "education": "教育经历"
  },
  "modules": [
    {
      "id": "summary",
      "type": "list",
      "title": "核心能力",
      "enabled": true,
      "items": ["短句1", "短句2"]
    },
    {
      "id": "metrics",
      "type": "metrics",
      "title": "关键成果",
      "enabled": true,
      "items": [{"value": "原文数字", "label": "数字说明"}]
    },
    {
      "id": "experience",
      "type": "experience",
      "title": "工作经历",
      "enabled": true,
      "items": [{"company": "公司", "role": "职位", "date": "时间", "bullets": ["要点"]}]
    }
  ],
  "interviewPreparation": [
    {
      "type": "case | knowledge | risk",
      "topic": "面试官可能关注的主题",
      "why": "这个岗位为什么在意此项",
      "questions": ["可能提出的具体问题1", "可能追问2"],
      "prepare": ["应准备的真实案例或知识点1", "需要确认的数据口径或方法论2"],
      "referenceAnswer": "以“虚构示例：”开头，用 __通用参考词__ 表示可替换内容的参考答法",
      "answerAdvice": ["针对该问题的回答建议1", "可信度与表达边界建议2"],
      "industryNotes": ["该行业或岗位常见指标、风险或术语注意1", "需结合公司业务确认的边界2"]
    }
  ]
}

【原简历】
${source}

【招聘需求】
${job}`;
}

function parseGptJson(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("没有找到 JSON 对象。请粘贴 AI 的完整回答。");
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!parsed.basics || !Array.isArray(parsed.modules)) throw new Error("缺少 basics 或 modules，回答结构不完整。");
  const modules = normalizeModules(parsed.modules);
  if (!modules.length) throw new Error("没有可用模块。请让 AI 严格按提示词输出。");
  const jobTips = (Array.isArray(parsed.interviewPreparation) ? parsed.interviewPreparation : []).slice(0, 5).map((item) => ({
    kind: ["case", "knowledge", "risk"].includes(item?.type) ? item.type : "case",
    topic: String(item?.topic || "重点问题").slice(0, 60),
    why: String(item?.why || "面试官可能借此判断岗位胜任度。").slice(0, 240),
    questions: (Array.isArray(item?.questions) ? item.questions : []).map((entry) => String(entry).slice(0, 240)).filter(Boolean).slice(0, 3),
    prepare: (Array.isArray(item?.prepare) ? item.prepare : []).map((entry) => String(entry).slice(0, 180)).filter(Boolean).slice(0, 4),
    answer: normalizeReferenceAnswer(item?.referenceAnswer || item?.answer).slice(0, 600),
    advice: (Array.isArray(item?.answerAdvice) ? item.answerAdvice : Array.isArray(item?.advice) ? item.advice : []).map((entry) => String(entry).slice(0, 180)).filter(Boolean).slice(0, 4),
    industryNotes: (Array.isArray(item?.industryNotes) ? item.industryNotes : []).map((entry) => String(entry).slice(0, 220)).filter(Boolean).slice(0, 4),
  })).filter((item) => item.questions.length || item.prepare.length || item.answer || item.advice.length || item.industryNotes.length);
  return {
    basics: {
      name: String(parsed.basics.name ?? state.basics.name),
      title: String(parsed.basics.title ?? state.basics.title),
      phone: String(parsed.basics.phone ?? state.basics.phone),
      email: String(parsed.basics.email ?? state.basics.email),
      education: String(parsed.basics.education ?? state.basics.education),
    },
    modules,
    jobTips,
  };
}

function extractNumbers(text) {
  return new Set((String(text).match(/\d+(?:[.,]\d+)?(?:%|w|W|万|元|㎡|人|款|客座|\+)?/g) ?? []).map((value) => value.toLowerCase().replace(/,/g, "")));
}

function unknownNumbers(parsed) {
  const sourceNumbers = extractNumbers(`${state.sourceText} ${JSON.stringify(state.basics)} ${JSON.stringify(state.modules)}`);
  const resumeOutputOnly = { basics: parsed.basics, modules: parsed.modules };
  return [...extractNumbers(JSON.stringify(resumeOutputOnly))].filter((number) => !sourceNumbers.has(number));
}

function showGptStatus(message, kind = "warning") {
  elements.gptParseStatus.hidden = false;
  elements.gptParseStatus.className = `status-box${kind === "error" ? " is-error" : kind === "success" ? " is-success" : ""}`;
  elements.gptParseStatus.textContent = message;
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(elements.promptOutput.value);
    elements.copyPromptButton.textContent = "已复制";
    window.setTimeout(() => { elements.copyPromptButton.textContent = "复制提示词"; }, 1600);
  } catch {
    elements.promptOutput.focus();
    elements.promptOutput.select();
    showGptStatus("浏览器没有允许自动复制，提示词已选中，请手动复制。", "warning");
  }
}

function openGptDialog() {
  elements.promptOutput.value = buildGptPrompt();
  elements.gptParseStatus.hidden = true;
  elements.gptReviewSection.hidden = true;
  elements.gptDiffList.replaceChildren();
  pendingGptReview = null;
  elements.applyGptButton.disabled = false;
  elements.applyGptButton.textContent = "查看修改对比";
  if (typeof elements.gptDialog.showModal === "function") elements.gptDialog.showModal();
}

function formatReviewValue(value) {
  if (value === undefined || value === null || value === "") return "当前无此项";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatReviewValue).join("；");
  if (typeof value === "object" && "value" in value && "label" in value) return `${value.value} · ${value.label}`;
  if (typeof value === "object" && "company" in value) {
    const identity = [value.company, value.role, value.date].filter(Boolean).join(" · ");
    const bullets = Array.isArray(value.bullets) ? value.bullets.join("；") : "";
    return [identity, bullets].filter(Boolean).join("｜");
  }
  return JSON.stringify(value);
}

function reviewValuesMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeMatchText(value) {
  return String(value || "").toLowerCase().replace(/[\s·|｜/]+/g, "");
}

function buildGptReview(parsed) {
  const changes = [];
  const sourceNumbers = extractNumbers(`${state.sourceText} ${JSON.stringify(state.basics)} ${JSON.stringify(state.modules)}`);
  const proposedModuleIds = new Set(parsed.modules.map((module) => module.id));

  const addChange = (config) => {
    const afterSource = typeof config.after === "string" ? config.after : JSON.stringify(config.after ?? "");
    const afterNumbers = extractNumbers(afterSource);
    const unknown = [...afterNumbers].filter((number) => !sourceNumbers.has(number));
    const risk = Boolean(config.risk || unknown.length);
    changes.push({
      id: `gpt-change-${changes.length + 1}`,
      phase: config.phase ?? 20,
      operation: config.operation ?? "replace",
      label: config.label,
      before: formatReviewValue(config.before),
      after: formatReviewValue(config.after),
      risk,
      riskReason: config.riskReason || (unknown.length ? `包含原简历未出现的数字：${unknown.slice(0, 4).join("、")}` : ""),
      selected: config.selected ?? !risk,
      apply: config.apply,
    });
  };

  const basicLabels = { name: "姓名", title: "目标职位", phone: "电话", email: "邮箱", education: "教育经历" };
  Object.entries(basicLabels).forEach(([key, label]) => {
    if (state.basics[key] === parsed.basics[key]) return;
    const protectedField = ["name", "phone", "email"].includes(key);
    addChange({
      label: `基本信息 · ${label}`,
      before: state.basics[key],
      after: parsed.basics[key],
      risk: protectedField,
      riskReason: protectedField ? "身份或联系方式发生变化，默认未选择。" : "",
      apply(next) { next.basics[key] = parsed.basics[key]; },
    });
  });

  if (parsed.jobTips.length) {
    addChange({
      label: "面试准备",
      before: state.jobTips.length ? `${state.jobTips.length} 条现有提示` : "当前为本地基础提示",
      after: `${parsed.jobTips.length} 个面试重点与准备清单`,
      apply(next) { next.jobTips = clone(parsed.jobTips); },
    });
  }

  const currentKnownOrder = state.modules.filter((module) => proposedModuleIds.has(module.id)).map((module) => module.id);
  const proposedKnownOrder = parsed.modules.filter((module) => state.modules.some((current) => current.id === module.id)).map((module) => module.id);
  if (!reviewValuesMatch(currentKnownOrder, proposedKnownOrder)) {
    addChange({
      label: "模块顺序",
      before: currentKnownOrder.map((id) => state.modules.find((module) => module.id === id)?.title).filter(Boolean).join(" → "),
      after: proposedKnownOrder.map((id) => parsed.modules.find((module) => module.id === id)?.title).filter(Boolean).join(" → "),
      phase: 100,
      apply(next) {
        const order = parsed.modules.map((module) => module.id);
        const ranked = next.modules.filter((module) => order.includes(module.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        const untouched = next.modules.filter((module) => !order.includes(module.id));
        next.modules = [...ranked, ...untouched];
      },
    });
  }

  parsed.modules.forEach((proposedModule) => {
    const currentModule = state.modules.find((module) => module.id === proposedModule.id);
    if (!currentModule) {
      addChange({
        label: `新增模块 · ${proposedModule.title}`,
        before: "当前无此模块",
        after: `${proposedModule.title}（${proposedModule.items.length} 项）`,
        operation: "add",
        risk: proposedModule.type === "experience",
        riskReason: proposedModule.type === "experience" ? "新增整段工作经历，默认未选择。" : "",
        phase: 10,
        apply(next) { next.modules.push(clone(proposedModule)); },
      });
      return;
    }

    if (currentModule.type !== proposedModule.type) {
      addChange({
        label: `替换模块结构 · ${currentModule.title}`,
        before: `${currentModule.type} · ${currentModule.items.length} 项`,
        after: `${proposedModule.type} · ${proposedModule.items.length} 项`,
        risk: true,
        riskReason: "模块类型发生变化，默认未选择。",
        phase: 10,
        apply(next) {
          const index = next.modules.findIndex((module) => module.id === currentModule.id);
          if (index >= 0) next.modules[index] = clone(proposedModule);
        },
      });
      return;
    }

    if (currentModule.title !== proposedModule.title) {
      addChange({
        label: `模块标题 · ${currentModule.title}`,
        before: currentModule.title,
        after: proposedModule.title,
        apply(next) {
          const target = next.modules.find((module) => module.id === currentModule.id);
          if (target) target.title = proposedModule.title;
        },
      });
    }
    if (currentModule.enabled !== proposedModule.enabled) {
      addChange({
        label: `模块显示 · ${currentModule.title}`,
        before: currentModule.enabled ? "显示" : "隐藏",
        after: proposedModule.enabled ? "显示" : "隐藏",
        apply(next) {
          const target = next.modules.find((module) => module.id === currentModule.id);
          if (target) target.enabled = proposedModule.enabled;
        },
      });
    }

    if (currentModule.type === "experience") {
      const usedCurrentIndexes = new Set();
      proposedModule.items.forEach((proposedItem) => {
        const proposedCompany = normalizeMatchText(proposedItem.company);
        const proposedRoleDate = `${normalizeMatchText(proposedItem.role)}|${normalizeMatchText(proposedItem.date)}`;
        const currentIndex = currentModule.items.findIndex((currentItem, index) => {
          if (usedCurrentIndexes.has(index)) return false;
          const companyMatch = proposedCompany && normalizeMatchText(currentItem.company) === proposedCompany;
          const roleDateMatch = proposedRoleDate !== "|" && `${normalizeMatchText(currentItem.role)}|${normalizeMatchText(currentItem.date)}` === proposedRoleDate;
          return companyMatch || roleDateMatch;
        });

        if (currentIndex < 0) {
          addChange({
            label: `新增经历 · ${proposedItem.company || proposedItem.role || "未命名经历"}`,
            before: "当前无此经历",
            after: proposedItem,
            operation: "add",
            risk: true,
            riskReason: "新增整段工作经历，默认未选择。",
            apply(next) {
              const target = next.modules.find((module) => module.id === currentModule.id);
              if (target) target.items.push(clone(proposedItem));
            },
          });
          return;
        }

        usedCurrentIndexes.add(currentIndex);
        const currentItem = currentModule.items[currentIndex];
        const currentIdentity = { company: currentItem.company, role: currentItem.role, date: currentItem.date };
        const proposedIdentity = { company: proposedItem.company, role: proposedItem.role, date: proposedItem.date };
        if (!reviewValuesMatch(currentIdentity, proposedIdentity)) {
          addChange({
            label: `经历信息 · ${currentItem.company || currentItem.role}`,
            before: currentIdentity,
            after: proposedIdentity,
            apply(next) {
              const target = next.modules.find((module) => module.id === currentModule.id);
              if (target?.items[currentIndex]) Object.assign(target.items[currentIndex], clone(proposedIdentity));
            },
          });
        }

        const bulletCount = Math.max(currentItem.bullets.length, proposedItem.bullets.length);
        for (let bulletIndex = 0; bulletIndex < bulletCount; bulletIndex += 1) {
          const before = currentItem.bullets[bulletIndex];
          const after = proposedItem.bullets[bulletIndex];
          if (before === after) continue;
          const operation = before === undefined ? "add" : after === undefined ? "remove" : "replace";
          addChange({
            label: `${currentItem.company || currentItem.role} · 要点 ${bulletIndex + 1}`,
            before,
            after: operation === "remove" ? "删除此要点" : after,
            operation,
            risk: operation === "remove",
            riskReason: operation === "remove" ? "这是删除操作，默认未选择。" : "",
            phase: operation === "remove" ? 90 - (bulletIndex / 1000) : 20,
            apply(next) {
              const target = next.modules.find((module) => module.id === currentModule.id);
              const bullets = target?.items[currentIndex]?.bullets;
              if (!bullets) return;
              if (operation === "add") bullets.splice(bulletIndex, 0, after);
              else if (operation === "remove") bullets.splice(bulletIndex, 1);
              else bullets[bulletIndex] = after;
            },
          });
        }
      });

      currentModule.items.forEach((currentItem, currentIndex) => {
        if (usedCurrentIndexes.has(currentIndex)) return;
        addChange({
          label: `移除经历 · ${currentItem.company || currentItem.role}`,
          before: currentItem,
          after: "删除整段经历",
          operation: "remove",
          risk: true,
          riskReason: "这是删除操作，默认未选择。",
          phase: 90 - (currentIndex / 1000),
          apply(next) {
            const target = next.modules.find((module) => module.id === currentModule.id);
            if (target) target.items.splice(currentIndex, 1);
          },
        });
      });
      return;
    }

    const itemCount = Math.max(currentModule.items.length, proposedModule.items.length);
    for (let index = 0; index < itemCount; index += 1) {
      const before = currentModule.items[index];
      const after = proposedModule.items[index];
      if (reviewValuesMatch(before, after)) continue;
      const operation = before === undefined ? "add" : after === undefined ? "remove" : "replace";
      addChange({
        label: `${currentModule.title} · 第 ${index + 1} 项`,
        before,
        after: operation === "remove" ? "删除此项" : after,
        operation,
        risk: operation === "remove",
        riskReason: operation === "remove" ? "这是删除操作，默认未选择。" : "",
        phase: operation === "remove" ? 90 - (index / 1000) : 20,
        apply(next) {
          const target = next.modules.find((module) => module.id === currentModule.id);
          if (!target) return;
          if (operation === "add") target.items.splice(index, 0, clone(after));
          else if (operation === "remove") target.items.splice(index, 1);
          else target.items[index] = clone(after);
        },
      });
    }
  });

  return { parsed, changes, unknownNumbers: unknownNumbers(parsed) };
}

function updateGptReviewSummary() {
  const checks = [...elements.gptDiffList.querySelectorAll(".gpt-diff-check")];
  const selected = checks.filter((check) => check.checked);
  const selectedRisk = selected.filter((check) => check.dataset.risk === "true").length;
  elements.gptReviewSummary.textContent = checks.length
    ? `已选择 ${selected.length}/${checks.length} 项${selectedRisk ? `，其中 ${selectedRisk} 项需要人工确认` : ""}。`
    : "AI 返回内容与当前简历没有可见差异。";
  elements.applyGptButton.disabled = !selected.length;
  elements.applyGptButton.textContent = selected.length ? `应用 ${selected.length} 项修改` : "请选择修改";
}

function renderGptReview(review) {
  elements.gptDiffList.replaceChildren();
  const operationLabels = { add: "新增", remove: "删除", replace: "修改" };
  review.changes.forEach((change) => {
    const row = create("label", `diff-row${change.risk ? " is-risk" : ""}`);
    row.setAttribute("role", "listitem");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "gpt-diff-check";
    checkbox.dataset.changeId = change.id;
    checkbox.dataset.risk = String(change.risk);
    checkbox.checked = change.selected;
    checkbox.addEventListener("change", updateGptReviewSummary);

    const body = create("span", "diff-row__body");
    const heading = create("span", "diff-row__heading");
    heading.append(create("strong", "", change.label), create("span", "diff-row__operation", operationLabels[change.operation] || "修改"));
    const before = create("span", "diff-copy diff-copy--before");
    before.append(create("b", "", "原"), create("span", "", change.before));
    const after = create("span", "diff-copy diff-copy--after");
    after.append(create("b", "", "建议"), create("span", "", change.after));
    body.append(heading, before, after);
    if (change.riskReason) body.append(create("span", "diff-row__risk", change.riskReason));
    row.append(checkbox, body);
    elements.gptDiffList.append(row);
  });
  elements.gptReviewSection.hidden = false;
  updateGptReviewSummary();
}

function previewGptResponse() {
  try {
    const parsed = parseGptJson(elements.gptResponseInput.value);
    pendingGptReview = buildGptReview(parsed);
    renderGptReview(pendingGptReview);
    if (pendingGptReview.unknownNumbers.length) {
      showGptStatus(`发现原简历中未出现的数字：${pendingGptReview.unknownNumbers.slice(0, 8).join("、")}。相关修改已默认取消选择，请逐条核对。`, "warning");
    } else {
      showGptStatus("已生成修改对比。删除项和联系方式变化默认不选择。", "success");
    }
    elements.gptReviewSection.scrollIntoView({ block: "nearest" });
  } catch (error) {
    pendingGptReview = null;
    elements.gptReviewSection.hidden = true;
    showGptStatus(error instanceof Error ? error.message : "无法解析回答。", "error");
  }
}

async function applySelectedGptChanges() {
  if (!pendingGptReview) {
    previewGptResponse();
    return;
  }
  const selectedIds = new Set([...elements.gptDiffList.querySelectorAll(".gpt-diff-check:checked")].map((check) => check.dataset.changeId));
  const selectedChanges = pendingGptReview.changes.filter((change) => selectedIds.has(change.id));
  if (!selectedChanges.length) {
    showGptStatus("尚未选择修改。请勾选需要应用的建议。", "warning");
    return;
  }
  try {
    showUndo(`已应用 ${selectedChanges.length} 项 AI 建议`);
    const next = clone(state);
    selectedChanges.sort((left, right) => left.phase - right.phase).forEach((change) => change.apply(next));
    await playPixelGenerate(() => {
      state = normalizeState(next);
      selectedModuleId = state.modules[0]?.id ?? null;
      renderAll();
    });
    showGptStatus(`已应用 ${selectedChanges.length} 项修改；未勾选内容保持原样。`, "success");
    elements.applyGptButton.textContent = "已应用";
    elements.applyGptButton.disabled = true;
    window.setTimeout(() => {
      elements.gptDialog.close();
      pendingGptReview = null;
      elements.applyGptButton.disabled = false;
      elements.applyGptButton.textContent = "查看修改对比";
    }, 650);
  } catch (error) {
    showGptStatus(error instanceof Error ? error.message : "无法应用修改。", "error");
  }
}

function estimatedResumePages() {
  return 1;
}

function buildPreflightChecks() {
  const checks = [];
  const fitPercent = Math.round(resumeFitScale * 100);
  const contentHeight = elements.resumePrintRoot.querySelector(".resume-content")?.scrollHeight || 0;
  const contentWillCrop = contentHeight * resumeFitScale > 995;
  checks.push(contentWillCrop || resumeFitScale < 0.82 ? {
    status: "warning",
    title: contentWillCrop ? "内容超过一页可读容量" : `已压缩到一页，当前内容比例为 ${fitPercent}%`,
    detail: contentWillCrop ? "为了保持可读字号和一页 A4，超出底部的内容不会导出；请精简次要内容。" : "已保持一页 A4，但缩放较多可能影响阅读；建议精简次要内容。",
    actionLabel: "检查内容",
    sectionId: "previewHeading",
  } : {
    status: "pass",
    title: "一页 A4 适配正常",
    detail: resumeFitScale < 0.995 ? `已自动调整间距与整体比例至 ${fitPercent}%。` : "当前内容无需压缩即可放入一页。",
  });

  const basicFields = [
    ["name", "姓名", "basicName"],
    ["title", "目标职位", "basicTitle"],
    ["phone", "电话", "basicPhone"],
    ["email", "邮箱", "basicEmail"],
  ];
  const missingBasics = basicFields.filter(([key]) => !String(state.basics[key] || "").trim());
  checks.push(missingBasics.length ? {
    status: "error",
    title: `缺少${missingBasics.map(([, label]) => label).join("、")}`,
    detail: "这些信息会直接影响招聘方识别和联系你，请补齐后再导出。",
    actionLabel: "补充信息",
    sectionId: "basicsHeading",
    focusId: missingBasics[0][2],
  } : {
    status: "pass",
    title: "基本信息完整",
    detail: "姓名、目标职位、电话和邮箱均已填写。",
  });

  const enabledModules = state.modules.filter((module) => module.enabled && module.items.length);
  checks.push(enabledModules.length ? {
    status: "pass",
    title: `已有 ${enabledModules.length} 个内容模块`,
    detail: "至少有一个可输出的正文模块。",
  } : {
    status: "error",
    title: "没有可输出的内容模块",
    detail: "请至少开启一个包含内容的模块。",
    actionLabel: "检查模块",
    sectionId: "moduleHeading",
  });

  const metricsModule = state.modules.find((module) => module.type === "metrics" && module.enabled);
  const metricCount = metricsModule?.items.length ?? 0;
  if (!metricCount) {
    checks.push({
      status: "warning",
      title: "没有显示关键成果",
      detail: "如果原简历有可靠数据，建议保留 4–6 项；没有数据时不必强行添加。",
      actionLabel: "检查成果",
      moduleId: metricsModule?.id || "metrics",
    });
  } else if (metricCount > 6) {
    checks.push({
      status: "warning",
      title: `关键成果有 ${metricCount} 项`,
      detail: "单行空间最多建议保留 6 项，请优先留下最能证明岗位能力的数据。",
      actionLabel: "精简成果",
      moduleId: metricsModule.id,
    });
  } else {
    checks.push({
      status: "pass",
      title: `关键成果为 ${metricCount} 项`,
      detail: "数量适合当前单行数据带。",
    });
  }

  const longItems = [];
  const crowdedExperiences = [];
  enabledModules.forEach((module) => {
    if (module.type === "experience") {
      module.items.forEach((item) => {
        item.bullets.forEach((bullet) => { if (bullet.length > 70) longItems.push(bullet); });
        if (item.bullets.length > 4) crowdedExperiences.push(item.company || item.role);
      });
    } else if (["list", "text"].includes(module.type)) {
      module.items.forEach((item) => { if (String(item).length > 90) longItems.push(item); });
    }
  });
  const densityProblems = longItems.length + crowdedExperiences.length;
  checks.push(densityProblems ? {
    status: "warning",
    title: `发现 ${densityProblems} 处内容偏密`,
    detail: `${longItems.length ? `${longItems.length} 条文字过长` : ""}${longItems.length && crowdedExperiences.length ? "；" : ""}${crowdedExperiences.length ? `${crowdedExperiences.length} 段经历超过 4 个要点` : ""}。这是阅读建议，不会阻止导出。`,
    actionLabel: "检查经历",
    moduleId: state.modules.find((module) => module.type === "experience")?.id,
  } : {
    status: "pass",
    title: "内容密度正常",
    detail: "没有发现明显过长的段落或过多的经历要点。",
  });

  return checks;
}

function jumpToPreflightIssue(check) {
  elements.preflightDialog.close();
  if (check.moduleId && state.modules.some((module) => module.id === check.moduleId)) selectModule(check.moduleId);
  window.setTimeout(() => {
    const focusTarget = check.focusId ? document.getElementById(check.focusId) : null;
    const scrollTarget = check.moduleId ? elements.moduleEditor : check.sectionId ? document.getElementById(check.sectionId) : focusTarget;
    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
    focusTarget?.focus({ preventScroll: true });
  }, 80);
}

function renderPreflightChecks(checks) {
  const problems = checks.filter((check) => check.status !== "pass");
  const passed = checks.length - problems.length;
  elements.preflightSummary.replaceChildren();
  elements.preflightSummary.append(
    create("strong", "", problems.length ? `有 ${problems.length} 项需要检查` : "体检通过，可以导出"),
    create("span", "", `${passed}/${checks.length} 项通过。${problems.length ? "你可以先调整，也可以保留当前版本继续导出。" : "当前没有发现明显的排版或信息问题。"}`),
  );
  elements.preflightList.replaceChildren();
  checks.forEach((check) => {
    const item = create("li", `preflight-item is-${check.status}`);
    const marker = create("span", "preflight-item__marker", check.status === "pass" ? "通过" : check.status === "error" ? "缺失" : "注意");
    const copy = create("span", "preflight-item__copy");
    copy.append(create("strong", "", check.title), create("span", "", check.detail));
    item.append(marker, copy);
    if (check.actionLabel) {
      const action = create("button", "button button--quiet", check.actionLabel);
      action.type = "button";
      action.addEventListener("click", () => jumpToPreflightIssue(check));
      item.append(action);
    }
    elements.preflightList.append(item);
  });
  updateExportButtonLabel(problems.length);
}

function selectedExportFormat() {
  return document.querySelector('input[name="exportFormat"]:checked')?.value === "jpg" ? "jpg" : "pdf";
}

function updateExportButtonLabel(problemCount = 0) {
  const format = selectedExportFormat().toUpperCase();
  elements.confirmExportButton.textContent = problemCount ? `仍然导出 ${format}` : `导出 ${format}`;
}

function openPreflightDialog() {
  const checks = buildPreflightChecks();
  renderPreflightChecks(checks);
  if (typeof elements.preflightDialog.showModal === "function") elements.preflightDialog.showModal();
  else confirmExport();
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function imageSourceToDataUrl(source) {
  if (!source || source.startsWith("data:")) return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error("作品图片读取失败，请重新插入后再导出 JPG。");
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function renderResumeJpegBlob() {
  const root = elements.resumePrintRoot;
  const clonedRoot = root.cloneNode(true);
  const sourceImages = [...root.querySelectorAll("img")];
  const clonedImages = [...clonedRoot.querySelectorAll("img")];
  await Promise.all(sourceImages.map(async (image, index) => {
    clonedImages[index].src = await imageSourceToDataUrl(image.currentSrc || image.src);
  }));
  const cssText = [...document.styleSheets].map((sheet) => {
    try { return [...sheet.cssRules].map((rule) => rule.cssText).join("\n"); } catch { return ""; }
  }).join("\n");
  const rawHeight = 1123;
  const scale = 2;
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.cssText = `width:794px;min-height:${rawHeight}px;background:white;`;
  const style = document.createElement("style");
  style.textContent = `${cssText}\n.resume-sheet{transform:none!important;box-shadow:none!important;width:794px!important;height:1123px!important;min-height:1123px!important;overflow:hidden!important;margin:0!important;}`;
  wrapper.append(style, clonedRoot);
  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${794 * scale}" height="${rawHeight * scale}" viewBox="0 0 794 ${rawHeight}"><foreignObject width="794" height="${rawHeight}">${serialized}</foreignObject></svg>`;
  const image = new Image();
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("浏览器无法生成 JPG，请尝试使用最新版 Chrome。"));
    image.src = svgUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 794 * scale;
  canvas.height = rawHeight * scale;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
  if (!blob) throw new Error("JPG 生成失败，请重试。");
  return blob;
}

async function exportResumeAsJpg() {
  const blob = await renderResumeJpegBlob();
  const safeName = (state.basics.name || "简历").replace(/[\\/:*?"<>|]/g, "-");
  downloadBlob(blob, `${safeName}-简历.jpg`);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function jpegBytesToOnePagePdf(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  let length = 0;
  const offsets = [0];
  const pushText = (value) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    length += bytes.length;
  };
  const pushBytes = (bytes) => {
    chunks.push(bytes);
    length += bytes.length;
  };
  pushText("%PDF-1.4\n% resume-export\n");
  const object = (id, body) => {
    offsets[id] = length;
    pushText(`${id} 0 obj\n${body}\nendobj\n`);
  };
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
  offsets[4] = length;
  pushText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  pushBytes(jpegBytes);
  pushText("\nendstream\nendobj\n");
  const content = "q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n";
  object(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
  const xref = length;
  pushText("xref\n0 6\n0000000000 65535 f \n");
  for (let id = 1; id <= 5; id += 1) pushText(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const output = new Uint8Array(length);
  let cursor = 0;
  chunks.forEach((chunk) => { output.set(chunk, cursor); cursor += chunk.length; });
  return output;
}

async function exportResumeAsPdf() {
  const capturedBlob = await renderResumeJpegBlob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(capturedBlob);
  });
  const jpegBytes = base64ToBytes(dataUrl.split(",")[1]);
  const pdfBytes = jpegBytesToOnePagePdf(jpegBytes, 1588, 2246);
  const safeName = (state.basics.name || "简历").replace(/[\\/:*?"<>|]/g, "-");
  downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), `${safeName}-简历.pdf`);
}

async function confirmExport() {
  if (elements.preflightDialog.open) elements.preflightDialog.close();
  elements.exportButton.disabled = true;
  const format = selectedExportFormat();
  elements.saveState.textContent = `正在生成 ${format.toUpperCase()}…`;
  try {
    if (format === "jpg") {
      await exportResumeAsJpg();
      elements.saveState.textContent = "JPG 已导出";
    } else {
      await exportResumeAsPdf();
      elements.saveState.textContent = "PDF 已导出";
    }
  } catch (error) {
    elements.saveState.textContent = error instanceof Error ? error.message : `${format.toUpperCase()} 导出失败`;
    console.error(error);
  } finally {
    elements.exportButton.disabled = false;
    window.setTimeout(() => { elements.saveState.textContent = "已保存在本机"; }, 2200);
  }
}

async function extractPdfText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjsLib.getDocument({
    data: bytes,
    cMapUrl: new URL("./vendor/cmaps/", import.meta.url).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("./vendor/standard_fonts/", import.meta.url).href,
    useSystemFonts: true,
    verbosity: 0,
  });
  const documentProxy = await task.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
    elements.fileStatus.textContent = `正在读取第 ${pageNumber}/${documentProxy.numPages} 页…`;
    const page = await documentProxy.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = "";
    const lines = [];
    content.items.forEach((item) => {
      line += `${item.str}${item.hasEOL ? "" : " "}`;
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trim());
        line = "";
      }
    });
    if (line.trim()) lines.push(line.trim());
    pages.push(lines.join("\n"));
  }
  return pages.join("\n\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isOcrImage(file) {
  return /^image\/(png|jpeg|webp|bmp)$/i.test(file.type) || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
}

function sortImageFiles(files) {
  return [...files].sort((first, second) => first.name.localeCompare(second.name, "zh-CN", { numeric: true, sensitivity: "base" }));
}

function validateOcrImages(files) {
  const images = sortImageFiles(files);
  if (!images.length) throw new Error("请选择 JPG、PNG、WebP 或 BMP 图片。");
  if (images.length > OCR_IMAGE_LIMIT) throw new Error(`一次最多识别 ${OCR_IMAGE_LIMIT} 张图片。`);
  const unsupported = images.find((file) => !isOcrImage(file));
  if (unsupported) throw new Error(`${unsupported.name} 不是支持的图片格式。`);
  const oversized = images.find((file) => file.size > OCR_IMAGE_MAX_BYTES);
  if (oversized) throw new Error(`${oversized.name} 超过 15MB，请先压缩后再识别。`);
  return images;
}

function ensureOcrLibrary() {
  if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
  if (ocrLibraryPromise) return ocrLibraryPromise;
  ocrLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => reject(new Error("文字识别组件加载超时，请检查网络后重试。")), 30000);
    script.src = OCR_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.Tesseract?.createWorker) resolve(window.Tesseract);
      else reject(new Error("文字识别组件未正确加载，请刷新页面重试。"));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("文字识别组件加载失败，请检查网络后重试。"));
    };
    document.head.append(script);
  }).catch((error) => {
    ocrLibraryPromise = null;
    throw error;
  });
  return ocrLibraryPromise;
}

function cleanOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").replace(/([\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g, "$1").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function comparableOcrLine(line) {
  return String(line || "").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function ocrLineSimilarity(first, second) {
  const a = comparableOcrLine(first);
  const b = comparableOcrLine(second);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length >= 6 && longer.includes(shorter) && shorter.length / longer.length >= 0.72) return 0.94;
  const pairs = (value) => Array.from({ length: Math.max(0, value.length - 1) }, (_, index) => value.slice(index, index + 2));
  const firstPairs = pairs(a);
  const secondPairs = pairs(b);
  if (!firstPairs.length || !secondPairs.length) return 0;
  const remaining = [...secondPairs];
  let matches = 0;
  firstPairs.forEach((pair) => {
    const matchIndex = remaining.indexOf(pair);
    if (matchIndex >= 0) {
      matches += 1;
      remaining.splice(matchIndex, 1);
    }
  });
  return (2 * matches) / (firstPairs.length + secondPairs.length);
}

function findOcrLineOverlap(existingLines, nextLines) {
  const maximum = Math.min(14, existingLines.length, nextLines.length);
  for (let size = maximum; size >= 1; size -= 1) {
    const previous = existingLines.slice(-size);
    const incoming = nextLines.slice(0, size);
    const scores = previous.map((line, index) => ocrLineSimilarity(line, incoming[index]));
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const minimum = Math.min(...scores);
    const singleLineIsStrong = size === 1 && comparableOcrLine(previous[0]).length >= 8 && average >= 0.92;
    if (singleLineIsStrong || (size >= 2 && average >= 0.8 && minimum >= 0.62)) return size;
  }
  return 0;
}

function mergeOcrPages(pageTexts) {
  const merged = [];
  let removed = 0;
  pageTexts.forEach((pageText) => {
    const incoming = cleanOcrText(pageText).split("\n").filter(Boolean);
    const overlap = findOcrLineOverlap(merged, incoming);
    removed += overlap;
    incoming.slice(overlap).forEach((line) => {
      const comparable = comparableOcrLine(line);
      const duplicate = comparable.length >= 6 && merged.slice(-36).some((previous) => ocrLineSimilarity(previous, line) >= 0.97);
      if (duplicate) removed += 1;
      else merged.push(line);
    });
  });
  return { text: merged.join("\n").trim(), removed };
}

async function prepareImageForOcr(file) {
  let image;
  let release = () => {};
  if (typeof createImageBitmap === "function") {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
    release = () => image.close?.();
  } else {
    const url = URL.createObjectURL(file);
    image = await new Promise((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error(`${file.name} 无法读取，请换一张图片。`));
      candidate.src = url;
    });
    release = () => URL.revokeObjectURL(url);
  }
  try {
    const width = image.width;
    const height = image.height;
    if (!width || !height) throw new Error(`${file.name} 的图片尺寸无效。`);
    const readabilityScale = width < 1400 ? 1400 / width : 1;
    const memoryScale = 3600 / Math.max(width, height);
    const scale = Math.max(0.35, Math.min(3.5, readabilityScale, memoryScale));
    if (Math.abs(scale - 1) < 0.05 && file.type !== "image/png") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法预处理图片。");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
    if (!blob) throw new Error("图片预处理失败，请重试。");
    return blob;
  } finally {
    release();
  }
}

async function recognizeImageBatch(files, updateStatus) {
  const images = validateOcrImages(files);
  updateStatus("正在加载中文识别模型，首次使用会稍慢…");
  const Tesseract = await ensureOcrLibrary();
  let currentIndex = 0;
  const worker = await Tesseract.createWorker(["chi_sim", "eng"], 1, {
    logger: (message) => {
      if (message.status !== "recognizing text") return;
      const progress = Math.max(1, Math.round((message.progress || 0) * 100));
      updateStatus(`正在识别第 ${currentIndex + 1}/${images.length} 张 · ${progress}%`);
    },
  });
  try {
    await worker.setParameters({ preserve_interword_spaces: "1", user_defined_dpi: "300" });
    const pages = [];
    for (currentIndex = 0; currentIndex < images.length; currentIndex += 1) {
      updateStatus(`正在识别第 ${currentIndex + 1}/${images.length} 张…`);
      const preparedImage = await prepareImageForOcr(images[currentIndex]);
      const result = await worker.recognize(preparedImage, { rotateAuto: true });
      pages.push(result.data.text || "");
    }
    const merged = mergeOcrPages(pages);
    if (!merged.text) throw new Error("没有识别到文字，请换一张更清晰、文字更大的图片。");
    return { ...merged, count: images.length };
  } finally {
    await worker.terminate();
  }
}

function setJobText(text) {
  elements.jobText.value = text;
  elements.jobText.dispatchEvent(new Event("input", { bubbles: true }));
}

async function handleResumeFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return;
  elements.fileStatus.textContent = "正在本地读取…";
  elements.resumeFile.disabled = true;
  try {
    let text = "";
    let label = "";
    if (files.every(isOcrImage)) {
      const result = await recognizeImageBatch(files, (status) => { elements.fileStatus.textContent = status; });
      text = result.text;
      label = `${result.count} 张图片`;
      elements.fileStatus.textContent = `已识别 ${label} · ${text.length} 字${result.removed ? ` · 合并 ${result.removed} 处重复` : ""}`;
    } else if (files.length > 1) {
      throw new Error("多文件上传只支持图片；PDF 或 TXT 请单独选择。");
    } else if (files[0].type === "application/pdf" || files[0].name.toLowerCase().endsWith(".pdf")) {
      text = await extractPdfText(files[0]);
      label = files[0].name;
    } else {
      text = await files[0].text();
      label = files[0].name;
    }
    if (!text.trim()) throw new Error("没有读到文字；扫描图片 PDF 请先转成图片后识别，或直接粘贴内容。");
    state.sourceText = text;
    elements.resumeText.value = text;
    if (!files.every(isOcrImage)) elements.fileStatus.textContent = `已读取 ${label} · ${text.length} 字`;
    scheduleSave();
  } catch (error) {
    elements.fileStatus.textContent = error instanceof Error ? error.message : "读取失败，请直接粘贴文字。";
    console.error(error);
  } finally {
    elements.resumeFile.disabled = false;
    elements.resumeFile.value = "";
  }
}

async function handleJobImages(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return;
  elements.jobOcrButton.disabled = true;
  elements.jobOcrButton.setAttribute("aria-busy", "true");
  try {
    const result = await recognizeImageBatch(files, (status) => { elements.jobOcrStatus.textContent = status; });
    const existing = elements.jobText.value.trim();
    const combined = mergeOcrPages(existing ? [existing, result.text] : [result.text]);
    setJobText(combined.text);
    const removed = result.removed + combined.removed;
    elements.jobOcrStatus.textContent = `已识别 ${result.count} 张 · ${combined.text.length} 字${removed ? ` · 合并 ${removed} 处重复` : ""}`;
  } catch (error) {
    elements.jobOcrStatus.textContent = error instanceof Error ? error.message : "识别失败，请重试。";
    console.error(error);
  } finally {
    elements.jobOcrButton.disabled = false;
    elements.jobOcrButton.removeAttribute("aria-busy");
    elements.jobImageFiles.value = "";
  }
}

async function imageFileToDataUrl(file, maxDimension = 1200, quality = 0.84) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const candidate = new Image();
    const timeout = window.setTimeout(() => reject(new Error("图片读取超时，请换一张图片重试。")), 10000);
    candidate.onload = () => {
      window.clearTimeout(timeout);
      resolve(candidate);
    };
    candidate.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("浏览器无法识别这张图片。"));
    };
    candidate.src = dataUrl;
  });
  if (!image.width || !image.height) throw new Error("图片尺寸无效。");
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * ratio);
  canvas.height = Math.round(image.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理这张图片。");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function imageFileToItem(file) {
  return {
    src: await imageFileToDataUrl(file),
    caption: file.name.replace(/\.[^.]+$/, ""),
  };
}

elements.resumeText.addEventListener("input", () => {
  state.sourceText = elements.resumeText.value;
  scheduleSave();
});
elements.jobText.addEventListener("input", () => {
  state.jobText = elements.jobText.value;
  state.jobTips = [];
  elements.sortStatus.textContent = "";
  renderJobTips();
  renderModuleList();
  scheduleSave();
});
elements.resumeFile.addEventListener("change", () => handleResumeFiles(elements.resumeFile.files));
elements.jobOcrButton.addEventListener("click", () => elements.jobImageFiles.click());
elements.jobImageFiles.addEventListener("change", () => handleJobImages(elements.jobImageFiles.files));
["dragenter", "dragover"].forEach((eventName) => elements.fileDrop.addEventListener(eventName, () => elements.fileDrop.classList.add("is-dragging")));
["dragleave", "drop"].forEach((eventName) => elements.fileDrop.addEventListener(eventName, () => elements.fileDrop.classList.remove("is-dragging")));

[
  [elements.basicName, "name"],
  [elements.basicTitle, "title"],
  [elements.basicPhone, "phone"],
  [elements.basicEmail, "email"],
  [elements.basicEducation, "education"],
].forEach(([input, key]) => input.addEventListener("input", () => {
  state.basics[key] = input.value;
  renderResume();
  scheduleSave();
}));

elements.fontScale.addEventListener("change", () => {
  state.settings.fontScale = elements.fontScale.value;
  renderResume();
  scheduleSave();
});
elements.density.addEventListener("change", () => {
  state.settings.density = elements.density.value;
  renderResume();
  scheduleSave();
});
elements.resumeStyle.addEventListener("change", () => {
  state.settings.style = allowedStyles.has(elements.resumeStyle.value) ? elements.resumeStyle.value : "classic";
  renderResume();
  scheduleSave();
});
elements.resumePalette.addEventListener("change", () => {
  state.settings.palette = allowedPalettes.has(elements.resumePalette.value) ? elements.resumePalette.value : "coffee";
  elements.paletteSwatches.dataset.palette = state.settings.palette;
  renderResume();
  scheduleSave();
});

function showAvatarStatus(message, kind = "neutral") {
  elements.avatarStatus.textContent = message;
  elements.avatarStatus.className = `field-hint avatar-status${kind === "error" ? " is-error" : kind === "success" ? " is-success" : ""}`;
}

function openAvatarPicker() {
  if (!elements.avatarUpload.disabled) elements.avatarUpload.click();
}

elements.avatarUploadButton.addEventListener("click", openAvatarPicker);
elements.avatarPreview.addEventListener("click", openAvatarPicker);
elements.avatarUpload.addEventListener("change", async () => {
  const file = elements.avatarUpload.files?.[0];
  if (!file) return;
  const supportedType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const supportedName = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!supportedType && !supportedName) {
    showAvatarStatus("这张图片格式暂不支持。请改用 JPG、PNG 或 WebP；HEIC 可先在“预览”中导出为 JPG。", "error");
    elements.avatarUpload.value = "";
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    showAvatarStatus("图片超过 12 MB。请压缩后再选择。", "error");
    elements.avatarUpload.value = "";
    return;
  }
  elements.avatarUpload.disabled = true;
  elements.avatarUploadButton.disabled = true;
  elements.avatarUploadButton.setAttribute("aria-busy", "true");
  elements.avatarUploadButton.textContent = "正在处理…";
  showAvatarStatus("正在本机读取并压缩头像…");
  try {
    state.avatar.src = await imageFileToDataUrl(file, 800, 0.86);
    renderAll();
    showAvatarStatus("头像已插入，并已保存在当前浏览器。", "success");
  } catch (error) {
    showAvatarStatus(`${error instanceof Error ? error.message : "图片插入失败。"} 请改用 JPG、PNG 或 WebP。`, "error");
  } finally {
    elements.avatarUpload.disabled = false;
    elements.avatarUploadButton.disabled = false;
    elements.avatarUploadButton.removeAttribute("aria-busy");
    elements.avatarUploadButton.textContent = state.avatar.src ? "更换头像" : "选择头像";
    elements.avatarUpload.value = "";
  }
});
elements.avatarShape.addEventListener("change", () => {
  state.avatar.shape = elements.avatarShape.value === "rounded" ? "rounded" : "circle";
  renderAll();
});
elements.avatarSize.addEventListener("input", () => {
  state.avatar.size = Math.min(136, Math.max(64, Number(elements.avatarSize.value) || 92));
  elements.avatarSizeValue.value = `${state.avatar.size} px`;
  elements.avatarPreview.style.setProperty("--avatar-editor-size", `${Math.min(112, state.avatar.size)}px`);
  renderResume();
  scheduleSave();
});
elements.avatarSize.addEventListener("change", scheduleSave);
elements.removeAvatarButton.addEventListener("click", () => {
  if (!state.avatar.src) return;
  showUndo("已移除头像");
  state.avatar.src = "";
  renderAll();
  showAvatarStatus("头像已移除。可重新选择 JPG、PNG 或 WebP。");
});
elements.moduleTitleInput.addEventListener("input", () => {
  const module = state.modules.find((item) => item.id === selectedModuleId);
  if (!module) return;
  module.title = elements.moduleTitleInput.value;
  renderModuleList();
  renderResume();
  scheduleSave();
});
elements.moduleContentInput.addEventListener("input", () => {
  const module = state.modules.find((item) => item.id === selectedModuleId);
  if (!module) return;
  module.items = normalizeItems(module.type, parseModuleContent(module.type, elements.moduleContentInput.value));
  renderResume();
  scheduleSave();
});
elements.moduleContentInput.addEventListener("blur", () => {
  const module = state.modules.find((item) => item.id === selectedModuleId);
  if (module) renderStructuredEditor(module);
});
[elements.moduleTitleVisible, elements.moduleMetricIconsVisible, elements.moduleEmphasis, elements.moduleSpacing, elements.moduleColumns, elements.moduleBulletStyle].forEach((control) => {
  control.addEventListener("change", () => {
    const module = state.modules.find((item) => item.id === selectedModuleId);
    if (!module) return;
    module.options = normalizeModuleOptions(module.type, {
      titleVisible: elements.moduleTitleVisible.checked,
      metricIconsVisible: elements.moduleMetricIconsVisible.checked,
      emphasis: elements.moduleEmphasis.value,
      spacing: elements.moduleSpacing.value,
      columns: elements.moduleColumns.value,
      bulletStyle: elements.moduleBulletStyle.value,
    });
    renderStructuredEditor(module);
    renderResume();
    scheduleSave();
  });
});
elements.imageUpload.addEventListener("change", async () => {
  const module = state.modules.find((item) => item.id === selectedModuleId && item.type === "images");
  if (!module) return;
  elements.imageUpload.disabled = true;
  try {
    for (const file of Array.from(elements.imageUpload.files ?? [])) module.items.push(await imageFileToItem(file));
    renderAll();
  } finally {
    elements.imageUpload.disabled = false;
    elements.imageUpload.value = "";
  }
});

elements.addModuleButton.addEventListener("click", () => {
  showUndo("已添加模块");
  const id = `custom-${Date.now()}`;
  state.modules.push({
    id,
    type: "list",
    title: "补充信息",
    enabled: true,
    options: normalizeModuleOptions("list"),
    items: ["点击这里编辑内容"],
  });
  selectedModuleId = id;
  renderAll();
  requestAnimationFrame(() => elements.moduleTitleInput.focus());
});
elements.duplicateModuleButton.addEventListener("click", () => {
  const index = state.modules.findIndex((item) => item.id === selectedModuleId);
  if (index < 0) return;
  showUndo(`已复制“${state.modules[index].title}”`);
  const copy = clone(state.modules[index]);
  copy.id = `${copy.id}-copy-${Date.now()}`;
  copy.title = `${copy.title}副本`.slice(0, 60);
  state.modules.splice(index + 1, 0, copy);
  selectedModuleId = copy.id;
  renderAll();
});
elements.deleteModuleButton.addEventListener("click", () => {
  const index = state.modules.findIndex((item) => item.id === selectedModuleId);
  if (index < 0) return;
  showUndo(`已删除“${state.modules[index].title}”`);
  state.modules.splice(index, 1);
  selectedModuleId = state.modules[Math.min(index, state.modules.length - 1)]?.id ?? null;
  renderAll();
});
elements.sortByJobButton.addEventListener("click", sortItemsByJob);
elements.jobTipsToggle.addEventListener("click", () => setTipsExpanded(elements.jobTipsToggle.getAttribute("aria-expanded") !== "true"));
elements.refreshTipsButton.addEventListener("click", () => {
  state.jobTips = [];
  renderJobTips();
  scheduleSave();
});
elements.gptFlowButton.addEventListener("click", openGptDialog);
elements.mobileGptButton.addEventListener("click", openGptDialog);
elements.copyPromptButton.addEventListener("click", copyPrompt);
elements.applyGptButton.addEventListener("click", applySelectedGptChanges);
elements.selectSafeChangesButton.addEventListener("click", () => {
  elements.gptDiffList.querySelectorAll(".gpt-diff-check").forEach((check) => {
    check.checked = check.dataset.risk !== "true";
  });
  updateGptReviewSummary();
});
elements.clearGptChangesButton.addEventListener("click", () => {
  elements.gptDiffList.querySelectorAll(".gpt-diff-check").forEach((check) => { check.checked = false; });
  updateGptReviewSummary();
});
elements.gptResponseInput.addEventListener("input", () => {
  pendingGptReview = null;
  elements.gptReviewSection.hidden = true;
  elements.gptDiffList.replaceChildren();
  elements.applyGptButton.disabled = false;
  elements.applyGptButton.textContent = "查看修改对比";
  elements.gptParseStatus.hidden = true;
});
elements.exportButton.addEventListener("click", openPreflightDialog);
document.querySelectorAll('input[name="exportFormat"]').forEach((radio) => radio.addEventListener("change", () => {
  updateExportButtonLabel(buildPreflightChecks().filter((check) => check.status !== "pass").length);
}));
elements.confirmExportButton.addEventListener("click", confirmExport);

elements.resumePrintRoot.addEventListener("click", (event) => {
  const module = event.target.closest(".resume-module[data-module-id]");
  if (module) selectModuleFromPreview(module.dataset.moduleId);
  else if (event.target.closest(".resume-header")) selectBasicsFromPreview();
});

elements.resumePrintRoot.addEventListener("keydown", (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const module = event.target.closest(".resume-module[data-module-id]");
  if (!module && !event.target.closest(".resume-header")) return;
  event.preventDefault();
  if (module) selectModuleFromPreview(module.dataset.moduleId);
  else selectBasicsFromPreview();
});

function applyLayoutWidths() {
  if (!window.matchMedia("(min-width: 70rem)").matches) {
    elements.workbench.style.removeProperty("--source-width");
    elements.workbench.style.removeProperty("--editor-width");
    return;
  }
  const available = Math.max(900, elements.workbench.clientWidth - 16);
  const source = Math.min(available * 0.34, Math.max(220, layoutWidths.source || available * 0.22));
  const editor = Math.min(available * 0.38, Math.max(280, layoutWidths.editor || available * 0.27));
  const preview = available - source - editor;
  const minimumPreview = 420;
  const overflow = Math.max(0, minimumPreview - preview);
  const sourceAdjusted = Math.max(220, source - overflow / 2);
  const editorAdjusted = Math.max(280, editor - overflow / 2);
  layoutWidths = { source: sourceAdjusted, editor: editorAdjusted };
  elements.workbench.style.setProperty("--source-width", `${sourceAdjusted}px`);
  elements.workbench.style.setProperty("--editor-width", `${editorAdjusted}px`);
  elements.sourceResizer.setAttribute("aria-valuenow", String(Math.round(sourceAdjusted)));
  elements.editorResizer.setAttribute("aria-valuenow", String(Math.round(editorAdjusted)));
  requestAnimationFrame(updatePreviewSize);
}

function saveLayoutWidths() {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutWidths));
}

function bindColumnResizer(handle, side) {
  const adjust = (delta) => {
    const available = Math.max(900, elements.workbench.clientWidth - 16);
    if (side === "source") layoutWidths.source = Math.min(available * 0.34, Math.max(220, (layoutWidths.source || 260) + delta));
    else layoutWidths.editor = Math.min(available * 0.38, Math.max(280, (layoutWidths.editor || 340) - delta));
    applyLayoutWidths();
  };
  handle.addEventListener("pointerdown", (event) => {
    if (!window.matchMedia("(min-width: 70rem)").matches) return;
    const startX = event.clientX;
    const start = { ...layoutWidths };
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("is-dragging");
    document.body.classList.add("is-resizing-columns");
    const move = (moveEvent) => {
      layoutWidths = { ...start };
      adjust(moveEvent.clientX - startX);
    };
    const end = () => {
      handle.classList.remove("is-dragging");
      document.body.classList.remove("is-resizing-columns");
      saveLayoutWidths();
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  });
  handle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") {
      layoutWidths[side] = null;
      applyLayoutWidths();
    } else {
      adjust(event.key === "ArrowRight" ? 16 : -16);
    }
    saveLayoutWidths();
  });
}

bindColumnResizer(elements.sourceResizer, "source");
bindColumnResizer(elements.editorResizer, "editor");

function showUndo(message) {
  undoState = clone(state);
  elements.undoMessage.textContent = message;
  elements.undoBar.hidden = false;
  elements.panelUndoButton.disabled = false;
  window.clearTimeout(undoTimer);
  undoTimer = window.setTimeout(() => {
    elements.undoBar.hidden = true;
    elements.panelUndoButton.disabled = !undoState;
  }, 6000);
}

elements.resetButton.addEventListener("click", () => {
  showUndo("已清空工作台内容");
  state = clone(defaultState);
  selectedModuleId = state.modules[0].id;
  renderAll();
});
function restoreUndoState() {
  if (!undoState) return;
  state = undoState;
  undoState = null;
  selectedModuleId = state.modules[0]?.id ?? null;
  elements.undoBar.hidden = true;
  elements.panelUndoButton.disabled = true;
  renderAll();
}

elements.undoButton.addEventListener("click", restoreUndoState);
elements.panelUndoButton.addEventListener("click", restoreUndoState);

window.addEventListener("resize", () => {
  applyLayoutWidths();
  updatePreviewSize();
});
if ("ResizeObserver" in window) new ResizeObserver(updatePreviewSize).observe(elements.resumePrintRoot);

applyLayoutWidths();
renderAll();
