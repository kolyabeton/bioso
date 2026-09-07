/** Presentation only: state changes are consumed once, including across HUD refreshes. */
export function effectiveReducedMotion(setting, system = false) { return Boolean(setting || system); }
export function createChangeTracker() {
  let previous;
  return {
    sample(next) {
      const before = previous; previous = {...next};
      return before ? Object.keys(next).filter(key => next[key] !== before[key]) : [];
    },
    reset() { previous = undefined; },
  };
}
export function pulse(element, kind = 'energy') {
  if (!element || element.ownerDocument.body.dataset.reducedMotion === 'true') return;
  const frames = kind === 'health-damage'
    ? [{backgroundColor:'#e98276',boxShadow:'inset 0 0 0 1px #ffd0bc'}, {backgroundColor:'#e98276',boxShadow:'inset 0 0 0 1px #ffd0bc',offset:.25}, {backgroundColor:'#243a36',boxShadow:'inset 0 0 0 1px transparent'}]
    : kind === 'damage'
    ? [{boxShadow:'inset 0 0 0 1px #e4a18f, 0 0 18px #e4a18f55'}, {boxShadow:'inset 0 0 0 1px transparent, 0 0 0 transparent'}]
    : [{boxShadow:'inset 0 0 0 1px #9adfcd, 0 0 18px #9adfcd44'}, {boxShadow:'inset 0 0 0 1px transparent, 0 0 0 transparent'}];
  element.getAnimations?.().filter(a => a.id === 'bio-feedback').forEach(a => a.cancel());
  const animation = element.animate?.(frames, {duration:kind === 'shot' ? 130 : kind === 'health-damage' ? 650 : 360, easing:'ease-out'});
  if (animation) animation.id = 'bio-feedback';
}
export function enterScreen(dialog, content) {
  if (dialog.ownerDocument.body.dataset.reducedMotion === 'true') return;
  dialog.getAnimations?.().forEach(a => a.cancel());
  dialog.animate?.([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
  const cards = content.querySelectorAll('.ui-home-actions>.ui-button,.ui-choice,.ui-ability-row,.ui-catalog-grid>.ui-part-card');
  [...cards].slice(0,8).forEach((card,i) => card.animate?.([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,delay:i*22,fill:'backwards',easing:'ease-out'}));
}
