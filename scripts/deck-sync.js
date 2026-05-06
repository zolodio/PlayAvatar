// ============================================================
// DECK SYNC MODULE — Handles login, deck storage, and syncing
// ============================================================

// localStorage keys
const STORAGE_KEY_USER = 'avatar-tcg-user';
const STORAGE_KEY_DECKS = 'avatar-tcg-decks';
const STORAGE_KEY_SESSION = 'avatar-tcg-session-token';

// Session state
let currentUser = null;
let userDecks = [];

// Initialize sync system on page load
function initDeckSync() {
  loadUserSession();
  loadStoredDecks();
}

// ============================================================
// LOGIN / SESSION MANAGEMENT
// ============================================================

function saveUserSession(username, sessionToken) {
  currentUser = { username, sessionToken, loginTime: Date.now() };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
  localStorage.setItem(STORAGE_KEY_SESSION, sessionToken);
}

function loadUserSession() {
  const stored = localStorage.getItem(STORAGE_KEY_USER);
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored user:', e);
      currentUser = null;
    }
  }
}

function clearUserSession() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_SESSION);
}

function isUserLoggedIn() {
  return currentUser !== null && currentUser.username;
}

function getCurrentUsername() {
  return currentUser ? currentUser.username : '';
}

// ============================================================
// DECK STORAGE
// ============================================================

function saveStoredDecks() {
  localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(userDecks));
}

function loadStoredDecks() {
  const stored = localStorage.getItem(STORAGE_KEY_DECKS);
  if (stored) {
    try {
      userDecks = JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored decks:', e);
      userDecks = [];
    }
  }
}

function addDeck(deckName, deckCode, characterId) {
  if (!currentUser || !deckName || !deckCode) return false;
  
  const deckId = 'deck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const deck = {
    id: deckId,
    name: deckName,
    characterId,
    code: deckCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  userDecks.push(deck);
  saveStoredDecks();
  return deck;
}

function removeDeck(deckId) {
  const idx = userDecks.findIndex(d => d.id === deckId);
  if (idx >= 0) {
    userDecks.splice(idx, 1);
    saveStoredDecks();
    return true;
  }
  return false;
}

function getDeckById(deckId) {
  return userDecks.find(d => d.id === deckId);
}

function getDecksByCharacter(charId) {
  return userDecks.filter(d => d.characterId === charId);
}

function getAllDecks() {
  return userDecks;
}

// ============================================================
// DECK IMPORT / EXPORT
// ============================================================

function exportDeckCode(deckTemplate) {
  // Simple deck code: comma-separated "cardid:count" pairs
  const pairs = deckTemplate.map(entry => `${entry.id}:${entry.count}`);
  return pairs.join(',');
}

function importDeckCode(code) {
  try {
    const pairs = code.split(',').map(p => p.trim());
    const template = [];
    for (const pair of pairs) {
      const [id, countStr] = pair.split(':');
      const count = parseInt(countStr) || 1;
      if (id) {
        template.push({ id: id.trim(), count });
      }
    }
    return template;
  } catch (e) {
    console.warn('Failed to import deck code:', e);
    return null;
  }
}

// ============================================================
// SYNC WITH AVATAR-TCG-DATABASE
// ============================================================

async function syncWithDatabase(username) {
  // Placeholder for future implementation
  // Could fetch user's decks from a central database
  console.log('Syncing with Avatar-TCG-Database for user:', username);
  return true;
}

// Export functions for use in main game
window.DeckSync = {
  init: initDeckSync,
  saveSession: saveUserSession,
  clearSession: clearUserSession,
  isLoggedIn: isUserLoggedIn,
  getUsername: getCurrentUsername,
  addDeck,
  removeDeck,
  getDeck: getDeckById,
  getDecksByChar: getDecksByCharacter,
  getAllDecks,
  exportCode: exportDeckCode,
  importCode: importDeckCode,
  syncWithDB: syncWithDatabase,
};
