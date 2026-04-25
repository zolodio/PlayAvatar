// ============================================================
//  CHOICE MODAL — generic interactive decision system
//  Drop this block into the game script, before renderAll().
//
//  Primary API:
//    showChoiceModal(config)
//
//  config shape:
//  {
//    title:    string            — heading line
//    prompt:   string            — instruction sentence
//    options:  [                 — list of choices to render
//      {
//        label:    string        — main button text
//        sub:      string?       — small detail line beneath label
//        color:    'green'|'yellow'|'red'|'gold'|'danger'|''  — accent
//        disabled: bool?         — greyed-out / unclickable
//        data:     any           — passed back to onChoose
//      }
//    ],
//    onChoose:  fn(option.data)  — called when player picks
//    onCancel:  fn()?            — called if player hits Cancel
//                                  (omit to hide Cancel button)
//    allowCancel: bool?          — force-show Cancel even with no onCancel
//    multi:     bool?            — multi-select mode; onChoose receives array
//    minPick:   number?          — min selections before Confirm enabled (multi)
//    maxPick:   number?          — max selections allowed (multi)
//    cancelLabel: string?        — override 'Cancel' text
//    confirmLabel: string?       — override 'Confirm' text (multi mode)
//  }
// ============================================================

function showChoiceModal(config) {
  let existing = document.getElementById('choice-modal-overlay');
  if (existing) existing.remove();

  const {
    title        = 'Choose',
    prompt       = '',
    options      = [],
    onChoose     = () => {},
    onCancel     = null,
    allowCancel  = false,
    multi        = false,
    minPick      = 1,
    maxPick      = options.length,
    cancelLabel  = 'Cancel',
    confirmLabel = 'Confirm',
  } = config;

  let selected = new Set(); // used in multi mode

  // ── Overlay shell ──────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'choice-modal-overlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:950',
    'background:rgba(0,0,0,0.88)',
    'display:flex;align-items:center;justify-content:center',
    'padding:16px',
    'animation:cmFadeIn 0.15s ease-out',
  ].join(';');

  // ── Modal box ──────────────────────────────────────────────
  const box = document.createElement('div');
  box.style.cssText = [
    'background:#1a1200',
    'border:2px solid #d4a843',
    'border-radius:12px',
    'padding:24px 20px 20px',
    'max-width:380px;width:100%',
    'max-height:85vh;overflow-y:auto',
    'font-family:\'Crimson Pro\',Georgia,serif',
  ].join(';');

  // Title
  const h = document.createElement('div');
  h.style.cssText = 'font-family:\'Cinzel\',serif;font-size:1rem;color:#d4a843;margin-bottom:6px;letter-spacing:2px;';
  h.textContent = title;
  box.appendChild(h);

  // Prompt
  if (prompt) {
    const p = document.createElement('div');
    p.style.cssText = 'font-size:0.85rem;color:#c9a96e;margin-bottom:16px;line-height:1.5;';
    p.textContent = prompt;
    box.appendChild(p);
  }

  // Multi-select counter
  let counterEl = null;
  if (multi) {
    counterEl = document.createElement('div');
    counterEl.style.cssText = 'font-family:\'Cinzel\',serif;font-size:0.65rem;color:rgba(200,160,80,0.6);margin-bottom:10px;letter-spacing:1px;';
    counterEl.textContent = `Select ${minPick === maxPick ? minPick : minPick + '–' + maxPick}`;
    box.appendChild(counterEl);
  }

  // ── Option buttons ─────────────────────────────────────────
  const ACCENT = {
    green:  { border:'#3a7a2a', bg:'rgba(42,92,42,0.4)', text:'#6aca6a' },
    yellow: { border:'#b87a20', bg:'rgba(122,85,16,0.4)', text:'#e8b040' },
    red:    { border:'#9a2020', bg:'rgba(107,21,21,0.4)', text:'#cc4040' },
    gold:   { border:'#d4a843', bg:'rgba(212,168,67,0.2)', text:'#f0d080' },
    danger: { border:'#7a1a1a', bg:'rgba(100,20,20,0.3)', text:'#cc4040' },
    '':     { border:'rgba(212,168,67,0.4)', bg:'rgba(44,26,12,0.6)', text:'#f5e8c0' },
  };

  const btnEls = [];
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  options.forEach((opt, i) => {
    const ac = ACCENT[opt.color || ''];
    const btn = document.createElement('button');
    btn.style.cssText = [
      'width:100%;text-align:left',
      `background:${ac.bg}`,
      `border:1px solid ${opt.disabled ? 'rgba(200,160,80,0.15)' : ac.border}`,
      'border-radius:7px;padding:10px 14px',
      'cursor:' + (opt.disabled ? 'not-allowed' : 'pointer'),
      'opacity:' + (opt.disabled ? '0.4' : '1'),
      'transition:filter 0.1s,transform 0.1s',
    ].join(';');

    // Label row
    const labelRow = document.createElement('div');
    labelRow.style.cssText = `font-family:'Cinzel',serif;font-size:0.8rem;letter-spacing:1px;color:${opt.disabled ? 'rgba(200,160,80,0.4)' : ac.text};`;
    labelRow.textContent = opt.label;
    btn.appendChild(labelRow);

    // Sub-label
    if (opt.sub) {
      const sub = document.createElement('div');
      sub.style.cssText = 'font-size:0.72rem;color:rgba(200,180,140,0.65);margin-top:2px;font-style:italic;';
      sub.textContent = opt.sub;
      btn.appendChild(sub);
    }

    if (!opt.disabled) {
      btn.addEventListener('mouseenter', () => {
        if (!selected.has(i)) btn.style.filter = 'brightness(1.25)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!selected.has(i)) btn.style.filter = '';
      });

      if (multi) {
        btn.addEventListener('click', () => {
          if (selected.has(i)) {
            selected.delete(i);
            btn.style.outline = '';
            btn.style.boxShadow = '';
          } else {
            if (selected.size >= maxPick) return;
            selected.add(i);
            btn.style.outline = `2px solid ${ac.border}`;
            btn.style.boxShadow = `0 0 8px ${ac.border}`;
          }
          if (counterEl) {
            counterEl.textContent = `${selected.size} / ${maxPick} selected`;
            counterEl.style.color = selected.size >= minPick ? '#6aca6a' : 'rgba(200,160,80,0.6)';
          }
          if (confirmBtn) confirmBtn.disabled = selected.size < minPick;
        });
      } else {
        btn.addEventListener('click', () => {
          overlay.remove();
          onChoose(opt.data);
        });
      }
    }

    btnEls.push(btn);
    grid.appendChild(btn);
  });
  box.appendChild(grid);

  // ── Footer buttons ─────────────────────────────────────────
  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:8px;margin-top:18px;justify-content:flex-end;';

  let confirmBtn = null;

  if (onCancel || allowCancel) {
    const cancBtn = document.createElement('button');
    cancBtn.textContent = cancelLabel;
    cancBtn.style.cssText = [
      'background:none',
      'border:1px solid rgba(200,160,80,0.3)',
      'border-radius:6px;padding:7px 18px',
      'font-family:\'Cinzel\',serif;font-size:0.75rem',
      'color:rgba(200,160,80,0.6);cursor:pointer;letter-spacing:1px',
    ].join(';');
    cancBtn.addEventListener('click', () => {
      overlay.remove();
      if (onCancel) onCancel();
    });
    footer.appendChild(cancBtn);
  }

  if (multi) {
    confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmLabel;
    confirmBtn.disabled = minPick > 0;
    confirmBtn.style.cssText = [
      'background:linear-gradient(135deg,#8b6914,#d4a843)',
      'border:none;border-radius:6px;padding:7px 20px',
      'font-family:\'Cinzel\',serif;font-size:0.75rem',
      'color:#2c1a0c;cursor:pointer;letter-spacing:1px',
      'transition:opacity 0.15s',
    ].join(';');
    confirmBtn.addEventListener('click', () => {
      if (selected.size < minPick) return;
      const picks = [...selected].map(i => options[i].data);
      overlay.remove();
      onChoose(picks);
    });
    footer.appendChild(confirmBtn);
  }

  if (footer.children.length) box.appendChild(footer);

  // ── Keyframe for fade-in ───────────────────────────────────
  if (!document.getElementById('cm-keyframes')) {
    const style = document.createElement('style');
    style.id = 'cm-keyframes';
    style.textContent = '@keyframes cmFadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(style);
  }

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


