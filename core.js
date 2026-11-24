// Luna – Zyklusberechnung und Benachrichtigungsregeln (für Seite und Service Worker)
(function (g) {
  const DAY = 864e5;
  const toN = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
  const toS = n => new Date(n * DAY).toISOString().slice(0, 10);
  const T0 = () => { const t = new Date(); return Math.round(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / DAY); };
  const fmt = (n, o = { day: 'numeric', month: 'long' }) => new Date(n * DAY).toLocaleDateString('de-DE', { timeZone: 'UTC', ...o });

  const starts = p => [...new Set(p.starts)].map(toN).sort((a, b) => a - b);
  const gaps = p => {
    const s = starts(p), g = [];
    // Einträge sind nur gelegentliche Korrekturen: Eine große Lücke (z. B. 56 Tage) zählt als mehrere Zyklen
    const ref = p.cycle || 28;
    for (let i = 1; i < s.length; i++) {
      const d = s[i] - s[i - 1], k = d > ref * 1.6 ? Math.round(d / ref) : 1, len = Math.round(d / k);
      if (d >= 15 && d <= 400 && len >= 18 && len <= 60) g.push(len);
    }
    return g;
  };
  const avg = p => {
    const g = gaps(p).slice(-6);
    return p.auto && g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : p.cycle;
  };

  // Phase für Zyklustag d bei Zykluslänge len und Periodendauer P
  function phase(d, len, P) {
    if (d > len) return 'late';
    if (d <= P) return 'mens';
    const o = len - 14;
    if (d === o) return 'ovu';
    if (d >= o - 5 && d <= o + 1) return 'fert';
    if (d < o - 5) return 'foll';
    return d > len - 5 ? 'pms' : 'lut';
  }

  // Zyklus-Infos für Tag n (Tagesnummer)
  function info(p, n, T = T0()) {
    const st = starts(p);
    if (!st.length || n < st[0]) return null;
    const L = avg(p);
    let i = st.length - 1;
    while (st[i] > n) i--;
    let s = st[i], len, proj = false;
    if (i < st.length - 1) len = st[i + 1] - s;
    else {
      // ohne neuen Eintrag läuft die Rechnung einfach Zyklus für Zyklus weiter
      len = L;
      if (n >= s + L) { s += Math.floor((n - s) / L) * L; proj = true; }
    }
    const day = n - s + 1;
    return { s, len, day, proj, ph: phase(day, len, p.period) };
  }

  // nächster Periodenbeginn ab heute (heute eingeschlossen); late bleibt aus Kompatibilität immer 0
  function nextStart(p, T = T0()) {
    const st = starts(p);
    if (!st.length) return null;
    const s = st[st.length - 1], L = avg(p);
    return { n: T <= s ? s + L : s + Math.ceil((T - s) / L) * L, late: 0 };
  }

  // fruchtbares Fenster als Zyklustage (mit optionalem Sicherheitspuffer)
  const fertRange = (len, P, buffer) => {
    const o = len - 14;
    return [Math.max(P + 1, buffer ? o - 8 : o - 5), buffer ? o + 3 : o + 1];
  };

  const who = p => ((p.emoji || '') + ' ' + (p.name || 'Luna')).trim();

  // Benachrichtigungen, die an Tag T für Person p fällig sind
  function events(p, T, o) {
    const st = starts(p);
    if (!st.length) return [];
    const out = [], last = st[st.length - 1], L = avg(p);
    const add = (type, id, title, body) => {
      if (o[type] !== false) out.push({ key: p.id + ':' + id + ':' + toS(T), type, title: who(p) + ' · ' + title, body });
    };
    const inf = info(p, T, T);
    if (!inf || inf.ph === 'late') return out;
    if (inf.proj && inf.day === 1) add('period', 'due', 'Periode heute erwartet', 'Laut Rechnung beginnt heute die Periode. Ein paar Tage früher oder später sind normal.');
    const d = inf.day, len = inf.len, ov = len - 14, [fs, fe] = fertRange(len, p.period, o.buffer);
    if (d === len - 6) add('pms', 'pms-soon', 'in 2 Tagen beginnt die PMS-Zeit', 'Bald fallen Östrogen und Progesteron ab, viele werden dann dünnhäutiger. Heikle Themen besser jetzt klären oder nach der Periode.');
    if (d === len - 4) add('pms', 'pms', 'PMS-Zeit', 'Bis zur Periode sind viele gereizter. Wenn’s knirscht: nicht persönlich nehmen, Diskussionen vertagen.');
    if (d === len) add('period', 'soon', 'Periode morgen erwartet', 'Die ersten Tage sind für viele die anstrengendsten. Die nächsten Tage nicht zu voll planen.');
    if (d === fs) add('fert', 'fert', 'fruchtbare Tage ab heute', `Bis ${fmt(inf.s + fe - 1)} ist eine Schwangerschaft möglich. Kein Kinderwunsch? Jetzt nur mit sicherer Verhütung – die Rechnung ist nur eine Schätzung.`);
    if (d === ov - 2) add('mood', 'mood', 'Hochphase ✨', 'Rund um den Eisprung haben viele die meiste Energie und gute Laune – gute Tage, um etwas zusammen zu unternehmen.');
    return out;
  }

  // Zeitspannen der nächsten Zyklen für den Kalender-Export
  function spans(p, o, count = 6, T = T0()) {
    const st = starts(p);
    if (!st.length) return [];
    // c = fortlaufende Zyklusnummer: bleibt gleich, wenn sich die Prognose verschiebt (stabile Kalender-IDs)
    // laufender Zyklus (eingetragen oder weitergerechnet) plus die nächsten
    const last = st[st.length - 1], L = avg(p), P = p.period, cyc = [], n0 = st.length;
    const k0 = Math.max(0, Math.floor((T - last) / L)), cur = last + k0 * L;
    for (let k = 0; k <= count; k++) cyc.push([cur + k * L, L, n0 - 1 + k0 + k, k0 + k === 0]);
    const out = [];
    for (const [s, len, c, logged] of cyc) {
      const ov = len - 14, [fs, fe] = fertRange(len, P, o.buffer);
      if (!logged && o.period !== false) out.push({ type: 'period', c, from: s, to: s + P - 1 });
      if (o.fert !== false) out.push({ type: 'fert', c, from: s + fs - 1, to: s + fe - 1 });
      if (o.mood !== false) out.push({ type: 'mood', c, from: s + ov - 4, to: s + ov });
      if (o.pms !== false) out.push({ type: 'pms', c, from: s + len - 5, to: s + len - 1 });
    }
    return out.filter(x => x.to >= T);
  }

  g.LunaCore = { DAY, toN, toS, T0, fmt, starts, gaps, avg, phase, info, nextStart, events, spans, who };
})(typeof self !== 'undefined' ? self : this);
