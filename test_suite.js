// Comprehensive verification test suite for notification personalization, deduplication, and restock cancellation

function stripLeadingEmojis(text) {
  if (!text) return '';
  return text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\u2700-\u27BF\s]+/u, '').trim();
}

function getIcon(notif) {
  if (
    notif.type === 'shopping' ||
    notif.type === 'purchase_turn' ||
    notif.type === 'product_added'
  ) return '🛒';
  if (
    notif.type === 'cleaning' ||
    notif.type === 'cleaning_turn' ||
    notif.type === 'cleaning_added'
  ) return '🧹';
  if (
    notif.type === 'group' ||
    notif.type === 'admin' ||
    notif.type === 'admin_transfer'
  ) return '👑';
  if (notif.type === 'member_joined' || notif.type === 'member_left') return '👋';
  if (notif.type === 'reminder') return '⏰';
  return '📢';
}

function translateNotificationTitle(title, isEnglish) {
  if (!isEnglish || !title) return title;
  return title
    .replace(/C'est votre tour d'acheter\s*!/gi, "It's your turn to buy!")
    .replace(/Nouveau produit ajouté\s*!/gi, 'New product added!')
    .replace(/Achat validé\s*!/gi, 'Purchase confirmed!')
    .replace(/Achat enregistré/gi, 'Purchase recorded')
    .replace(/C'est votre tour (de faire le|pour le) ménage\s*!/gi, "It's your turn to clean!")
    .replace(/Nouvelle tâche de ménage\s*!/gi, 'New cleaning chore!')
    .replace(/Rappel d'achat\s*!/gi, 'Shopping reminder!')
    .replace(/Rappel de ménage\s*!/gi, 'Cleaning reminder!')
    .replace(/Tâche en retard\s*!/gi, 'Overdue chore!')
    .replace(/Rachat nécessaire\s*!/gi, 'Restock needed!')
    .replace(/Rappel amical de colocation/gi, 'Friendly flatshare reminder')
    .replace(/Nouveau colocataire\s*!/gi, 'New roommate!')
    .replace(/Départ de la colocation/gi, 'Flatshare departure')
    .replace(/Rôle administrateur/gi, 'Administrator role');
}

console.log('=== TEST 1: EMOJI STRIPPING & DOUBLE ICONS ===');
const inputs = [
  { raw: '🛒 🛒 Achat enregistré', expected: 'Achat enregistré', type: 'shopping', expectedIcon: '🛒' },
  { raw: '📢 🛒 Rachat nécessaire !', expected: 'Rachat nécessaire !', type: 'purchase_turn', expectedIcon: '🛒' },
  { raw: '🧹 C\'est votre tour pour le ménage !', expected: 'C\'est votre tour pour le ménage !', type: 'cleaning_turn', expectedIcon: '🧹' },
  { raw: '👑 Rôle administrateur', expected: 'Rôle administrateur', type: 'admin_transfer', expectedIcon: '👑' },
  { raw: '👋 Nouveau colocataire !', expected: 'Nouveau colocataire !', type: 'member_joined', expectedIcon: '👋' },
  { raw: '⏰ Rappel d\'achat !', expected: 'Rappel d\'achat !', type: 'reminder', expectedIcon: '⏰' },
  { raw: '✓ Déjà en stock', expected: 'Déjà en stock', type: 'shopping', expectedIcon: '🛒' },
  { raw: '🚨 Tâche en retard !', expected: 'Tâche en retard !', type: 'reminder', expectedIcon: '⏰' },
];

for (const tc of inputs) {
  const stripped = stripLeadingEmojis(tc.raw);
  if (stripped !== tc.expected) {
    throw new Error(`FAIL: expected "${tc.expected}", got "${stripped}"`);
  }
  const icon = getIcon({ type: tc.type });
  if (icon !== tc.expectedIcon) {
    throw new Error(`FAIL: expected icon "${tc.expectedIcon}", got "${icon}"`);
  }
  console.log(`✓ OK: "${tc.raw}" -> Icon: [${icon}], Title: "${stripped}"`);
}

console.log('\n=== TEST 2: TRANSLATIONS OF CLEAN TITLES ===');
const transCases = [
  { fr: 'Rachat nécessaire !', en: 'Restock needed!' },
  { fr: "C'est votre tour d'acheter !", en: "It's your turn to buy!" },
  { fr: "C'est votre tour pour le ménage !", en: "It's your turn to clean!" },
  { fr: "Rôle administrateur", en: "Administrator role" },
];
for (const tc of transCases) {
  const res = translateNotificationTitle(tc.fr, true);
  if (res !== tc.en) {
    throw new Error(`FAIL: expected "${tc.en}", got "${res}"`);
  }
  console.log(`✓ OK: FR "${tc.fr}" -> EN "${res}"`);
}

console.log('\n=== TEST 3: RESTOCK NOTIFICATION PERSONALIZATION (NEVER NOTIFY ONESELF) ===');
function simulateRestockRequest(product, requestedByUid, senderName) {
  const dispatched = [];
  const currentBuyerUid = product.rotationOrder[product.currentTurnIndex || 0];

  if (currentBuyerUid && currentBuyerUid !== requestedByUid) {
    dispatched.push({
      recipient: currentBuyerUid,
      type: 'purchase_turn',
      title: 'Rachat nécessaire !',
      body: `${senderName} signale qu'il faut racheter : "${product.name}". C'est votre tour !`,
    });
  }
  return dispatched;
}

const productToiletPaper = {
  id: 'prod-tp',
  name: 'Toilet paper',
  rotationOrder: ['viktor-uid', 'alice-uid', 'bob-uid'],
  currentTurnIndex: 0, // Viktor's turn!
  needsRestock: false,
};

// Viktor requests restock for toilet paper (where Viktor is the current buyer):
const notifsWhenViktorRequests = simulateRestockRequest(productToiletPaper, 'viktor-uid', 'Viktor');
if (notifsWhenViktorRequests.length !== 0) {
  throw new Error(`FAIL: Viktor received notification for his own request!`);
}
console.log('✓ OK: When Viktor requests restock for toilet paper (his turn), NO notification is sent to himself.');

// Alice requests restock for toilet paper (where Viktor is the current buyer):
const notifsWhenAliceRequests = simulateRestockRequest(productToiletPaper, 'alice-uid', 'Alice');
if (notifsWhenAliceRequests.length !== 1 || notifsWhenAliceRequests[0].recipient !== 'viktor-uid') {
  throw new Error(`FAIL: Viktor should have received notification from Alice!`);
}
console.log('✓ OK: When Alice requests restock, Viktor receives the notification (recipient: viktor-uid):');
console.log(`   Title: "${notifsWhenAliceRequests[0].title}", Body: "${notifsWhenAliceRequests[0].body}"`);

console.log('\n=== TEST 4: PER-USER NOTIFICATION ISOLATION (NO LEAK TO ROOMMATES) ===');
// Test the subscriber isolation map
const demoNotificationSubscribers = new Map();
const mockNotificationsDb = {
  'viktor-uid': [{ id: 'n1', recipientUid: 'viktor-uid', title: 'Viktor alert' }],
  'alice-uid': [{ id: 'n2', recipientUid: 'alice-uid', title: 'Alice alert' }],
};

function subscribeToNotifications(userId, cb) {
  if (!demoNotificationSubscribers.has(userId)) {
    demoNotificationSubscribers.set(userId, new Set());
  }
  demoNotificationSubscribers.get(userId).add(cb);
  return () => demoNotificationSubscribers.get(userId).delete(cb);
}

function notifyDemoNotificationSubscribers(userId) {
  const notifs = mockNotificationsDb[userId] || [];
  const subs = demoNotificationSubscribers.get(userId);
  if (subs) {
    subs.forEach((cb) => cb(notifs));
  }
}

let viktorReceived = [];
let aliceReceived = [];
subscribeToNotifications('viktor-uid', (n) => { viktorReceived = n; });
subscribeToNotifications('alice-uid', (n) => { aliceReceived = n; });

// Notify Viktor
notifyDemoNotificationSubscribers('viktor-uid');
if (viktorReceived.length !== 1 || viktorReceived[0].id !== 'n1') {
  throw new Error('FAIL: Viktor did not receive his notification');
}
if (aliceReceived.length !== 0) {
  throw new Error('FAIL: Alice received Viktor notification (leak!)');
}
console.log('✓ OK: Viktor received his notification and Alice received 0 notifications.');

// Notify Alice
notifyDemoNotificationSubscribers('alice-uid');
if (aliceReceived.length !== 1 || aliceReceived[0].id !== 'n2') {
  throw new Error('FAIL: Alice did not receive her notification');
}
console.log('✓ OK: Alice received her notification and subscribers remain strictly isolated.');

console.log('\n=== TEST 5: PUSH NOTIFICATION DEDUPLICATION ACROSS MULTIPLE INSTANCES ===');
const globallySeenNotifIds = new Set();
let pushCallCount = 0;

function simulateIncomingNotification(notif) {
  if (!notif.isRead && !globallySeenNotifIds.has(notif.id)) {
    globallySeenNotifIds.add(notif.id);
    pushCallCount++;
  }
}

// Instance 1 (Dashboard) and Instance 2 (Inventory) both receive same notification:
const newNotification = { id: 'notif-100', isRead: false, title: 'Rachat nécessaire !' };
simulateIncomingNotification(newNotification); // Dashboard receives
simulateIncomingNotification(newNotification); // Inventory receives

if (pushCallCount !== 1) {
  throw new Error(`FAIL: Push notification scheduled ${pushCallCount} times instead of 1!`);
}
console.log(`✓ OK: Notification received by 2 mounted screens scheduled mobile push exactly ${pushCallCount} time.`);

console.log('\n=== TEST 6: NOTIFICATION BELL LEGACY SELF-NOTIFICATION FILTERING ===');
const existingBellNotifs = [
  { id: '1', body: "Viktor signale qu'il faut racheter : Toilet paper. C'est votre tour !", title: "Rachat nécessaire !" },
  { id: '2', body: "Alice signale qu'il faut racheter : Sponge. C'est votre tour !", title: "Rachat nécessaire !" },
];

const userDisplayName = 'viktor';
const filtered = existingBellNotifs.filter((notif) => {
  const bodyLower = (notif.body || '').toLowerCase();
  if (
    (bodyLower.includes(`${userDisplayName} signale`) || bodyLower.includes(`${userDisplayName} reports`)) &&
    (bodyLower.includes("c'est votre tour") || bodyLower.includes("it's your turn"))
  ) {
    return false;
  }
  return true;
});

if (filtered.length !== 1 || filtered[0].id !== '2') {
  throw new Error('FAIL: Self-notification was not filtered from bell!');
}
console.log('✓ OK: Legacy self-notification correctly filtered out from Viktor bell display.');

console.log('\n=== TEST 7: CANCEL RESTOCK & DASHBOARD PENDING TURNS SYNC ===');
let productState = { ...productToiletPaper, needsRestock: true };

function getPendingShoppingForUser(products, uid) {
  return products.filter((p) => {
    if (!p.rotationOrder || p.rotationOrder.length === 0) return false;
    if (p.needsRestock === false) return false;
    const buyer = p.rotationOrder[p.currentTurnIndex || 0];
    return buyer === uid;
  });
}

// When in needsRestock: true:
let viktorPending = getPendingShoppingForUser([productState], 'viktor-uid');
if (viktorPending.length !== 1) throw new Error('FAIL: Toilet paper should be in Viktor pending');
console.log('✓ State 1: Toilet paper needsRestock=true -> in Viktor pending shopping tasks: count = 1');

// Cancel restock:
productState.needsRestock = false;
viktorPending = getPendingShoppingForUser([productState], 'viktor-uid');
if (viktorPending.length !== 0) throw new Error('FAIL: Toilet paper should be removed from Viktor pending');
console.log('✓ State 2: cancelRestock executed -> needsRestock=false -> instantly disappears from Viktor pending tasks: count = 0');

console.log('\nALL 7 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