// ============================================================
//  CONVENIENCE WRAPPERS
//  Each wraps a common in-game decision in one call.
// ============================================================

// Pick one zone from a player's zones (optionally filtered)
// filterFn(zname, zone) → bool
function chooseZone(player, title, prompt, filterFn, onChoose, onCancel) {
  const zones = ['green','yellow','red'];
  const opts = zones
    .filter(z => filterFn ? filterFn(z, player.zones[z]) : true)
    .map(z => ({
      label: z.toUpperCase() + ' ZONE',
      sub: `Energy: ${player.zones[z].energy.length}  |  ${player.zones[z].charged ? '⚡ Charged' : 'Uncharged'}  |  Ally: ${player.zones[z].ally ? player.zones[z].ally.name : 'None'}`,
      color: z,
      data: z,
    }));

  if (!opts.length) { if (onCancel) onCancel(); return; }
  if (opts.length === 1) { onChoose(opts[0].data); return; } // auto-resolve
  showChoiceModal({ title, prompt, options: opts, onChoose, onCancel, allowCancel: !!onCancel });
}

// Pick one ally from a player's occupied zones
function chooseAlly(player, title, prompt, onChoose, onCancel) {
  const opts = ['green','yellow','red']
    .filter(z => player.zones[z].ally)
    .map(z => ({
      label: player.zones[z].ally.name,
      sub: `${z.toUpperCase()} zone  |  I:${player.zones[z].ally.int} F:${player.zones[z].ally.for}`,
      color: z,
      data: { zone: z, ally: player.zones[z].ally },
    }));

  if (!opts.length) { if (onCancel) onCancel(); return; }
  if (opts.length === 1) { onChoose(opts[0].data); return; }
  showChoiceModal({ title, prompt, options: opts, onChoose, onCancel, allowCancel: !!onCancel });
}

