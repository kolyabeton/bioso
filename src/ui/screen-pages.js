// Paginate real controls without cloning them: values, drag targets and handlers stay intact.
export function paginateScreen(content, state = {}) {
  // Confirmations keep their actions at the bottom and scroll the content as a whole.
  if (content.closest('.ui-dialog--confirmation')) return;
  // Assembly keeps all mounts visible and scrolls only the inventory rail.
  if (content.querySelector('.ui-level-body,.ui-catalog-sets,.meta-screen,.ui-assembly,.atlas-body,.ui-soul-panel,.ui-ability-browser,.ui-event-detail,.ui-encounters,.ui-component-library')) return;
  let serial = 0;
  function fit(host, limit) {
    if (!host || host.dataset.paged || !host.children.length) return;
    const key = String(serial++);
    if (limit) host.style.height = `${limit}px`;
    if (host.scrollHeight <= host.clientHeight + 2) return;
    const nodes = [...host.children];
    const layout = getComputedStyle(host);
    const grid = layout.display === 'grid';
    const columns = layout.gridTemplateColumns;
    const gap = layout.gap;
    const height = host.clientHeight;
    host.dataset.paged = 'true';
    host.style.height = `${height}px`;
    host.style.minHeight = `${height}px`;
    host.style.flex = 'none';
    const body = document.createElement('div');
    body.className = 'ui-page-content';
    if (grid) { body.style.display = 'grid'; body.style.gridTemplateColumns = columns; body.style.gap = gap; body.style.alignContent = 'start'; }
    body.append(...nodes);
    const nav = document.createElement('nav');
    nav.className = 'ui-page-nav';
    nav.setAttribute('aria-label', 'Страницы');
    const prev = document.createElement('button'), next = document.createElement('button'), label = document.createElement('span');
    prev.type = next.type = 'button'; prev.className = next.className = 'ui-button';
    prev.textContent = '←'; next.textContent = '→';
    prev.setAttribute('aria-label', 'Предыдущая страница'); next.setAttribute('aria-label', 'Следующая страница');
    label.setAttribute('aria-live','polite'); nav.append(prev, label, next); host.append(body, nav);
    nodes.forEach(n => n.hidden = true);
    const pages = []; let page = [];
    for (const node of nodes) {
      node.hidden = false;
      if (body.scrollHeight > body.clientHeight + 2 && page.length) {
        page.forEach(n => n.hidden = true); pages.push(page); page = [];
      }
      if (body.scrollHeight > body.clientHeight + 2 && node.children.length) {
        const cs = getComputedStyle(node);
        fit(node, Math.max(60, body.clientHeight - parseFloat(cs.marginTop || 0) - parseFloat(cs.marginBottom || 0)));
      }
      page.push(node);
    }
    if (page.length) pages.push(page);
    let index = Math.min(state[key] || 0, pages.length - 1);
    const show = () => {
      nodes.forEach(n => n.hidden = !pages[index].includes(n));
      state[key] = index; label.textContent = `${index + 1} / ${pages.length}`;
      prev.disabled = index === 0; next.disabled = index === pages.length - 1;
    };
    prev.onclick = () => { index--; show(); next.focus({preventScroll:true}); };
    next.onclick = () => { index++; show(); prev.focus({preventScroll:true}); };
    show();
  }
  // Preserve the creature and actions while inventory and mounts turn independently.
  const inventory = content.querySelector('.ui-inventory-scroll');
  const grid = inventory?.querySelector(':scope > .ui-inventory-grid');
  if(grid){inventory.append(...grid.children);grid.remove();inventory.classList.add('ui-inventory-grid');}
  content.querySelectorAll('.ui-loadout-side,.ui-inventory-scroll,.ui-ability-reading,.ui-catalog-grid').forEach(el => fit(el));
  // Assembly reserves space for every section; only its inventory may paginate.
  if (!content.querySelector('.ui-assembly')) fit(content.querySelector(':scope > .ui-screen-body'));
}
