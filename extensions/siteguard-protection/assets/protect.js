(function () {
  var c = window.SG_CONFIG || {};
  var raw = window.SG_RAW || {};
  var allow = 'input, textarea, [contenteditable="true"]';
  var el = function (t) { return t && t.nodeType === 1 ? t : t && t.parentElement; };

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---------- Content protection ----------
  if (c.rightClick) {
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  if (c.textSelect) {
    document.body.classList.add('sg-no-select');
    ['selectstart', 'copy', 'cut'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var t = el(e.target);
        if (!t || !t.closest(allow)) e.preventDefault();
      });
    });
  }

  if (c.images) {
    document.addEventListener('dragstart', function (e) {
      var t = el(e.target);
      if (t && (t.tagName === 'IMG' || t.tagName === 'VIDEO')) e.preventDefault();
    });
  }

  if (c.shortcuts) {
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      var ctrl = e.ctrlKey || e.metaKey;
      if (
        e.key === 'F12' ||
        (ctrl && e.shiftKey && ['i', 'j', 'c'].indexOf(k) > -1) ||
        (ctrl && ['u', 's', 'p'].indexOf(k) > -1)
      ) e.preventDefault();
    });
  }

  // ---------- Country blocker ----------
  var list = (c.blocked || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (list.length && list.indexOf(c.country) > -1) {
    var msg = (raw.country && raw.country.message) || 'Access not available in your region';
    document.body.innerHTML = '';
    var blocked = make('div', 'sg-blocked');
    blocked.appendChild(make('h2', '', msg));
    document.body.appendChild(blocked);
    return;
  }

  // ---------- Age verification popup ----------
  var age = raw.age || {};
  if (age.enabled && read('sg_age_ok') !== '1') {
    var overlay = make('div', 'sg-age-overlay');
    var box = make('div', 'sg-age-box');
    box.appendChild(make('p', 'sg-age-text', age.text || 'You must be 18 or older to enter this site.'));

    var yes = make('button', 'sg-btn sg-btn-yes', age.yesButton || 'I am 18 or older');
    yes.type = 'button';
    yes.addEventListener('click', function () {
      store('sg_age_ok', '1');
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
      document.documentElement.classList.remove('sg-lock');
    });

    var no = make('button', 'sg-btn sg-btn-no', age.noButton || 'Exit');
    no.type = 'button';
    no.addEventListener('click', function () {
      var u = String(age.exitUrl || '');
      window.location.href = /^https?:\/\//i.test(u) ? u : 'https://www.google.com';
    });

    var row = make('div', 'sg-btn-row');
    row.appendChild(yes);
    row.appendChild(no);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.documentElement.classList.add('sg-lock');
  }

  // ---------- GDPR cookie banner ----------
  var gdpr = raw.gdpr || {};
  if (gdpr.enabled && read('sg_gdpr_ok') !== '1') {
    var bar = make('div', 'sg-gdpr-bar');
    bar.appendChild(make('span', 'sg-gdpr-text', gdpr.text || 'We use cookies to improve your experience on our site.'));
    var accept = make('button', 'sg-btn sg-btn-yes', gdpr.button || 'Accept');
    accept.type = 'button';
    accept.addEventListener('click', function () {
      store('sg_gdpr_ok', '1');
      bar.parentNode && bar.parentNode.removeChild(bar);
    });
    bar.appendChild(accept);
    document.body.appendChild(bar);
  }
})();