// Animated avatar backgrounds for the Roblox app.
//
// The app's avatar viewer stands your character in front of "AvatarCyclorama", a curved
// studio backdrop stored in ExtraContent/places/Mobile.rbxl. Gel adds moving particles and
// scrolling light ribbons inside that model and recolours it. Everything moves by Roblox's
// own particle and beam effects, so there are no scripts in the file.

const rbxl = require('./rbxl');

const PREFIX = 'GelBackdrop';
const TEX = (name) => `rbxasset://textures/gel/${name}.png`;
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));

// Offsets are in studs from where the avatar stands: +y is up, +z is towards the wall.
const LAYERS = {
  back: { at: [0, 8, 7], size: [34, 15, 3] },
  mid: { at: [0, 6.5, 3.5], size: [26, 11, 2] },
  top: { at: [0, 15, 4], size: [34, 1, 8] },
  bottom: { at: [0, 0.6, 5], size: [30, 1, 6] },
  feet: { at: [0, 0.3, 0.4], size: [6, 0.2, 4] },
};

const seq = (pairs) => pairs.map(([t, v]) => [t, v]);
const fade = (peak) => seq([[0, 1], [0.15, peak], [0.8, peak], [1, 1]]);
const grad = (colors) => colors.map((c, i) => [colors.length === 1 ? 0 : i / (colors.length - 1), hex(c)]).concat(colors.length === 1 ? [[1, hex(colors[0])]] : []);

const BACKDROPS = {
  aurora: {
    name: 'Aurora', shell: '1A1033', colors: ['FF5FA2', '9B6BFF', '3EE0FF'],
    particles: [
      { layer: 'back', texture: 'glow', rate: 4, life: [9, 13], size: [[0, 1.4], [0.5, 3.2], [1, 1]], alpha: fade(0.55), speed: [0.15, 0.45], spread: [180, 180] },
      { layer: 'mid', texture: 'star', rate: 7, life: [2.5, 4.5], size: [[0, 0], [0.5, 0.45], [1, 0]], alpha: fade(0.1), speed: [0, 0.1], spread: [180, 180], spin: [-30, 30] },
      { layer: 'feet', texture: 'glow', rate: 5, life: [3, 5], size: [[0, 0.25], [1, 0.05]], alpha: fade(0.3), speed: [0.4, 0.8], accel: [0, 0.3, 0], dir: 1 },
    ],
    ribbons: [{ y: 11, width: 3.2, speed: 0.25, curve: 5 }, { y: 7.5, width: 2.2, speed: 0.4, curve: -4 }, { y: 4.5, width: 1.6, speed: 0.6, curve: 3 }],
  },
  pixels: {
    name: 'Pixel rain', shell: '2B1A3A', colors: ['FFC46B', 'FF5FA2', '9B6BFF'],
    particles: [
      { layer: 'top', texture: 'pixel', rate: 16, life: [7, 10], size: [[0, 0.35], [1, 0.35]], alpha: fade(0.1), speed: [0.6, 1.2], accel: [0, -0.6, 0], dir: 4, light: 0.6 },
      { layer: 'back', texture: 'pixel', rate: 5, life: [4, 7], size: [[0, 0.7], [0.5, 1], [1, 0.7]], alpha: fade(0.5), speed: [0, 0.15], spread: [180, 180] },
      { layer: 'feet', texture: 'pixel', rate: 6, life: [2, 3.5], size: [[0, 0.18], [1, 0.1]], alpha: fade(0.15), speed: [0.8, 1.4], dir: 1 },
    ],
    ribbons: [{ y: 9, width: 1.4, speed: 0.5, curve: 0 }],
  },
  confetti: {
    name: 'Confetti', shell: '2A1430', colors: ['FF5FA2', 'FFC46B', '3EE0FF', '5CF2B5'],
    particles: [
      { layer: 'top', texture: 'confetti', rate: 20, life: [6, 9], size: [[0, 0.35], [1, 0.35]], alpha: fade(0), speed: [0.5, 1.5], accel: [0.2, -1.1, 0], dir: 4, spin: [-200, 200], rot: [0, 360], drag: 0.4, light: 0.4 },
      { layer: 'mid', texture: 'star', rate: 5, life: [2, 3.5], size: [[0, 0], [0.5, 0.55], [1, 0]], alpha: fade(0.05), speed: [0, 0.1], spread: [180, 180] },
    ],
    ribbons: [],
  },
  bubbles: {
    name: 'Bubbles', shell: '0E2238', colors: ['3EE0FF', '9B6BFF', 'FFFFFF'],
    particles: [
      { layer: 'bottom', texture: 'bubble', rate: 7, life: [8, 12], size: [[0, 0.3], [0.6, 0.8], [1, 1]], alpha: fade(0.15), speed: [0.6, 1.2], accel: [0, 0.25, 0], dir: 1, spread: [12, 12], drag: 0.2 },
      { layer: 'back', texture: 'glow', rate: 3, life: [10, 14], size: [[0, 2], [0.5, 3.5], [1, 2]], alpha: fade(0.65), speed: [0.1, 0.3], spread: [180, 180] },
      { layer: 'feet', texture: 'bubble', rate: 3, life: [3, 5], size: [[0, 0.12], [1, 0.3]], alpha: fade(0.2), speed: [0.6, 1], dir: 1 },
    ],
    ribbons: [{ y: 10, width: 2.4, speed: 0.2, curve: 3 }],
  },
  petals: {
    name: 'Petals', shell: '2E1626', colors: ['FF8FC6', 'FFD1E6', 'FFFFFF'],
    particles: [
      { layer: 'top', texture: 'petal', rate: 10, life: [8, 12], size: [[0, 0.4], [1, 0.4]], alpha: fade(0.05), speed: [0.4, 0.9], accel: [0.5, -0.5, 0], dir: 4, spin: [-90, 90], rot: [0, 360], drag: 0.3, light: 0.3 },
      { layer: 'back', texture: 'glow', rate: 3, life: [10, 14], size: [[0, 2], [0.5, 3.5], [1, 2]], alpha: fade(0.6), speed: [0.1, 0.3], spread: [180, 180] },
    ],
    ribbons: [{ y: 9.5, width: 2.6, speed: 0.15, curve: 4 }],
  },
  starfield: {
    name: 'Starfield', shell: '0A0F1E', colors: ['FFFFFF', '5CF2B5', '3EE0FF'],
    particles: [
      { layer: 'back', texture: 'star', rate: 22, life: [2, 4], size: [[0, 0], [0.5, 0.5], [1, 0]], alpha: fade(0), speed: [0, 0.05], spread: [180, 180], spin: [-20, 20] },
      { layer: 'mid', texture: 'glow', rate: 6, life: [3, 6], size: [[0, 0], [0.5, 0.35], [1, 0]], alpha: fade(0.2), speed: [0, 0.1], spread: [180, 180] },
    ],
    ribbons: [{ y: 10.5, width: 2.8, speed: 0.12, curve: 4 }, { y: 6, width: 1.8, speed: 0.2, curve: -3 }],
  },
};

