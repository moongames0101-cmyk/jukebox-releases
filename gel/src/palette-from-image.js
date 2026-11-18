/* Reads a picture the person picks, shrinks it for use as a background,
   and pulls a background, text and accent colour out of it. */
(function (root) {
  const C = root.Gel.color;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Gel couldn't read that picture. Try a JPG or PNG.")); };
      img.src = url;
    });
  }

  function resizeToDataUrl(img, maxW = 1600, quality = 0.82) {
    const scale = Math.min(1, maxW / img.naturalWidth);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    return cv.toDataURL('image/jpeg', quality);
  }

  function samplePixels(img, size = 72) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const px = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      px.push([data[i], data[i + 1], data[i + 2]]);
    }
    return px;
  }

  function kmeans(px, k = 6, iters = 12) {
    if (!px.length) return [];
    // Spread the starting centres across the picture's brightness range
    const sorted = px.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    let centres = Array.from({ length: k }, (_, i) => sorted[Math.floor((i + 0.5) * sorted.length / k)].slice());
    let counts = new Array(k).fill(0);
    for (let it = 0; it < iters; it++) {
      const sums = centres.map(() => [0, 0, 0]);
      counts = new Array(k).fill(0);
      for (const p of px) {
        let best = 0, bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const d = (p[0] - centres[c][0]) ** 2 + (p[1] - centres[c][1]) ** 2 + (p[2] - centres[c][2]) ** 2;
          if (d < bestD) { bestD = d; best = c; }
        }
        sums[best][0] += p[0]; sums[best][1] += p[1]; sums[best][2] += p[2];
        counts[best]++;
      }
      centres = centres.map((c, i) => counts[i] ? sums[i].map(v => v / counts[i]) : c);
    }
    return centres.map((c, i) => {
      const hex = C.rgbToHex({ r: c[0], g: c[1], b: c[2] });
      return { hex, count: counts[i], hsl: C.rgbToHsl(C.hexToRgb(hex)) };
    }).filter(c => c.count > 0);
  }

  function fromHsl(h, s, l) { return C.rgbToHex(C.hslToRgb({ h, s: C.clamp(s, 0, 1), l: C.clamp(l, 0, 1) })); }

  function seedFromClusters(clusters, mode) {
    const total = clusters.reduce((n, c) => n + c.count, 0) || 1;
    const share = c => c.count / total;

    // Accent: the most colourful cluster that isn't a tiny speck
    const colourful = clusters.filter(c => share(c) > 0.03 && c.hsl.l > 0.18 && c.hsl.l < 0.85);
    let accentC = colourful.sort((a, b) => (b.hsl.s * Math.pow(share(b), 0.25)) - (a.hsl.s * Math.pow(share(a), 0.25)))[0]
      || clusters.slice().sort((a, b) => b.hsl.s - a.hsl.s)[0];

    if (mode === 'dark') {
      const bgC = clusters.filter(c => share(c) > 0.06).sort((a, b) => a.hsl.l - b.hsl.l)[0] || clusters[0];
      const bg = fromHsl(bgC.hsl.h, Math.min(bgC.hsl.s, 0.45), Math.min(bgC.hsl.l, 0.11));
      const text = fromHsl(bgC.hsl.h, 0.18, 0.93);
      const accent = accentC.hsl.s < 0.12
        ? fromHsl(accentC.hsl.h, accentC.hsl.s, 0.86)
        : fromHsl(accentC.hsl.h, Math.max(accentC.hsl.s, 0.6), C.clamp(accentC.hsl.l, 0.58, 0.7));
      return { mode, bg, text, accent };
    }
    const bgC = clusters.filter(c => share(c) > 0.06).sort((a, b) => b.hsl.l - a.hsl.l)[0] || clusters[0];
    const bg = fromHsl(bgC.hsl.h, Math.min(bgC.hsl.s, 0.4), Math.max(bgC.hsl.l, 0.95));
    const text = fromHsl(bgC.hsl.h, 0.3, 0.14);
    const accent = accentC.hsl.s < 0.12
      ? fromHsl(accentC.hsl.h, accentC.hsl.s, 0.2)
      : fromHsl(accentC.hsl.h, Math.max(accentC.hsl.s, 0.6), C.clamp(accentC.hsl.l, 0.36, 0.46));
    return { mode, bg, text, accent };
  }

  async function analyse(file, mode) {
    const { img, url } = await loadImage(file);
    try {
      const clusters = kmeans(samplePixels(img));
      if (!clusters.length) throw new Error("That picture looks empty. Try another one.");
      return { seed: seedFromClusters(clusters, mode), dataUrl: resizeToDataUrl(img) };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function shrink(file) {
    const { img, url } = await loadImage(file);
    try { return resizeToDataUrl(img); } finally { URL.revokeObjectURL(url); }
  }

  // Logos: fit inside a small square PNG, keeping transparency
  async function logo(file, size = 160) {
    const { img, url } = await loadImage(file);
    try {
      const scale = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      return cv.toDataURL('image/png');
    } finally { URL.revokeObjectURL(url); }
  }

  root.Gel.picture = { analyse, shrink, logo, seedFromClusters };
})(window);
