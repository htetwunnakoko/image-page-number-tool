const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const imageGrid = document.querySelector("#imageGrid");
const emptyState = document.querySelector("#emptyState");

const totalImages = document.querySelector("#totalImages");
const orderMode = document.querySelector("#orderMode");
const statusPill = document.querySelector("#statusPill");

const sortBtn = document.querySelector("#sortBtn");
const clearBtn = document.querySelector("#clearBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const themeBtn = document.querySelector("#themeBtn");
const themeLabel = document.querySelector("#themeLabel");

const startNumberInput = document.querySelector("#startNumber");
const fontSizeInput = document.querySelector("#fontSize");
const fontSizeLabel = document.querySelector("#fontSizeLabel");
const paddingSizeInput = document.querySelector("#paddingSize");
const numberLanguage = document.querySelector("#numberLanguage");
const badgeStyle = document.querySelector("#badgeStyle");
const zipNameInput = document.querySelector("#zipName");

const progressOverlay = document.querySelector("#progressOverlay");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");

const template = document.querySelector("#imageCardTemplate");

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const myanmarDigits = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

const state = {
  images: [],
  draggedId: null,
  currentOrderMode: "Auto",
};

imageInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
  imageInput.value = "";
});

dropZone.addEventListener("click", (event) => {
  if (event.target.closest(".btn-upload") || event.currentTarget === dropZone) {
    imageInput.click();
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  handleFiles(event.dataTransfer.files);
});

sortBtn.addEventListener("click", () => {
  naturalSortImages();
  state.currentOrderMode = "Auto";
  render();
  showToast("Images sorted naturally by filename.");
});

clearBtn.addEventListener("click", () => {
  revokePreviewUrls();
  state.images = [];
  state.currentOrderMode = "Auto";
  render();
  showToast("All images cleared.");
});

downloadBtn.addEventListener("click", async () => {
  await downloadZip();
});

themeBtn.addEventListener("click", () => {
  const html = document.documentElement;
  const nextTheme = html.dataset.theme === "dark" ? "light" : "dark";
  html.dataset.theme = nextTheme;
  themeLabel.textContent = nextTheme === "dark" ? "Dark" : "Light";
  localStorage.setItem("pageNumberStudioTheme", nextTheme);
});

[startNumberInput, fontSizeInput, paddingSizeInput, numberLanguage, badgeStyle].forEach((input) => {
  input.addEventListener("input", () => {
    updateRangeLabels();
    renderPageNumbers();
    applyBadgeStyles();
  });
});

loadSavedTheme();
render();

function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  const validFiles = files.filter((file) => allowedTypes.has(file.type));

  if (!validFiles.length) {
    showToast("Please upload PNG, JPG, JPEG, or WEBP images only.", "error");
    return;
  }

  const skippedCount = files.length - validFiles.length;
  const newImages = validFiles.map((file) => ({
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: URL.createObjectURL(file),
  }));

  state.images.push(...newImages);
  naturalSortImages();
  state.currentOrderMode = "Auto";
  render();

  const message = skippedCount > 0
    ? `${newImages.length} image(s) uploaded. ${skippedCount} unsupported file(s) skipped.`
    : `${newImages.length} image(s) uploaded and naturally sorted.`;

  showToast(message, skippedCount > 0 ? "error" : "success");
}

function naturalSortImages() {
  state.images.sort((a, b) => naturalCollator.compare(a.name, b.name));
}

function render() {
  imageGrid.innerHTML = "";
  emptyState.hidden = state.images.length > 0;

  state.images.forEach((image, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const img = card.querySelector("img");
    const badge = card.querySelector(".page-badge");
    const fileName = card.querySelector(".file-name");
    const fileMeta = card.querySelector(".file-meta");
    const orderNumber = card.querySelector(".order-number");

    card.dataset.id = image.id;
    img.src = image.previewUrl;
    img.alt = image.name;
    badge.textContent = getDisplayPageNumber(index);
    fileName.textContent = image.name;
    fileMeta.textContent = `${formatBytes(image.size)} • ${image.type.replace("image/", "").toUpperCase()}`;
    orderNumber.textContent = `#${index + 1}`;

    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
    card.addEventListener("dragover", handleDragOver);
    card.addEventListener("drop", handleDrop);

    imageGrid.appendChild(card);
  });

  updateButtons();
  updateRangeLabels();
  applyBadgeStyles();
}

function renderPageNumbers() {
  const cards = imageGrid.querySelectorAll(".image-card");

  cards.forEach((card, index) => {
    const badge = card.querySelector(".page-badge");
    const orderNumber = card.querySelector(".order-number");

    badge.textContent = getDisplayPageNumber(index);
    orderNumber.textContent = `#${index + 1}`;
  });

  updateButtons();
}

function applyBadgeStyles() {
  const size = Number.parseInt(fontSizeInput.value, 10) || 18;
  const padding = Number.parseInt(paddingSizeInput.value, 10) || 14;
  const style = badgeStyle.value;

  imageGrid.querySelectorAll(".image-card").forEach((card) => {
    card.classList.toggle("badge-dark", style === "dark");
    card.classList.toggle("badge-plain", style === "plain");
    card.style.setProperty("--badge-font-size", `${size}px`);
    card.style.setProperty("--badge-padding", `${padding}px`);
  });
}

function getPageNumber(index) {
  const startNumber = Number.parseInt(startNumberInput.value, 10);
  const safeStart = Number.isFinite(startNumber) ? startNumber : 1;
  return safeStart + index;
}

function getDisplayPageNumber(index) {
  const number = getPageNumber(index);
  return numberLanguage.value === "myanmar" ? toMyanmarNumber(number) : String(number);
}

function toMyanmarNumber(value) {
  return String(value).replace(/\d/g, (digit) => myanmarDigits[Number(digit)]);
}

