import baseEnglish from './en.json' with {type:'json'};
import achievementEnglish from './achievements-en.json' with {type:'json'};
import setEnglish from './sets-en.json' with {type:'json'};
import {SURVIVAL_ACHIEVEMENT_TRANSLATIONS} from '../systems/survival-achievements.js';
const english={...baseEnglish,...achievementEnglish,...setEnglish,...SURVIVAL_ACHIEVEMENT_TRANSLATIONS,
 'Сборщик':'Assembler',
 'За всё время в выживании':'Across survival runs','За забег':'Per run',
 'Только в выживании.':'Survival only.',
 'Прогресс миссий не учитывается.':'Mission progress does not count.'};
// AST and DOM text fragments can omit a sentence's final punctuation. Derive
// that safe boundary form once so dialogue does not need duplicate dictionary
// entries for the spoken line and the same line inside a larger UI fragment.
for(const [source,target] of Object.entries({...english})){
  const normalizedSource=source.replace(/[.!?]+$/u,'');
  if(normalizedSource!==source&&!(normalizedSource in english))english[normalizedSource]=target.replace(/[.!?]+$/u,'');
}

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGES = Object.freeze(['en', 'ru']);
export const normalizeLanguage = value => LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
const cyrillic = /[А-Яа-яЁё]/;
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest phrases win. Boundaries allow numbers next to units (e.g. 1.5с),
// but never translate a fragment inside an unknown Russian word.
const phrases = new RegExp(`(?<![А-Яа-яЁё])(?:${Object.keys(english).sort((a,b)=>b.length-a.length).map(escapePattern).join('|')})(?![А-Яа-яЁё])`, 'g');
export function translateText(value, language = DEFAULT_LANGUAGE) {
  const source = String(value);
  if (normalizeLanguage(language) === 'ru' || !cyrillic.test(source)) return source;
  return source
    .replace(/Вход с (\d+)-го уровня/g, 'Requires level $1')
    .replace(/Не хватает (\d+) биомассы/g, 'Need $1 more biomass')
    .replace(phrases, phrase => english[phrase])
    .replace(/«/g, '“').replace(/»/g, '”');
}

const attributes = ['aria-label', 'aria-description', 'aria-valuetext', 'title', 'alt', 'placeholder'];
const ignored = 'script,style,[translate="no"],[data-i18n="off"]';

// Localize at the presentation boundary: catalog names, event messages and
// saved gameplay data retain their canonical values. No DOM prototypes or
// game objects are patched. Original node values allow lossless EN → RU.
export function createLocalizer(doc, initialLanguage = DEFAULT_LANGUAGE) {
  let language = normalizeLanguage(initialLanguage);
  const originals = new WeakMap();
  function valueFor(node, key, current) {
    let fields = originals.get(node);
    if (!fields) { fields = new Map(); originals.set(node, fields); }
    const previous = fields.get(key);
    const source = previous?.output === current ? previous.source : current;
    const output = translateText(source, language);
    fields.set(key, {source, output});
    return output;
  }
  function visit(node) {
    if (node.nodeType === 3) {
      if (node.parentElement?.closest(ignored)) return;
      const current = node.nodeValue, output = valueFor(node, 'text', current);
      if (output !== current) node.nodeValue = output;
    } else if (node.nodeType === 1) {
      if (node.closest(ignored)) return;
      for (const key of attributes) {
        if (!node.hasAttribute(key)) continue;
        const current = node.getAttribute(key), output = valueFor(node, key, current);
        if (output !== current) node.setAttribute(key, output);
      }
    }
  }
  function localize(root = doc.documentElement) {
    visit(root);
    const walker = doc.createTreeWalker(root, 1 | 4); // elements and text
    while (walker.nextNode()) visit(walker.currentNode);
  }
  const observer = new doc.defaultView.MutationObserver(records => {
    // Observe only text, inserted nodes and translatable attributes, never
    // per-frame style/class changes. WeakMaps do not retain detached screens.
    const roots = new Set();
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(node => roots.add(node));
      else visit(record.target);
    }
    for (const root of roots) if (root.isConnected) localize(root);
  });
  doc.documentElement.lang = language;
  localize();
  observer.observe(doc.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:attributes});
  return {
    localize,
    get language() { return language; },
    setLanguage(next) {
      next = normalizeLanguage(next);
      if (next === language) return;
      language = next;
      doc.documentElement.lang = language;
      localize();
    },
    disconnect() { observer.disconnect(); },
  };
}