// Pick one energy pip from a player's zones (first from each non-empty zone)
function chooseEnergy(player, title, prompt, onChoose, onCancel) {
  const opts = ['red','yellow','green']
    .filter(z => player.zones[z].energy.length > 0)
    .map(z => ({
      label: z.toUpperCase() + ' energy',
      sub: `${player.zones[z].energy.length} available`,
      color: z,
      data: z,
    }));

  if (!opts.length) { if (onCancel) onCancel(); return; }
  showChoiceModal({ title, prompt, options: opts, onChoose, onCancel, allowCancel: !!onCancel });
}

// Show top N deck cards and let player reorder (drag-free: pick order by clicking)
function chooseDeckOrder(player, n, onDone) {
  if (player.deck.length === 0) { onDone(); return; }
  const cards = player.deck.slice(0, Math.min(n, player.deck.length));
  const ordered = [];

  function pickNext() {
    const remaining = cards.filter(c => !ordered.includes(c));
    if (!remaining.length) {
      // Splice back into top of deck in chosen order
      for (let i = ordered.length - 1; i >= 0; i--) {
        const idx = player.deck.indexOf(ordered[i]);
        if (idx !== -1) player.deck.splice(idx, 1);
        player.deck.unshift(ordered[i]);
      }
      addLog(`${player.name} reordered top ${ordered.length} card(s).`);
      onDone();
      return;
    }
    showChoiceModal({
      title: 'Reorder Your Deck',
      prompt: `Choose card #${ordered.length + 1} (top of deck). ${remaining.length} card(s) left to place.`,
      options: remaining.map(c => ({
        label: c.name,
        sub: `${c.type.toUpperCase()}  |  I:${c.int} F:${c.for}  |  Cost: ${c.g}G ${c.y}Y ${c.r}R`,
        color: '',
        data: c,
      })),
      onChoose: (card) => { ordered.push(card); pickNext(); },
    });
  }

  pickNext();
}


