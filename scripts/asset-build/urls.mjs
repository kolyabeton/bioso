import MagicString from 'magic-string';

// Handles complete URLs inside strings, HTML templates and CSS alike. Unknown
// paths stay intact; the asset manifest, not a file-extension guess, owns routing.
export function rewriteAssetUrls(value, urls) {
  return value.replace(/(^|[(`"'=:\s])\/(?:assets|icons|licenses)\/[\w./-]+/g, match => {
    const prefix = match.startsWith('/') ? '' : match[0];
    const path = match.slice(prefix.length);
    return prefix + (urls[path] ?? path);
  });
}

export function rewriteAssetModule(code, ast, urls) {
  const result = new MagicString(code);
  let runtime = false;
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    const source = code.slice(node.start, node.end);
    if (node.type === 'Literal' && typeof node.value === 'string') {
      const value = rewriteAssetUrls(node.value, urls);
      if (value !== node.value) result.overwrite(node.start, node.end, JSON.stringify(value));
      return;
    }
    // Wrap the complete concatenation/template, after its interpolations have
    // evaluated. This includes ability IDs, SVG hrefs and inline background URLs.
    if ((node.type === 'TemplateLiteral' || node.type === 'BinaryExpression' && node.operator === '+') && /\/(assets|icons)\//.test(source)) {
      // Parentheses preserve the token boundary in valid compact source such as
      // return`<img ...>`, typeof`...`, or throw`...`.
      result.prependLeft(node.start, '(__biosoAssetUrls(');
      result.appendRight(node.end, '))');
      runtime = true;
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object' && value.type) visit(value);
    }
  };
  visit(ast);
  if (runtime) result.prepend('import {assetUrls as __biosoAssetUrls} from "virtual:bioso-asset-urls";\n');
  return {code: result.toString(), map: result.generateMap({hires: true})};
}

export function assetUrlPlugin(root, urls, {relativeRuntime = false} = {}) {
  const runtimeUrls = relativeRuntime
    ? Object.fromEntries(Object.entries(urls).map(([source, output]) => [source, '.' + output]))
    : urls;
  const virtualId = '\0virtual:bioso-asset-urls';
  return {
    name: 'bioso-optimized-assets',
    enforce: 'pre',
    resolveId(id) { if (id === 'virtual:bioso-asset-urls') return virtualId; },
    load(id) {
      if (id === virtualId) return `const urls=${JSON.stringify(runtimeUrls)};export const assetUrls=value=>(${rewriteAssetUrls.toString()})(value,urls);`;
    },
    transform(code, id) {
      if (!id.startsWith(`${root}/src/`)) return null;
      if (id.endsWith('.css')) return {code: rewriteAssetUrls(code, urls), map: null};
      if (id.endsWith('.js')) return rewriteAssetModule(code, this.parse(code), runtimeUrls);
    },
    transformIndexHtml: {order: 'pre', handler: html => rewriteAssetUrls(html, runtimeUrls)},
  };
}

// Vite's PostCSS importer reads nested @imports without running transform() on
// each file. Rewrite declarations after imports have been expanded as well.
export function assetCssPlugin(urls) {
  return {postcssPlugin:'bioso-asset-urls', Declaration(declaration) {
    declaration.value = rewriteAssetUrls(declaration.value, urls);
  }};
}
