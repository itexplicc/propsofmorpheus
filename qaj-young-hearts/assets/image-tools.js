(() => {
  "use strict";

  const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp"]);

  const baseName = name => String(name || "image")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "image";

  const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image conversion failed")), type, quality);
  });

  async function decode(file) {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(ctx, width, height) { ctx.drawImage(bitmap, 0, 0, width, height); },
        close() { bitmap.close?.(); }
      };
    }

    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "async";
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("The image could not be opened"));
        image.src = url;
      });
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        draw(ctx, width, height) { ctx.drawImage(image, 0, 0, width, height); },
        close() {}
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function optimize(file, options = {}) {
    if (!(file instanceof File) || !SUPPORTED.has(file.type)) {
      return { file, changed: false, originalBytes: file?.size || 0, optimizedBytes: file?.size || 0, savingsPercent: 0 };
    }

    const maxDimension = Math.max(720, Number(options.maxDimension) || 1800);
    const targetBytes = Math.max(180 * 1024, Number(options.targetBytes) || 900 * 1024);
    const triggerBytes = Math.max(250 * 1024, Number(options.triggerBytes) || 650 * 1024);
    const startQuality = Math.min(.92, Math.max(.68, Number(options.quality) || .86));
    const minQuality = Math.min(startQuality, Math.max(.48, Number(options.minQuality) || .58));

    const source = await decode(file);
    try {
      const longest = Math.max(source.width, source.height);
      const needsResize = longest > maxDimension;
      const needsCompression = file.size > triggerBytes || file.type !== "image/webp" || needsResize;
      if (!needsCompression) {
        return { file, changed: false, originalBytes: file.size, optimizedBytes: file.size, savingsPercent: 0, width: source.width, height: source.height };
      }

      let scale = Math.min(1, maxDimension / longest);
      let best = null;
      let bestWidth = 0;
      let bestHeight = 0;

      for (let resizePass = 0; resizePass < 4; resizePass += 1) {
        const width = Math.max(1, Math.round(source.width * scale));
        const height = Math.max(1, Math.round(source.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) throw new Error("Image conversion is not supported by this browser");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        source.draw(ctx, width, height);

        for (let quality = startQuality; quality >= minQuality - .001; quality -= .07) {
          const blob = await canvasBlob(canvas, "image/webp", Number(quality.toFixed(2)));
          if (!best || blob.size < best.size) {
            best = blob;
            bestWidth = width;
            bestHeight = height;
          }
          if (blob.size <= targetBytes) break;
        }

        canvas.width = 1;
        canvas.height = 1;
        if (best?.size <= targetBytes || width <= 900 || height <= 900) break;
        scale *= .82;
      }

      if (!best || (file.type === "image/webp" && best.size >= file.size && !needsResize)) {
        return { file, changed: false, originalBytes: file.size, optimizedBytes: file.size, savingsPercent: 0, width: source.width, height: source.height };
      }

      const optimized = new File([best], `${baseName(file.name)}.webp`, {
        type: "image/webp",
        lastModified: Date.now()
      });
      return {
        file: optimized,
        changed: true,
        originalBytes: file.size,
        optimizedBytes: optimized.size,
        savingsPercent: Math.max(0, Math.round((1 - optimized.size / file.size) * 100)),
        width: bestWidth,
        height: bestHeight
      };
    } finally {
      source.close();
    }
  }

  function putInInput(input, file) {
    if (!input || !(file instanceof File) || typeof DataTransfer === "undefined") return false;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    return true;
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  window.QAJ_IMAGE_TOOLS = Object.freeze({ optimize, putInInput, formatBytes, supportedTypes: [...SUPPORTED] });
})();