// ============================================================
//  PATCHED GAME FUNCTIONS
//  Replace the stub versions in the main script with these.
// ============================================================

// ── applyImmediateEffect (full interactive version) ─────────
function applyImmediateEffect(card, player, zoneName) {
  const opp = G.players[1 - player.idx];
  const r   = card.rules || '';

  if (r.includes('Add a red energy')) {
    gainEnergy(player, 'red', 1);
    addLog(`${player.name} gains red energy!`);
  }

  // "Look at top N cards and reorder"
  const topMatch = r.match(/[Ll]ook at the top (\w+) cards? of your deck[^.]*\. (?:You may )?[Rr]eorder/);
  if (topMatch) {
    const words = { one:1, two:2, three:3, four:4, five:5 };
    const n = words[topMatch[1].toLowerCase()] || parseInt(topMatch[1]) || 2;
    chooseDeckOrder(player, n, () => { renderAll(); });
  }

  // "Look at the top card of your deck" (peek only)
  if (r.includes('Look at the top card of your deck') && !topMatch) {
    if (player.deck.length > 0) addLog(`${player.name} peeks: ${player.deck[0].name}`);
  }

  // "You may charge any zone" / "charge one of your zones"
  if (r.includes('You may charge any zone') || (r.includes('charge one of your zones') && !r.includes('If this zone'))) {
    chooseZone(
      player,
      'Charge a Zone',
      'Choose one of your zones to charge.',
      (_z, zone) => !zone.charged,
      (zname) => { player.zones[zname].charged = true; addLog(`${player.name} charges ${zname} zone!`); renderAll(); },
      () => { addLog(`${player.name} skips charging.`); }
    );
  }

  // "If this zone is already charged, charge any zone"
  if (r.includes('If this zone is already charged') && r.includes('charge any zone')) {
    if (player.zones[zoneName].charged) {
      chooseZone(
        player,
        'Bonus Charge',
        'Zone was already charged — pick another zone to charge.',
        (z, zone) => z !== zoneName && !zone.charged,
        (zname) => { player.zones[zname].charged = true; addLog(`${player.name} charges ${zname}!`); renderAll(); }
      );
    }
  }

  // "If this zone is already charged, uncharge any zone" (Bad Breath etc.)
  if (r.includes('If this zone is already charged') && r.includes('uncharge any zone')) {
    if (player.zones[zoneName].charged) {
      chooseZone(
        player,
        'Uncharge a Zone',
        'Zone was already charged — pick a zone to uncharge.',
        (z, zone) => z !== zoneName && zone.charged,
        (zname) => { player.zones[zname].charged = false; addLog(`${player.name} uncharges ${zname}!`); renderAll(); }
      );
    }
  }

  // "You may uncharge any zone"
  if (r.includes('You may uncharge any zone') || r.includes('uncharge one of your zones')) {
    chooseZone(
      player,
      'Uncharge a Zone',
      'Choose one of your zones to uncharge.',
      (_z, zone) => zone.charged,
      (zname) => { player.zones[zname].charged = false; addLog(`${player.name} uncharges ${zname}!`); renderAll(); },
      () => { addLog(`${player.name} skips uncharging.`); }
    );
  }

  // "turns the top card of his or her deck face up" (peek opponent)
  if (r.includes('turns the top card of his or her deck face up')) {
    if (opp.deck.length > 0) {
      const top = opp.deck[0];
      showChoiceModal({
        title: `${opp.name}'s Top Card`,
        prompt: 'You peeked at their next card. Close to continue.',
        options: [{
          label: top.name,
          sub: `${top.type.toUpperCase()}  |  I:${top.int} F:${top.for}  |  Cost: ${top.g}G ${top.y}Y ${top.r}R`,
          color: '',
          data: null,
        }],
        onChoose: () => {},
      });
    }
  }

  // Charisma — "Your opponent moves one of his or her allies to your side"
  if (r.includes('Your opponent moves one of his or her allies')) {
    chooseAlly(
      opp,
      'Charisma',
      `Choose one of ${opp.name}'s allies to move to your side.`,
      ({ zone, ally }) => {
        opp.zones[zone].ally = null;
        // Place in first empty zone on player's side
        const target = ['green','yellow','red'].find(z => !player.zones[z].ally);
        if (target) {
          player.zones[target].ally = ally;
          addLog(`Charisma! ${ally.name} moves to ${player.name}'s ${target} zone!`);
        } else {
          player.discard.push(ally);
          addLog(`Charisma! ${ally.name} has no empty zone — discarded.`);
        }
        renderAll();
      }
    );
  }

  // "You may eliminate one of your allies. If you do, eliminate one of your opponent's allies"
  if (r.includes('You may eliminate one of your allies. If you do, eliminate one of your opponent\'s allies')) {
    const hasOwnAlly = ['green','yellow','red'].some(z => player.zones[z].ally);
    const hasOppAlly = ['green','yellow','red'].some(z => opp.zones[z].ally);
    if (hasOwnAlly && hasOppAlly) {
      chooseAlly(
        player,
        'Sacrifice an Ally',
        'Choose your ally to eliminate. Their ally will also be eliminated.',
        ({ zone, ally }) => {
          player.zones[zone].ally = null;
          player.discard.push(ally);
          addLog(`${player.name} sacrifices ${ally.name}!`);
          chooseAlly(
            opp,
            'Eliminate Opponent\'s Ally',
            `Now choose one of ${opp.name}'s allies to eliminate.`,
            ({ zone: oz, ally: oa }) => {
              opp.zones[oz].ally = null;
              opp.discard.push(oa);
              addLog(`${opp.name}'s ${oa.name} is eliminated!`);
              renderAll();
            }
          );
        },
        () => { addLog(`${player.name} declines the trade.`); }
      );
    }
  }

  // "You may eliminate an ally" (own only — e.g. Funeral Pyre)
  if (r.includes('You may eliminate an ally') && !r.includes("opponent's allies")) {
    const hasAlly = ['green','yellow','red'].some(z => player.zones[z].ally);
    if (hasAlly) {
      chooseAlly(
        player,
        'Eliminate an Ally',
        'Choose one of your allies to eliminate.',
        ({ zone, ally }) => {
          player.zones[zone].ally = null;
          player.discard.push(ally);
          addLog(`${player.name} eliminates ${ally.name}!`);
          renderAll();
        },
        () => { addLog(`${player.name} keeps their allies.`); }
      );
    }
  }

  // "Your opponent uncharges one of his or her zones" (immediate version)
  if (r.includes('Your opponent uncharges one of his or her zones') && card.type === 'advantage') {
    chooseZone(
      opp,
      'Opponent Uncharges',
      `Choose one of ${opp.name}'s charged zones to uncharge.`,
      (_z, zone) => zone.charged,
      (zname) => { opp.zones[zname].charged = false; addLog(`${opp.name}'s ${zname} zone uncharged!`); renderAll(); }
    );
  }

  // "Your opponent eliminates one of his or her allies" (immediate version)
  if (r.includes('Your opponent eliminates one of his or her allies') && card.type === 'advantage') {
    chooseAlly(
      opp,
      'Opponent Loses an Ally',
      `Choose one of ${opp.name}'s allies to eliminate.`,
      ({ zone, ally }) => {
        opp.zones[zone].ally = null;
        opp.discard.push(ally);
        addLog(`${opp.name}'s ${ally.name} is eliminated!`);
        renderAll();
      }
    );
  }

  // Volcanic Fountain — "You may eliminate an energy in this zone. If you do, eliminate one of your opponent's energy"
  if (r.includes('You may eliminate an energy in this zone. If you do, eliminate one of your opponent')) {
    if (player.zones[zoneName].energy.length > 0) {
      showChoiceModal({
        title: 'Volcanic Fountain',
        prompt: `Eliminate 1 ${zoneName} energy to destroy one of ${opp.name}'s energy?`,
        options: [
          { label: 'Yes — Trade Energy', color: 'gold', data: true },
          { label: 'No — Skip',          color: '',     data: false },
        ],
        onChoose: (doIt) => {
          if (!doIt) return;
          player.zones[zoneName].energy.pop();
          // Now opponent chooses (or auto-pick highest zone)
          chooseEnergy(
            opp,
            'Choose Energy to Lose',
            `${opp.name} must eliminate one energy.`,
            (zname) => {
              opp.zones[zname].energy.pop();
              addLog(`Volcanic Fountain: ${player.name} traded for ${opp.name}'s ${zname} energy!`);
              renderAll();
            }
          );
        },
      });
    }
  }

  // "You are now defending up one zone" (Yip Yip!)
  if (r.includes('You are now defending up one zone')) {
    const zones = ['green','yellow','red'];
    const ci = zones.indexOf(zoneName);
    if (ci < zones.length - 1) {
      G.currentZone = zones[ci + 1];
      addLog(`Yip Yip! — defending jumps to ${G.currentZone} zone!`);
    }
  }
}


