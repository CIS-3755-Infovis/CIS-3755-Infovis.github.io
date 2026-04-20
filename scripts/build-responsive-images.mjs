import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = process.cwd();

const configs = [
  {
    key: "projects",
    sourceDir: path.join(rootDir, "img/projects"),
    outputDir: path.join(rootDir, "assets/images/generated/projects"),
    widths: [360, 720, 1200],
    maxWidth: 1600,
    sizes: "(min-width: 1280px) 280px, (min-width: 768px) calc(50vw - 3rem), 100vw",
    fallbackFormat: (ext) => (ext === ".jpg" || ext === ".jpeg" ? "jpg" : "png")
  },
  {
    key: "people",
    sourceDir: path.join(rootDir, "img/people"),
    outputDir: path.join(rootDir, "assets/images/generated/people"),
    widths: [240, 400, 800],
    maxWidth: 1200,
    sizes: "(min-width: 1280px) 240px, (min-width: 640px) calc(50vw - 2.5rem), 100vw",
    fallbackFormat: () => "jpg"
  }
];

const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".gif"]);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function listSourceFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .filter((name) => supportedExtensions.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function uniqueSortedWidths(widths, originalWidth, maxWidth) {
  const cappedOriginalWidth = Math.min(originalWidth, maxWidth || originalWidth);
  const candidates = widths.filter((width) => width < cappedOriginalWidth);
  candidates.push(cappedOriginalWidth);
  return [...new Set(candidates)].sort((a, b) => a - b);
}

async function writeVariant({ inputPath, outputPath, width, format }) {
  const pipeline = sharp(inputPath).rotate().resize({
    width,
    withoutEnlargement: true
  });

  if (format === "webp") {
    await pipeline.webp({ quality: 78, effort: 5 }).toFile(outputPath);
    return;
  }

  if (format === "jpg") {
    await pipeline.jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(outputPath);
    return;
  }

  await pipeline.png({ compressionLevel: 9, palette: true }).toFile(outputPath);
}

async function buildConfig(config) {
  await fs.rm(config.outputDir, { recursive: true, force: true });
  await ensureDir(config.outputDir);

  const files = await listSourceFiles(config.sourceDir);
  const manifestEntries = {};

  for (const fileName of files) {
    const ext = path.extname(fileName).toLowerCase();
    const inputPath = path.join(config.sourceDir, fileName);
    const slugBase = slugify(`${path.basename(fileName, ext)}-${ext.slice(1)}`);
    const metadata = await sharp(inputPath, { animated: false }).metadata();

    if (!metadata.width || !metadata.height) {
      continue;
    }

    const fallbackFormat = config.fallbackFormat(ext);
    const outputWidths = uniqueSortedWidths(config.widths, metadata.width, config.maxWidth);
    const fallbackVariants = [];
    const webpVariants = [];

    for (const width of outputWidths) {
      const fallbackFileName = `${slugBase}-${width}.${fallbackFormat}`;
      const fallbackOutputPath = path.join(config.outputDir, fallbackFileName);
      await writeVariant({
        inputPath,
        outputPath: fallbackOutputPath,
        width,
        format: fallbackFormat
      });
      fallbackVariants.push({
        width,
        path: `/assets/images/generated/${config.key}/${fallbackFileName}`
      });

      const webpFileName = `${slugBase}-${width}.webp`;
      const webpOutputPath = path.join(config.outputDir, webpFileName);
      await writeVariant({
        inputPath,
        outputPath: webpOutputPath,
        width,
        format: "webp"
      });
      webpVariants.push({
        width,
        path: `/assets/images/generated/${config.key}/${webpFileName}`
      });
    }

    manifestEntries[fileName] = {
      kind: ext === ".gif" ? "poster" : "static",
      source_path: `/img/${config.key}/${fileName}`,
      width: metadata.width,
      height: metadata.height,
      sizes: config.sizes,
      fallback_src: fallbackVariants[fallbackVariants.length - 1].path,
      fallback_srcset: fallbackVariants.map((variant) => `${variant.path} ${variant.width}w`).join(", "),
      webp_srcset: webpVariants.map((variant) => `${variant.path} ${variant.width}w`).join(", ")
    };
  }

  return manifestEntries;
}

async function main() {
  const manifest = {};

  for (const config of configs) {
    manifest[config.key] = await buildConfig(config);
  }

  const dataDir = path.join(rootDir, "_data");
  await ensureDir(dataDir);

  await fs.writeFile(
    path.join(dataDir, "responsive_images.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  const imageCount = Object.values(manifest).reduce(
    (count, group) => count + Object.keys(group).length,
    0
  );
  console.log(`Built responsive images for ${imageCount} assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
