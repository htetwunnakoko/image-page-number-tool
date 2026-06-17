const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const imageGrid = document.querySelector("#imageGrid");
const emptyState = document.querySelector("#emptyState");
const imageCount = document.querySelector("#imageCount");
const sortStatus = document.querySelector("#sortStatus");
const sortBtn = document.querySelector("#sortBtn");
const clearBtn = document.querySelector("#clearBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const startNumberInput = document.querySelector("#startNumber");
const fontSizeInput = document.querySelector("#fontSize");
const fontSizeLabel = document.querySelector("#fontSizeLabel");
const paddingSizeInput = document.querySelector("#paddingSize");
const paddingSizeLabel = document.querySelector("#paddingSizeLabel");
const zipNameInput = document.querySelector("#zipName");
const template = document.querySelector("#imageCardTemplate");

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const state = {
  images: [],
  draggedId: null,
};

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

imageInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
  imageInput.value = "";
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
  render();
  showToast("Images sorted naturally by filename.");
});

clearBtn.addEventListener("click", () => {
  revokePreviewUrls();
  state.images = [];
  render();
  showToast("All images cleared.");
});

downloadBtn.addEventListener("click", async () => {
  await downloadZip();
});

[startNumberInput, fontSizeInput, paddingSizeInput].forEach((input) => {
  input.addEventListener("input", () => {
    updateRangeLabels();
    renderPageNumbers();
  });
});

function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  const validFiles = files.filter((file) => allowedTypes.has(file.type));

  if (!validFiles.length) {
    showToast("Please upload PNG, JPG, JPEG, or WEBP images only.", "error");
    return;
  }

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
  render();
  showToast(`${newImages.length} image(s) uploaded and naturally sorted.`);
}

function naturalSortImages() {
  state.images.sort((a, b) => naturalCollator.compare(a.name, b.name));
  sortStatus.textContent = "Sorted by natural filename order";
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

    card.dataset.id = image.id;
    img.src = image.previewUrl;
    img.alt = image.name;
    badge.textContent = getPageNumber(index);
    fileName.textContent = image.name;
    fileMeta.textContent = `${formatBytes(image.size)} • ${image.type.replace("image/", "").toUpperCase()}`;

    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
    card.addEventListener("dragover", handleDragOver);
    card.addEventListener("drop", handleDrop);

    imageGrid.appendChild(card);
  });

  updateButtons();
  updateRangeLabels();
}

function renderPageNumbers() {
  const badges = imageGrid.querySelectorAll(".page-badge");
  badges.forEach((badge, index) => {
    badge.textContent = getPageNumber(index);
  });
}

function getPageNumber(index) {
  const startNumber = Number.parseInt(startNumberInput.value, 10);
  const safeStart = Number.isFinite(startNumber) ? startNumber : 1;
  return safeStart + index;
}

function updateButtons() {
  const hasImages = state.images.length > 0;
  imageCount.textContent = `${state.images.length} image${state.images.length === 1 ? "" : "s"}`;
  sortBtn.disabled = !hasImages;
  clearBtn.disabled = !hasImages;
  downloadBtn.disabled = !hasImages;
}

function updateRangeLabels() {
  fontSizeLabel.value = fontSizeInput.value;
  paddingSizeLabel.value = paddingSizeInput.value;
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

  sortStatus.textContent = "Manual order active";
  render();
}

async function downloadZip() {
  if (!state.images.length) return;

  if (!window.JSZip) {
    showToast("JSZip is not loaded. Check your internet or use local jszip.min.js.", "error");
    return;
  }

  document.body.classList.add("processing");
  downloadBtn.textContent = "Creating ZIP...";

  try {
    const zip = new JSZip();

    for (let index = 0; index < state.images.length; index++) {
      const image = state.images[index];
      const pageNumber = getPageNumber(index);
      const blob = await createNumberedImageBlob(image.file, pageNumber);
      const filename = createOutputFileName(index, image.name, image.type);

      zip.file(filename, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipFileName = normaliseZipName(zipNameInput.value);
    triggerDownload(zipBlob, zipFileName);
    showToast("ZIP file created successfully.");
  } catch (error) {
    console.error(error);
    showToast("Something went wrong while creating the ZIP file.", "error");
  } finally {
    document.body.classList.remove("processing");
    downloadBtn.textContent = "Download ZIP";
  }
}

async function createNumberedImageBlob(file, pageNumber) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  context.drawImage(image, 0, 0);

  const fontSize = Number.parseInt(fontSizeInput.value, 10) || 18;
  const padding = Number.parseInt(paddingSizeInput.value, 10) || 14;
  const text = String(pageNumber);

  context.font = `700 ${fontSize}px Arial, sans-serif`;
  context.textBaseline = "top";

  const metrics = context.measureText(text);
  const boxWidth = metrics.width + Math.round(fontSize * 0.75);
  const boxHeight = fontSize + Math.round(fontSize * 0.45);

  const x = canvas.width - boxWidth - padding;
  const y = padding;

  drawRoundRect(context, x, y, boxWidth, boxHeight, Math.max(6, fontSize * 0.45));
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.fill();

  context.fillStyle = "#111827";
  context.fillText(
    text,
    x + (boxWidth - metrics.width) / 2,
    y + Math.round(fontSize * 0.19)
  );

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const quality = outputType === "image/jpeg" ? 0.92 : undefined;

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
  }, 3200);
}
