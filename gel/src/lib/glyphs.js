/* Emblems that replace the Spotify logo inside the app. All drawn for Gel on a 24×24 grid. */
(function (root) {
  const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
  const rot = (n, d, extra) => Array.from({ length: n }, (_, i) => Object.assign({ d, t: `rotate(${(360 / n) * i} 12 12)` }, extra || {}));
  const pixels = (rows, size, ox, oy) => rows.map((row, y) => row.split('').map((ch, x) => ch === 'X'
    ? `M${ox + x * size} ${oy + y * size}h${size}v${size}h${-size}z` : '').join('')).join('');

  const GLYPHS = {
    jelly: { name: 'Gel the jelly', paths: [{ d: 'M12 1.5c1.1 1.9 3.4 3 5.3 4.5 2.6 2.3 4.1 4.9 4.1 7.9 0 4.5-4.1 7.5-9.4 7.5s-9.4-3-9.4-7.5c0-3 1.5-5.6 4.1-7.9 1.9-1.5 4.2-2.6 5.3-4.5z' + ell(9.2, 13.9, 1.35, 1.75) + ell(14.8, 13.9, 1.35, 1.75) + 'M10.6 16.6q1.4 1.3 2.8 0l.5.5q-1.9 1.9-3.8 0z', r: 'evenodd' }] },
    gel: { name: 'Gel', paths: [{ d: circ(8.5, 9, 6), o: 0.85 }, { d: circ(15.5, 9, 6), o: 0.85 }, { d: circ(12, 15.5, 6), o: 0.85 }] },
    note: { name: 'Music note', paths: [{ d: 'M9 18.5a3 3 0 1 1-2-2.83V5l11-2v12.5a3 3 0 1 1-2-2.83V7.2L9 8.4z' }] },
    vinyl: { name: 'Record', paths: [{ d: circ(12, 12, 10) + circ(12, 12, 4.2), r: 'evenodd' }, { d: circ(12, 12, 2.6) + circ(12, 12, 1), r: 'evenodd', o: 0.7 }] },
    sakura: { name: 'Blossom', paths: rot(5, 'M12 11.2C9.2 9 9.3 4.6 11 3l1 1.3L13 3c1.7 1.6 1.8 6-1 8.2z').concat([{ d: circ(12, 12, 1.3), o: 0.6 }]) },
    moon: { name: 'Moon', paths: [{ d: 'M15.5 2.5A9.5 9.5 0 1 0 21.5 17 7.5 7.5 0 1 1 15.5 2.5z' }] },
    star: { name: 'Star', paths: [{ d: 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z' }] },
    sparkle: { name: 'Sparkle', paths: [{ d: 'M10 2c.5 5 4 8.5 9 9-5 .5-8.5 4-9 9-.5-5-4-8.5-9-9 5-.5 8.5-4 9-9z' }, { d: 'M19 1.5c.2 1.8 1.4 3 3.2 3.2-1.8.2-3 1.4-3.2 3.2-.2-1.8-1.4-3-3.2-3.2 1.8-.2 3-1.4 3.2-3.2z' }] },
    heart: { name: 'Heart', paths: [{ d: 'M12 21 3.6 12.9a5.3 5.3 0 0 1 0-7.6 5.2 5.2 0 0 1 7.4 0l1 1 1-1a5.2 5.2 0 0 1 7.4 0 5.3 5.3 0 0 1 0 7.6z' }] },
    flame: { name: 'Flame', paths: [{ d: 'M12 2c1 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.2-4 2.5-5.2.3 1.9 1.2 3 2.3 3.4C10.8 8.3 11 5 12 2zM12 13.5c-1.4 1.2-2.3 2.4-2.3 3.6a2.3 2.3 0 0 0 4.6 0c0-1.4-.9-2.5-2.3-3.6z', r: 'evenodd' }] },
    leaf: { name: 'Leaf', paths: [{ d: 'M20 4C10 4 4 9 4 16c0 1.3.2 2.6.6 3.6L3 21.2l1.1 1.1 1.7-1.7c1 .4 2.2.6 3.6.6C16.8 21.2 20 14 20 4zM7.5 18.6l1-1C10 13 13 9.5 16.5 7.5c-3 2.6-5.2 5.8-6.6 9.9l-1.4 1.4z', r: 'evenodd' }] },
    drop: { name: 'Raindrop', paths: [{ d: 'M12 2.5S5 10.2 5 14.5a7 7 0 0 0 14 0C19 10.2 12 2.5 12 2.5z' }] },
    snowflake: { name: 'Snowflake', paths: rot(3, 'M11.1 2h1.8v20h-1.8zM12 5.8 9.4 3.2l1-1L12 3.8l1.6-1.6 1 1zM12 18.2l2.6 2.6-1 1-1.6-1.6-1.6 1.6-1-1z') },
    bubble: { name: 'Bubbles', paths: [{ d: circ(9, 13.5, 6.5) + circ(9, 13.5, 5), r: 'evenodd' }, { d: circ(17.5, 6.5, 3.5) + circ(17.5, 6.5, 2.3), r: 'evenodd' }, { d: circ(19, 16, 1.8) }, { d: ell(7, 11, 1.2, 2), o: 0.6 }] },
    bolt: { name: 'Lightning', paths: [{ d: 'M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.8z' }] },
    wave: { name: 'Wave', paths: [{ d: 'M2 8c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2v2.6c-2.5 0-2.5-2-5-2s-2.5 2-5 2-2.5-2-5-2-2.5 2-5 2z' }, { d: 'M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2v2.6c-2.5 0-2.5-2-5-2s-2.5 2-5 2-2.5-2-5-2-2.5 2-5 2z', o: 0.6 }] },
    gate: { name: 'Shrine gate', paths: [{ d: 'M1.5 3.5c6 1.2 15 1.2 21 0v2.8c-6 1.2-15 1.2-21 0zM4 9.2h16v2H4zM6 7h2.2v14H6zM15.8 7H18v14h-2.2z' }] },
    shuriken: { name: 'Throwing star', paths: [{ d: 'M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z' + circ(12, 12, 1.8), r: 'evenodd' }] },
    cat: { name: 'Cat', paths: [{ d: 'M4 3.5l4.2 3.7c1.2-.4 2.5-.6 3.8-.6s2.6.2 3.8.6L20 3.5V12c0 4.7-3.6 8.5-8 8.5S4 16.7 4 12z' + circ(9, 12.5, 1.2) + circ(15, 12.5, 1.2) + 'M12 15.2l-1.2-1h2.4z', r: 'evenodd' }] },
    cassette: { name: 'Cassette', paths: [{ d: 'M2 5h20v14H2zM5 8h14v6H5z' + circ(8.5, 11, 1.6) + circ(15.5, 11, 1.6) + 'M7 19l1.5-3h7l1.5 3z', r: 'evenodd' }] },
    pixel: { name: 'Pixel heart', paths: [{ d: pixels(['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], 3, 1.5, 3) }] },
    prompt: { name: 'Terminal', paths: [{ d: 'M3 6.5 4.6 5l7 7-7 7L3 17.5 8.4 12zM12.5 17h8.5v2.2h-8.5z' }] },
    sun: { name: 'Sunset', paths: [{ d: 'M2 15a10 10 0 0 1 20 0zM2 10.2h20v1.1H2zM2 12.8h20v1.1H2z', r: 'evenodd' }, { d: 'M1 16.6h22v1.6H1zM4 19.8h16v1.4H4z', o: 0.7 }] },
    cup: { name: 'Coffee', paths: [{ d: 'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9.5h1.5a3 3 0 0 1 0 6H17v-2h1.5a1 1 0 0 0 0-2H17zM3 20.5h15V22H3z' }, { d: 'M7.3 2.5h1.4v3.5H7.3zM11.3 2.5h1.4v3.5h-1.4z', o: 0.6 }] },
    crown: { name: 'Crown', paths: [{ d: 'M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5zM5 19.5h14V21H5z' }] },
    planet: { name: 'Planet', paths: [{ d: circ(12, 12, 6) }, { d: ell(12, 12, 10.5, 3.2) + ell(12, 12, 8.6, 2.1), r: 'evenodd', t: 'rotate(-20 12 12)', o: 0.75 }] },
    gear: { name: 'Gear', paths: rot(8, 'M10.6 1.5h2.8v4h-2.8z').concat([{ d: circ(12, 12, 7) + circ(12, 12, 2.8), r: 'evenodd' }]) },
    enso: { name: 'Brush circle', paths: [{ d: circ(12, 12, 9.5) + circ(12.8, 11.4, 7.3), r: 'evenodd' }] },
  };

  function glyphSvg(id, color) {
    const g = GLYPHS[id] || GLYPHS.gel;
    const fill = '#' + String(color || 'FFFFFF').replace(/^#/, '');
    const body = g.paths.map(p => `<path d="${p.d}" fill="${fill}"${p.o ? ` fill-opacity="${p.o}"` : ''}${p.r ? ` fill-rule="${p.r}"` : ''}${p.t ? ` transform="${p.t}"` : ''}/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;
  }

  function glyphDataUrl(id, color) {
    return 'data:image/svg+xml,' + encodeURIComponent(glyphSvg(id, color));
  }

  const api = { GLYPHS, glyphSvg, glyphDataUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.Gel = root.Gel || {}).glyphs = api;
})(typeof window !== 'undefined' ? window : globalThis);