// Rotation that points an attachment's X axis up, so a beam's curve bends up and down.
const AXIS_UP = [0, -1, 0, 1, 0, 0, 0, 0, 1];

function place(pivot, offset) {
  const [x, y, z] = offset;
  const r = pivot.rot;
  return [
    pivot.pos[0] + r[0] * x + r[1] * y + r[2] * z,
    pivot.pos[1] + r[3] * x + r[4] * y + r[5] * z,
    pivot.pos[2] + r[6] * x + r[7] * y + r[8] * z,
  ];
}

function emitterProps(p, colors, name) {
  return {
    Name: ['string', name],
    Texture: ['string', TEX(p.texture)],
    Color: ['colorsequence', grad(colors)],
    Size: ['numbersequence', p.size],
    Transparency: ['numbersequence', p.alpha],
    Lifetime: ['numberrange', p.life],
    Rate: ['float', p.rate],
    Speed: ['numberrange', p.speed || [0, 0]],
    SpreadAngle: ['vector2', p.spread || [20, 20]],
    Rotation: ['numberrange', p.rot || [0, 0]],
    RotSpeed: ['numberrange', p.spin || [0, 0]],
    Acceleration: ['vector3', p.accel || [0, 0, 0]],
    Drag: ['float', p.drag || 0],
    LightEmission: ['float', p.light === undefined ? 1 : p.light],
    LightInfluence: ['float', 0],
    Brightness: ['float', 1.5],
    Shape: ['enum', 0], // Box
    ShapeStyle: ['enum', 0], // Volume
    EmissionDirection: ['enum', p.dir === undefined ? 1 : p.dir], // NormalId: 1 Top, 4 Bottom
    Orientation: ['enum', 0], // FacingCamera
    ZOffset: ['float', 0],
    LockedToPart: ['bool', false],
    Enabled: ['bool', true],
    TimeScale: ['float', 1],
  };
}

const partProps = (name, size, cframe) => ({
  Name: ['string', name],
  Anchored: ['bool', true],
  CanCollide: ['bool', false],
  CanQuery: ['bool', false],
  CanTouch: ['bool', false],
  CastShadow: ['bool', false],
  Locked: ['bool', true],
  Transparency: ['float', 1],
  size: ['vector3', size],
  CFrame: ['cframe', cframe],
});

