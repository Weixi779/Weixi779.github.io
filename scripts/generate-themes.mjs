import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const themeFoundryRoot = resolve(projectRoot, 'vendor/themefoundry');
const catalogPath = resolve(themeFoundryRoot, 'themes.json');
const cssOutputPath = resolve(projectRoot, 'src/styles/generated/themes.css');
const catalogOutputPath = resolve(projectRoot, 'src/theme/generated/catalog.ts');
const supportedModes = ['light', 'dark'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${error.message}`, { cause: error });
  }
}

function resolveThemeFoundryPath(relativePath, label) {
  assert(typeof relativePath === 'string' && relativePath.length > 0, `${label} path is missing.`);
  assert(!isAbsolute(relativePath), `${label} path must be relative.`);
  const path = resolve(themeFoundryRoot, relativePath);
  const pathFromRoot = relative(themeFoundryRoot, path);
  assert(
    pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`),
    `${label} path escapes ThemeFoundry: ${relativePath}`,
  );
  return path;
}

function flattenTokens(node, label, segments = [], inheritedType) {
  assert(isRecord(node), `${label} must contain a token object.`);
  const tokens = new Map();
  const nodeType = typeof node.$type === 'string' ? node.$type : inheritedType;

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    assert(!key.includes('.'), `${label} token key must not contain a dot: ${key}`);
    assert(isRecord(child), `${label} token node must be an object: ${[...segments, key].join('.')}`);

    const tokenPath = [...segments, key];
    const childType = typeof child.$type === 'string' ? child.$type : nodeType;
    if ('$value' in child) {
      assert(childType, `${label} token type is missing: ${tokenPath.join('.')}`);
      const nestedKeys = Object.keys(child).filter((nestedKey) => !nestedKey.startsWith('$'));
      assert(nestedKeys.length === 0, `${label} token cannot contain nested tokens: ${tokenPath.join('.')}`);
      tokens.set(tokenPath.join('.'), { type: childType, value: child.$value });
      continue;
    }

    for (const [path, token] of flattenTokens(child, label, tokenPath, childType)) {
      assert(!tokens.has(path), `${label} contains duplicate token: ${path}`);
      tokens.set(path, token);
    }
  }

  return tokens;
}

function componentToHex(component) {
  return Math.round(component * 255).toString(16).padStart(2, '0').toUpperCase();
}

function formatNumber(value) {
  return Number(value.toFixed(4)).toString();
}