// ── applyPassiveSetup (full version) ───────────────────────
function applyPassiveSetup(card, player, zoneName) {
  const r = card.rules || '';
  if (r.includes('skips defending in his or her green zone')) {
    G.skipGreenZone = true;
    addLog(`${card.name}: opponent will skip their green zone!`);
  }
  if (r.includes("Your opponent's strikes cost an additional yellow energy")) {
    addLog(`${card.name}: ${G.players[G.attacker].name}'s strikes cost +1 yellow!`);
  }
}


// ── applyCounterattackEffect (interactive version) ─────────
function applyCounterattackEffect(card, player, zoneName, force) {
  const opp = G.players[1 - player.idx];
  const r   = card.rules || '';

  // Opponent uncharges — they choose (or attacker chooses for them)
  if (r.includes('your opponent uncharges one of his or her zones')) {
    const charged = ['green','yellow','red'].filter(z => opp.zones[z].charged);
    if (charged.length > 1) {
      chooseZone(
        opp,
        'Uncharge a Zone',
        `${player.name}'s counterattack forces you to uncharge a zone.`,
        (_z, zone) => zone.charged,
        (zname) => { opp.zones[zname].charged = false; addLog(`${opp.name} uncharges ${zname}!`); renderAll(); }
      );
    } else if (charged.length === 1) {
      opp.zones[charged[0]].charged = false;
      addLog(`${opp.name}'s ${charged[0]} uncharged!`);
    }
  }

  // Eliminate green energy (single)
  if (r.includes('you may eliminate a green energy') && opp.zones.green.energy.length > 0) {
    showChoiceModal({
      title: 'Strike Effect',
      prompt: `Eliminate one of ${opp.name}'s green energy?`,
      options: [
        { label: 'Yes — Eliminate It', color: 'gold',   data: true  },
        { label: 'No — Skip',          color: 'danger', data: false },
      ],
      onChoose: (doIt) => {
        if (doIt) { opp.zones.green.energy.pop(); addLog(`${opp.name} loses 1 green energy!`); }
        renderAll();
      },
    });
  }

  // Eliminate up to two green energy
  if (r.includes('you may eliminate up to two green energy')) {
    const avail = opp.zones.green.energy.length;
    if (avail > 0) {
      const opts = [
        avail >= 2 ? { label: 'Eliminate 2 Green', color: 'gold', data: 2 } : null,
        { label: 'Eliminate 1 Green', color: 'yellow', data: 1 },
        { label: 'Skip', color: '', data: 0 },
      ].filter(Boolean);
      showChoiceModal({
        title: 'Strike Effect',
        prompt: `How many of ${opp.name}'s green energy to eliminate?`,
        options: opts,
        onChoose: (n) => {
          for (let i = 0; i < n; i++) opp.zones.green.energy.pop();
          if (n > 0) addLog(`${opp.name} loses ${n} green energy!`);
          renderAll();
        },
      });
    }
  }

  // Opponent loses an ally (player picks which)
  if (r.includes('your opponent eliminates one of his or her allies')) {
    chooseAlly(
      opp,
      'Opponent Loses an Ally',
      `Choose which of ${opp.name}'s allies is eliminated.`,
      ({ zone, ally }) => {
        opp.zones[zone].ally = null;
        opp.discard.push(ally);
        addLog(`${opp.name}'s ${ally.name} is eliminated!`);
        renderAll();
      }
    );
  }

  // "your opponent eliminates one of his or her energy" (any color)
  if (r.includes('your opponent eliminates one of his or her energy') && !r.includes('green energy')) {
    chooseEnergy(
      opp,
      'Lose an Energy',
      `${player.name}'s strike forces ${opp.name} to discard one energy.`,
      (zname) => {
        opp.zones[zname].energy.pop();
        addLog(`${opp.name} loses 1 ${zname} energy!`);
        renderAll();
      }
    );
  }

  // Skip opponent green zone (strike-based)
  if (r.includes('skips defending in his or her green zone') && !r.toLowerCase().includes('advantage')) {
    G.skipGreenZone = true;
    addLog(`${opp.name} will skip their green zone next turn!`);
  }

  // Energy moves (self)
  if (r.includes('move one of your green energy to your yellow zone') && player.zones.green.energy.length > 0) {
    const e = player.zones.green.energy.pop();
    player.zones.yellow.energy.push(e);
    addLog(`${player.name} moved green → yellow energy.`);
  }
  if (r.includes('move one of your yellow energy to your red zone') && player.zones.yellow.energy.length > 0) {
    const e = player.zones.yellow.energy.pop();
    player.zones.red.energy.push(e);
    addLog(`${player.name} moved yellow → red energy.`);
  }

  // Eliminate all opponent green
  if (r.includes("eliminate all of your opponent's green energy")) {
    opp.zones.green.energy = [];
    addLog(`${opp.name}'s entire green energy pool eliminated!`);
  }

  // Charge this zone
  if (r.includes('charge this zone') && !player.zones[zoneName].charged) {
    player.zones[zoneName].charged = true;
    addLog(`${player.name}'s ${zoneName} zone charged!`);
  }
}


// ── applyPassiveSetup — swap-charge interactive version ─────
// Called when an advantage with "uncharge one of your zones. If you do, charge one of your zones"
// is played. Wire this to the button in renderCenterPanel if needed.
function promptSwapCharge(player) {
  chooseZone(
    player,
    'Swap Charge — Uncharge',
    'Choose a charged zone to uncharge…',
    (_z, zone) => zone.charged,
    (unchargeZone) => {
      player.zones[unchargeZone].charged = false;
      addLog(`${player.name} uncharges ${unchargeZone}.`);
      chooseZone(
        player,
        'Swap Charge — Charge',
        '…now choose a zone to charge.',
        (z, zone) => z !== unchargeZone && !zone.charged,
        (chargeZone) => {
          player.zones[chargeZone].charged = true;
          addLog(`${player.name} charges ${chargeZone}!`);
          renderAll();
        },
        () => { addLog('No zone to charge.'); renderAll(); }
      );
    },
    () => { addLog(`${player.name} skips the swap.`); }
  );
}