function buildBackdrop(buffer, spec) {
  const recipe = BACKDROPS[spec && spec.id];
  if (!recipe) throw new Error(`Unknown avatar background "${spec && spec.id}".`);
  const colors = Array.isArray(spec.colors) && spec.colors.length ? spec.colors : recipe.colors;
  const doc = rbxl.read(buffer);

  const [cyc] = doc.find({ className: 'Model', name: 'AvatarCyclorama' });
  if (cyc === undefined) throw new Error("Roblox changed its avatar scene, so Gel can't find where the background goes.");
  const [tex] = doc.find({ className: 'MeshPart', name: 'texture_mesh', parent: cyc });
  const [shell] = doc.find({ className: 'MeshPart', name: 'color_mesh', parent: cyc });
  if (tex === undefined || shell === undefined) throw new Error("Roblox changed its avatar scene, so Gel can't find where the background goes.");

  // Undo an earlier Gel background first (a launcher's copy of Roblox may already have one).
  const [note] = doc.find({ className: 'StringValue', name: `${PREFIX}.Original` });
  if (note !== undefined) {
    const original = JSON.parse(doc.getString('StringValue', 'Value', note));
    doc.setString('MeshPart', 'TextureID', tex, original.textureId);
    doc.setColor3uint8('MeshPart', 'Color3uint8', shell, original.color);
    doc.removeAdded(PREFIX);
  }

  const pivot = doc.getPivot(cyc);
  if (!pivot) throw new Error("Roblox changed its avatar scene, so Gel can't find where the background goes.");
  const original = { textureId: doc.getString('MeshPart', 'TextureID', tex), color: doc.getColor3uint8('MeshPart', 'Color3uint8', shell) };

  doc.setString('MeshPart', 'TextureID', tex, TEX(`backdrops/${spec.id}`));
  doc.setColor3uint8('MeshPart', 'Color3uint8', shell, rgb(recipe.shell));

  const items = [
    { key: 'holder', className: 'Model', parent: cyc, props: { Name: ['string', PREFIX] } },
    { key: 'note', className: 'StringValue', parent: 'holder', props: { Name: ['string', `${PREFIX}.Original`], Value: ['string', JSON.stringify(original)] } },
  ];
  const cf = (offset) => ({ pos: place(pivot, offset), rot: pivot.rot });

  const layersUsed = [...new Set(recipe.particles.map((p) => p.layer))];
  for (const layer of layersUsed) {
    const L = LAYERS[layer];
    const name = `${PREFIX}.${layer[0].toUpperCase()}${layer.slice(1)}`;
    items.push({ key: `layer-${layer}`, className: 'Part', parent: 'holder', props: partProps(name, L.size, cf(L.at)) });
  }
  recipe.particles.forEach((p, i) => {
    items.push({ key: `fx-${i}`, className: 'ParticleEmitter', parent: `layer-${p.layer}`, props: emitterProps(p, colors, `${PREFIX}.Particles${i + 1}`) });
  });

  if (recipe.ribbons.length) {
    items.push({ key: 'ribbons', className: 'Part', parent: 'holder', props: partProps(`${PREFIX}.Ribbons`, [1, 1, 1], cf([0, 0, 8.5])) });
    recipe.ribbons.forEach((r, i) => {
      const a0 = `a0-${i}`;
      const a1 = `a1-${i}`;
      items.push({ key: a0, className: 'Attachment', parent: 'ribbons', props: { Name: ['string', `${PREFIX}.RibbonStart${i + 1}`], CFrame: ['cframe', { pos: [-18, r.y, 0], rot: AXIS_UP }] } });
      items.push({ key: a1, className: 'Attachment', parent: 'ribbons', props: { Name: ['string', `${PREFIX}.RibbonEnd${i + 1}`], CFrame: ['cframe', { pos: [18, r.y, 0], rot: AXIS_UP }] } });
      const shifted = colors.slice(i % colors.length).concat(colors.slice(0, i % colors.length));
      items.push({ key: `beam-${i}`, className: 'Beam', parent: 'ribbons', props: {
        Name: ['string', `${PREFIX}.Ribbon${i + 1}`],
        Attachment0: ['ref', a0],
        Attachment1: ['ref', a1],
        Color: ['colorsequence', grad(shifted)],
        Transparency: ['numbersequence', seq([[0, 1], [0.2, 0.35], [0.8, 0.35], [1, 1]])],
        Width0: ['float', r.width],
        Width1: ['float', r.width * 0.8],
        CurveSize0: ['float', r.curve],
        CurveSize1: ['float', r.curve],
        Texture: ['string', TEX('ribbon')],
        TextureSpeed: ['float', r.speed],
        TextureLength: ['float', 8],
        TextureMode: ['enum', 1], // Wrap
        LightEmission: ['float', 1],
        LightInfluence: ['float', 0],
        FaceCamera: ['bool', true],
        Segments: ['int', 30],
        Enabled: ['bool', true],
        ZOffset: ['float', 0],
        Brightness: ['float', 1.5],
      } });
    });
  }

  doc.add(items);
  return doc.write();
}

module.exports = { buildBackdrop, BACKDROPS, PREFIX };