function validateColor(value, label) {
  assert(isRecord(value), `${label} must be a color object.`);
  assert(value.colorSpace === 'srgb', `${label} must use the sRGB color space.`);
  assert(Array.isArray(value.components) && value.components.length === 3, `${label} needs 3 components.`);
  for (const component of value.components) {
    assert(
      typeof component === 'number' && Number.isFinite(component) && component >= 0 && component <= 1,
      `${label} components must be finite numbers from 0 through 1.`,
    );
  }
  assert(
    typeof value.alpha === 'number' && Number.isFinite(value.alpha) && value.alpha >= 0 && value.alpha <= 1,
    `${label} alpha must be a finite number from 0 through 1.`,
  );
  assert(/^#[0-9A-F]{6}$/u.test(value.hex), `${label} hex must be uppercase #RRGGBB.`);

  const expectedHex = `#${value.components.map(componentToHex).join('')}`;
  assert(value.hex === expectedHex, `${label} hex ${value.hex} does not match components (${expectedHex}).`);
}

function cssColor(value) {
  const components = value.components.map((component) => `${formatNumber(component * 100)}%`).join(' ');
  return `rgb(${components} / ${formatNumber(value.alpha)})`;
}

function cssVariableName(tokenPath) {
  const segments = tokenPath.split('.');
  assert(segments[0] === 'color', `Unsupported non-color token: ${tokenPath}`);
  return `--color-${segments.slice(1).join('-')}`;
}

async function loadContracts(catalog) {
  assert(Array.isArray(catalog.contracts) && catalog.contracts.length > 0, 'Catalog contracts are missing.');
  const contracts = new Map();

  for (const declaration of catalog.contracts) {
    assert(isRecord(declaration), 'Catalog contract declaration must be an object.');
    assert(typeof declaration.id === 'string' && declaration.id.length > 0, 'Catalog contract id is missing.');
    assert(!contracts.has(declaration.id), `Duplicate catalog contract id: ${declaration.id}`);

    const contract = await readJson(
      resolveThemeFoundryPath(declaration.path, `Contract ${declaration.id}`),
      `contract ${declaration.id}`,
    );
    assert(contract.schemaVersion === 1, `Contract ${declaration.id} has an unsupported schema version.`);
    assert(contract.id === declaration.id, `Contract id mismatch: expected ${declaration.id}, found ${contract.id}.`);
    assert(Array.isArray(contract.tokens) && contract.tokens.length > 0, `Contract ${declaration.id} is empty.`);

    const tokens = new Map();
    for (const token of contract.tokens) {
      assert(isRecord(token), `Contract ${declaration.id} token must be an object.`);
      assert(typeof token.path === 'string' && token.path.length > 0, `Contract ${declaration.id} token path is missing.`);
      assert(typeof token.type === 'string' && token.type.length > 0, `Contract ${declaration.id} token type is missing.`);
      assert(!tokens.has(token.path), `Contract ${declaration.id} contains duplicate token: ${token.path}`);
      tokens.set(token.path, token.type);
    }

    contracts.set(declaration.id, tokens);
  }

  return contracts;
}

function expectedTokensForTheme(theme, contracts) {
  assert(Array.isArray(theme.contracts) && theme.contracts.length > 0, `Theme ${theme.id} contracts are missing.`);
  const expected = new Map();

  for (const contractId of theme.contracts) {
    const contract = contracts.get(contractId);
    assert(contract, `Theme ${theme.id} references unknown contract: ${contractId}`);
    for (const [path, type] of contract) {
      const existingType = expected.get(path);
      assert(!existingType || existingType === type, `Theme ${theme.id} contracts disagree on ${path}.`);
      expected.set(path, type);
    }
  }

  return expected;
}

async function loadThemes(catalog, contracts) {
  assert(Array.isArray(catalog.themes) && catalog.themes.length > 0, 'Catalog themes are missing.');
  const themeIds = new Set();
  const results = [];

  for (const theme of catalog.themes) {
    assert(isRecord(theme), 'Catalog theme must be an object.');
    assert(typeof theme.id === 'string' && theme.id.length > 0, 'Theme id is missing.');
    assert(!themeIds.has(theme.id), `Duplicate theme id: ${theme.id}`);
    assert(typeof theme.displayName === 'string' && theme.displayName.length > 0, `Theme ${theme.id} display name is missing.`);
    assert(isRecord(theme.modes), `Theme ${theme.id} modes are missing.`);
    assert(
      Object.keys(theme.modes).length === supportedModes.length &&
        supportedModes.every((mode) => typeof theme.modes[mode] === 'string'),
      `Theme ${theme.id} must contain exactly light and dark modes.`,
    );

    themeIds.add(theme.id);
    const expectedTokens = expectedTokensForTheme(theme, contracts);
    const modes = [];

    for (const mode of supportedModes) {
      const label = `${theme.id}/${mode}`;
      const tokenFile = await readJson(
        resolveThemeFoundryPath(theme.modes[mode], `Theme ${label}`),
        `theme ${label}`,
      );
      const metadata = tokenFile?.$extensions?.['themefoundry.theme'];
      assert(metadata?.id === theme.id, `Theme metadata id mismatch in ${label}.`);
      assert(metadata?.mode === mode, `Theme metadata mode mismatch in ${label}.`);

      const tokens = flattenTokens(tokenFile, label);
      const missing = [...expectedTokens.keys()].filter((path) => !tokens.has(path));
      const extra = [...tokens.keys()].filter((path) => !expectedTokens.has(path));
      assert(missing.length === 0, `${label} is missing tokens: ${missing.join(', ')}`);
      assert(extra.length === 0, `${label} contains extra tokens: ${extra.join(', ')}`);

      for (const [path, expectedType] of expectedTokens) {
        const token = tokens.get(path);
        assert(token.type === expectedType, `${label} token ${path} must have type ${expectedType}.`);
        assert(token.type === 'color', `${label} uses unsupported token type ${token.type}: ${path}`);
        validateColor(token.value, `${label} token ${path}`);
      }

      modes.push({ mode, tokens });
    }

    results.push({ id: theme.id, displayName: theme.displayName, modes });
  }

  assert(themeIds.has(catalog.defaultTheme), `Unknown default theme: ${catalog.defaultTheme}`);
  return results;
}

function generateCss(themes, defaultThemeId) {
  const lines = [
    '/* Generated by scripts/generate-themes.mjs from vendor/themefoundry. */',
    '/* Do not edit this file directly. */',
    '',
  ];

  for (const theme of themes) {
    for (const { mode, tokens } of theme.modes) {
      const selector = `:root[data-theme-id='${theme.id}'][data-color-mode='${mode}']`;
      const selectors = theme.id === defaultThemeId && mode === 'light' ? [':root', selector] : [selector];
      lines.push(`${selectors.join(',\n')} {`);
      lines.push(`  color-scheme: ${mode};`);
      for (const [tokenPath, token] of [...tokens.entries()].sort(([left], [right]) => left.localeCompare(right))) {
        lines.push(`  ${cssVariableName(tokenPath)}: ${cssColor(token.value)};`);
      }
      lines.push('}', '');
    }
  }

  return lines.join('\n');
}

function generateCatalog(themes, defaultThemeId) {
  const catalog = themes.map((theme) => ({
    id: theme.id,
    displayName: theme.displayName,
    modes: theme.modes.map(({ mode }) => mode),
    preview: Object.fromEntries(
      theme.modes.map(({ mode, tokens }) => [
        mode,
        {
          background: cssColor(tokens.get('color.background.primary').value),
          surface: cssColor(tokens.get('color.surface.primary').value),
          accent: cssColor(tokens.get('color.accent.primary').value),
        },
      ]),
    ),
  }));

  return `// Generated by scripts/generate-themes.mjs from vendor/themefoundry.\n` +
    `// Do not edit this file directly.\n\n` +
    `export const defaultThemeId = ${JSON.stringify(defaultThemeId)} as const;\n\n` +
    `export const themeCatalog = ${JSON.stringify(catalog, null, 2)} as const;\n\n` +
    `export type ThemeId = (typeof themeCatalog)[number]['id'];\n` +
    `export type ColorMode = (typeof themeCatalog)[number]['modes'][number];\n`;
}

async function main() {
  const catalog = await readJson(catalogPath, 'ThemeFoundry catalog');
  assert(catalog.schemaVersion === 1, 'ThemeFoundry catalog has an unsupported schema version.');
  assert(typeof catalog.defaultTheme === 'string', 'ThemeFoundry default theme is missing.');

  const contracts = await loadContracts(catalog);
  const themes = await loadThemes(catalog, contracts);
  await Promise.all([
    mkdir(dirname(cssOutputPath), { recursive: true }),
    mkdir(dirname(catalogOutputPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(cssOutputPath, generateCss(themes, catalog.defaultTheme), 'utf8'),
    writeFile(catalogOutputPath, generateCatalog(themes, catalog.defaultTheme), 'utf8'),
  ]);

  console.log(
    `Generated ${themes.length} themes with ${supportedModes.length} modes from ThemeFoundry ${catalog.schemaVersion}.`,
  );
}

await main();
