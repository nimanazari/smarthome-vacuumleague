(function () {
  'use strict';
  const SPRITE = new URL('ui-icons.svg', document.currentScript && document.currentScript.src || location.href).href;
  const ICONS = {
    menuTut: 'learn', menuRules: 'book', menuMatch: 'play', menuBook: 'chart',
    menuHelper1: 'bot', menuHelper2: 'blocks', menuGear: 'settings', menuView: 'camera',
    menuRec: 'record', menuTech: 'trophy', menuDivision: 'home', menuLang: 'globe',
    menuRobot: 'bot'
  };
  function svg(name) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('class', 'ui-icon'); el.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', SPRITE + '#' + name); el.appendChild(use); return el;
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
      if (use) use.setAttribute('href', SPRITE + '#' + (/route|مسیر/i.test(helper.textContent) ? 'route' : 'bot'));
    }).observe(helper, { childList: true, characterData: true, subtree: true });
    [['tutExit','close'],['tutPrev','prev'],['tutRun','play'],['tutNext','next']].forEach(([id,name]) => decorate(document.getElementById(id), name));
    const title = document.getElementById('tutTitle'), lessonUse = document.querySelector('#tutLessonIcon use');
    if (title && lessonUse) {
      const refreshLessonIcon = () => {
        const t = title.textContent.toLowerCase();
        const name = /رنگ|colour/.test(t) ? 'palette' : /سپر|bumper/.test(t) ? 'shield' : /باتری|battery/.test(t) ? 'battery' : /قطب|heading|compass/.test(t) ? 'compass' : /مخزن|dust/.test(t) ? 'bin' : /حالت|state|بودجه|budget/.test(t) ? 'state' : /تایمر|timer|ماندگار|last/.test(t) ? 'clock' : 'eye';
        lessonUse.setAttribute('href', SPRITE + '#' + name);
      };
      new MutationObserver(refreshLessonIcon).observe(title, { childList:true, characterData:true, subtree:true }); refreshLessonIcon();
    }
    installEmojiReplacement();
  }
  const EMOJI_ICONS = new Map(Object.entries({
    '🎓':'learn','📖':'book','▶':'play','📊':'chart','🤖':'bot','🧩':'blocks','📍':'route','⚙':'settings','🎥':'camera','⏺':'record','🏆':'trophy','🏠':'home','🌐':'globe',
    '📡':'eye','🛡':'shield','🎨':'palette','🛑':'close','🔋':'battery','🔌':'battery','⚠':'warning','💾':'save','📂':'folder','🛠':'settings','🗺':'map','✏':'edit','🗑':'bin','💡':'learn','🔄':'loop','🔒':'lock','🔓':'unlock','💧':'palette','⏹':'close','⏸':'pause','⏩':'next','⏱':'clock','⬇':'download','📝':'edit','🔧':'settings','🔶':'warning','🟦':'blocks','⚡':'battery'
  }));
  const EMOJI_RE = /\p{Extended_Pictographic}\uFE0F?/gu;
  function cleanTextNode(node) {
    if (!node.nodeValue || !EMOJI_RE.test(node.nodeValue)) { EMOJI_RE.lastIndex = 0; return; }
    EMOJI_RE.lastIndex = 0;
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/.test(parent.tagName)) return;
    if (parent.tagName === 'OPTION' || parent.tagName === 'TITLE') { node.nodeValue = node.nodeValue.replace(EMOJI_RE, ''); return; }
    const frag = document.createDocumentFragment(); let at = 0;
    for (const match of node.nodeValue.matchAll(EMOJI_RE)) {
      if (match.index > at) frag.append(node.nodeValue.slice(at, match.index));
      const name = EMOJI_ICONS.get(Array.from(match[0])[0]);
      if (name) frag.append(svg(name));
      at = match.index + match[0].length;
    }
    if (at < node.nodeValue.length) frag.append(node.nodeValue.slice(at));
    node.replaceWith(frag);
  }
  function cleanTree(root) {
    if (root.nodeType === 3) return cleanTextNode(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes=[];
    while (walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach(cleanTextNode);
  }
  function installEmojiReplacement() {
    cleanTree(document.body);
    new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(cleanTree))).observe(document.body,{childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