function updateButtons() {
  const hasImages = state.images.length > 0;

  totalImages.textContent = state.images.length;
  orderMode.textContent = state.currentOrderMode;
  statusPill.textContent = hasImages
    ? `${state.images.length} image${state.images.length === 1 ? "" : "s"} ready`
    : "Waiting for upload";

  sortBtn.disabled = !hasImages;
  clearBtn.disabled = !hasImages;
  downloadBtn.disabled = !hasImages;
}

function updateRangeLabels() {
  fontSizeLabel.value = fontSizeInput.value;
}

function handleDragStart(event) {
  const card = event.currentTarget;
  state.draggedId = card.dataset.id;
  card.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", state.draggedId);
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  state.draggedId = null;
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleDrop(event) {
  event.preventDefault();

  const targetCard = event.currentTarget;
  const targetId = targetCard.dataset.id;
  const sourceId = state.draggedId || event.dataTransfer.getData("text/plain");

  if (!sourceId || sourceId === targetId) return;

  const sourceIndex = state.images.findIndex((image) => image.id === sourceId);
  const targetIndex = state.images.findIndex((image) => image.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) return;

  const [movedImage] = state.images.splice(sourceIndex, 1);
  state.images.splice(targetIndex, 0, movedImage);

  state.currentOrderMode = "Manual";
  render();
}

async function downloadZip() {
  if (!state.images.length) return;

  if (!window.JSZip) {
    showToast("JSZip is not loaded. Check your internet connection or use local jszip.min.js.", "error");
    return;
  }

  showProgress(true, "Preparing images...", 0);

  try {
    const zip = new JSZip();

    for (let index = 0; index < state.images.length; index++) {
      const image = state.images[index];
      const pageNumber = getDisplayPageNumber(index);

      showProgress(
        true,
        `Processing ${index + 1} of ${state.images.length}: ${image.name}`,
        Math.round((index / state.images.length) * 80)
      );

      const blob = await createNumberedImageBlob(image.file, pageNumber);
      const filename = createOutputFileName(index, image.name, image.type);

      zip.file(filename, blob);
    }

    showProgress(true, "Compressing ZIP file...", 88);

    const zipBlob = await zip.generateAsync(
      { type: "blob" },
      (metadata) => {
        const zipProgress = 88 + Math.round(metadata.percent * 0.12);
        showProgress(true, "Compressing ZIP file...", Math.min(100, zipProgress));
      }
    );

    triggerDownload(zipBlob, normaliseZipName(zipNameInput.value));
    showToast("ZIP file created successfully.");
  } catch (error) {
    console.error(error);
    showToast("Something went wrong while creating the ZIP file.", "error");
  } finally {
    showProgress(false);
  }
}

async function createNumberedImageBlob(file, pageNumberText) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  context.drawImage(image, 0, 0);

  const fontSize = Number.parseInt(fontSizeInput.value, 10) || 18;
  const padding = Number.parseInt(paddingSizeInput.value, 10) || 14;
  const style = badgeStyle.value;

  const fontFamily = numberLanguage.value === "myanmar"
    ? '"Noto Sans Myanmar", "Myanmar Text", Padauk, Arial, sans-serif'
    : "Arial, sans-serif";

  context.font = `800 ${fontSize}px ${fontFamily}`;
  context.textBaseline = "top";

  const text = String(pageNumberText);
  const metrics = context.measureText(text);
  const textWidth = metrics.width;

  const boxWidth = textWidth + Math.round(fontSize * 0.78);
  const boxHeight = fontSize + Math.round(fontSize * 0.52);
  const x = canvas.width - boxWidth - padding;
  const y = padding;

  if (style !== "plain") {
    drawRoundRect(context, x, y, boxWidth, boxHeight, Math.max(6, fontSize * 0.48));
    context.fillStyle = style === "dark"
      ? "rgba(15, 23, 42, 0.86)"
      : "rgba(255, 255, 255, 0.90)";
    context.fill();
  }

  context.fillStyle = style === "dark" || style === "plain" ? "#ffffff" : "#111827";

  if (style === "plain") {
    context.shadowColor = "rgba(0, 0, 0, 0.75)";
    context.shadowBlur = 8;
    context.shadowOffsetY = 2;
    context.fillText(text, canvas.width - textWidth - padding, y);
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
  } else {
    context.fillText(
      text,
      x + (boxWidth - textWidth) / 2,
      y + Math.round(fontSize * 0.21)
    );
  }

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const quality = outputType === "image/jpeg" ? 0.93 : undefined;

  return await canvasToBlob(canvas, outputType, quality);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Cannot load image: ${file.name}`));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed."));
      },
      type,
      quality
    );
  });
}

function drawRoundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function createOutputFileName(index, originalName, mimeType) {
  const page = String(getPageNumber(index)).padStart(3, "0");
  const cleanName = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.\-()\[\]\s]/g, "_")
    .trim() || `image_${page}`;

  const extension = mimeType === "image/png" ? "png" : "jpg";
  return `${page}_${cleanName}.${extension}`;
}

function normaliseZipName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "numbered-images.zip";
  return trimmed.toLowerCase().endsWith(".zip") ? trimmed : `${trimmed}.zip`;
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showProgress(visible, text = "", percent = 0) {
  progressOverlay.hidden = !visible;

  if (!visible) {
    progressBar.style.width = "0%";
    progressText.textContent = "Preparing images...";
    return;
  }

  progressText.textContent = text;
  progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function revokePreviewUrls() {
  state.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
}

function showToast(message, type = "success") {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3400);
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem("pageNumberStudioTheme");
  const theme = savedTheme === "light" ? "light" : "dark";

  document.documentElement.dataset.theme = theme;
  themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
}
