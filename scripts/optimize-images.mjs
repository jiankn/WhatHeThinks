import sharp from "sharp";

const assets = [
  { input: "design/source-assets/hero-woman.png", output: "public/images/hero-woman.webp", width: 1448, quality: 84 },
  { input: "design/source-assets/home-hero-couple-v2.png", output: "public/images/home-hero-couple-v2.webp", width: 1600, quality: 86 },
  { input: "design/source-assets/home-story-hands-v2.png", output: "public/images/home-story-hands-v2.webp", width: 1200, quality: 84 },
  { input: "design/source-assets/home-cta-flowers-v2.png", output: "public/images/home-cta-flowers-v2.webp", width: 1600, quality: 84 },
  { input: "design/source-assets/preview-banner.png", output: "public/images/preview-banner.webp", width: 1600, quality: 84 },
  { input: "design/source-assets/privacy-envelope.png", output: "public/images/privacy-envelope.webp", width: 1000, quality: 84 },
  { input: "design/source-assets/report-evidence.png", output: "public/images/report-evidence.webp", width: 1400, quality: 84 },
];

for (const asset of assets) {
  await sharp(asset.input)
    .resize({ width: asset.width, withoutEnlargement: true })
    .webp({ quality: asset.quality, effort: 5, smartSubsample: true })
    .toFile(asset.output);
}

const avatarSheet = "design/source-assets/home-question-portraits-v2.png";
const avatarSize = 724;
for (const [index, name] of ["anna", "marcus", "mateo"].entries()) {
  await sharp(avatarSheet)
    .extract({ left: index * avatarSize, top: 0, width: avatarSize, height: avatarSize })
    .resize(320, 320, { fit: "cover" })
    .webp({ quality: 84, effort: 5, smartSubsample: true })
    .toFile(`public/images/home-avatar-${name}.webp`);
}

const socialCopy = Buffer.from(`
  <svg width="560" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="560" height="630" fill="#2e1f33"/>
    <text x="56" y="82" fill="#fcfaf8" font-family="Georgia, serif" font-size="38" font-weight="700">WhatHeThinks<tspan fill="#d34d7e">.</tspan></text>
    <text x="56" y="210" fill="#fcfaf8" font-family="Arial, sans-serif" font-size="54" font-weight="700">
      <tspan x="56" dy="0">Read the pattern</tspan>
      <tspan x="56" dy="64">behind his texts.</tspan>
    </text>
    <text x="56" y="384" fill="#ddd0da" font-family="Arial, sans-serif" font-size="24">
      <tspan x="56" dy="0">Who reaches out, how effort shifts,</tspan>
      <tspan x="56" dy="36">and when something changes.</tspan>
    </text>
    <rect x="56" y="500" width="248" height="58" rx="8" fill="#c33469"/>
    <text x="82" y="538" fill="#ffffff" font-family="Arial, sans-serif" font-size="22" font-weight="700">Free private preview</text>
  </svg>
`);

const socialPhoto = await sharp("design/source-assets/home-hero-couple-v2.png")
  .resize(640, 630, { fit: "cover", position: "east" })
  .webp({ quality: 86, effort: 5 })
  .toBuffer();

await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#2e1f33" } })
  .composite([
    { input: socialCopy, top: 0, left: 0 },
    { input: socialPhoto, top: 0, left: 560 },
  ])
  .webp({ quality: 86, effort: 5 })
  .toFile("public/images/social-card.webp");

console.log("Optimized image assets and social card.");
