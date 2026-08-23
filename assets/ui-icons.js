(function () {
  'use strict';
  const ICONS = {
    menuTutorial: 'learn', menuRules: 'book', menuMatch: 'play', menuBook: 'chart',
    menuHelper1: 'bot', menuHelper2: 'blocks', menuGear: 'settings', menuView: 'camera',
    menuRecord: 'record', menuTech: 'trophy', menuDivision: 'home', menuLang: 'globe'
  };
  function svg(name) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('class', 'ui-icon'); el.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', 'assets/ui-icons.svg#' + name); el.appendChild(use); return el;
  }
  function decorate(button, name) {
    if (!button || button.querySelector('.ui-icon')) return;
    Array.from(button.childNodes).filter(n => n.nodeType === 3).forEach(n => {
      n.textContent = n.textContent.replace(/[\p{Extended_Pictographic}\u2039\u203a\u25b6\ufe0f]/gu, '').trim();
      if (!n.textContent) n.remove(); else n.textContent = ' ' + n.textContent + ' ';
    });
    button.prepend(svg(name));
  }
  function install() {
    Object.keys(ICONS).forEach(id => decorate(document.getElementById(id), ICONS[id]));
    const helper = document.querySelector('#menuHelper1 .mi-t');
    if (helper) new MutationObserver(() => {
      const use = document.querySelector('#menuHelper1 .ui-icon use');
      if (use) use.setAttribute('href', 'assets/ui-icons.svg#' + (/route|مسیر/i.test(helper.textContent) ? 'route' : 'bot'));
    }).observe(helper, { childList: true, characterData: true, subtree: true });
    [['tutExit','close'],['tutPrev','prev'],['tutRun','play'],['tutNext','next']].forEach(([id,name]) => decorate(document.getElementById(id), name));
    const title = document.getElementById('tutTitle'), lessonUse = document.querySelector('#tutLessonIcon use');
    if (title && lessonUse) {
      const refreshLessonIcon = () => {
        const t = title.textContent.toLowerCase();
        const name = /رنگ|colour/.test(t) ? 'palette' : /سپر|bumper/.test(t) ? 'shield' : /باتری|battery/.test(t) ? 'battery' : /قطب|heading|compass/.test(t) ? 'compass' : /مخزن|dust/.test(t) ? 'bin' : /حالت|state|بودجه|budget/.test(t) ? 'state' : /تایمر|timer|ماندگار|last/.test(t) ? 'clock' : 'eye';
        lessonUse.setAttribute('href', 'assets/ui-icons.svg#' + name);
      };
      new MutationObserver(refreshLessonIcon).observe(title, { childList:true, characterData:true, subtree:true }); refreshLessonIcon();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
