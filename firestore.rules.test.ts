/**
 * Firestore Security Rules — Dirty Dozen Adversarial Verification Suite
 * Run against local Firestore Emulator: `firebase emulators:exec --only firestore "npx vitest run firestore.rules.test.ts"`
 */
import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

export async function runDirtyDozenSuite() {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-packpoint-security',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  const admin = testEnv.authenticatedContext('admin_uid', {
    email: 'diyouth.com@gmail.com',
    email_verified: true,
  });
  const spoofedAdmin = testEnv.authenticatedContext('spoof_uid', {
    email: 'diyouth.com@gmail.com',
    email_verified: false,
  });
  const alice = testEnv.authenticatedContext('alice_uid', {
    email: 'alice@example.com',
    email_verified: true,
  });
  const mallory = testEnv.authenticatedContext('mallory_uid', {
    email: 'mallory@example.com',
    email_verified: true,
  });

  // 1. Unverified spoofed admin denied minting redeem codes & reading rooms
  await assertFails(
    setDoc(doc(spoofedAdmin.firestore(), 'redeemCodes', 'TK1Y-ABCD-2345'), {
      code: 'TK1Y-ABCD-2345',
      planType: 'annual',
      durationDays: 365,
      status: 'unused',
      note: 'spoof',
      createdBy: 'spoof_uid',
      redeemedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(getDoc(doc(spoofedAdmin.firestore(), 'rooms', 'PK8294')));

  // 2. Collection scraping on /rooms and /redeemCodes denied for regular users
  await assertFails(getDocs(collection(alice.firestore(), 'rooms')));
  await assertFails(
    getDocs(query(collection(alice.firestore(), 'redeemCodes'), limit(10)))
  );

  // 3. Self-admin escalation denied
  await assertFails(
    setDoc(doc(mallory.firestore(), 'admins', 'mallory_uid'), {
      uid: 'mallory_uid',
      createdAt: serverTimestamp(),
    })
  );

  // 4. Non-admin redeem code minting denied
  await assertFails(
    setDoc(doc(mallory.firestore(), 'redeemCodes', 'TK1Y-8K4M-9X2P'), {
      code: 'TK1Y-8K4M-9X2P',
      planType: 'annual',
      durationDays: 365,
      status: 'unused',
      note: 'hacked',
      createdBy: 'mallory_uid',
      redeemedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Valid admin code minting succeeds
  await assertSucceeds(
    setDoc(doc(admin.firestore(), 'redeemCodes', 'TK1Y-8K4M-9X2P'), {
      code: 'TK1Y-8K4M-9X2P',
      planType: 'annual',
      durationDays: 365,
      status: 'unused',
      note: 'WhatsApp 1-year gift',
      createdBy: 'admin_uid',
      redeemedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 6. Self-minted Pro entitlement without burning code denied
  await assertFails(
    setDoc(doc(mallory.firestore(), 'users', 'mallory_uid', 'entitlements', 'pro'), {
      uid: 'mallory_uid',
      planType: 'annual',
      redeemedCode: 'TK1Y-8K4M-9X2P',
      durationDays: 365,
      activatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Valid atomic redemption by Alice succeeds
  const aliceDb = alice.firestore();
  const redeemBatch = writeBatch(aliceDb);
  redeemBatch.update(doc(aliceDb, 'redeemCodes', 'TK1Y-8K4M-9X2P'), {
    status: 'redeemed',
    redeemedBy: 'alice_uid',
    updatedAt: serverTimestamp(),
  });
  redeemBatch.set(doc(aliceDb, 'users', 'alice_uid', 'entitlements', 'pro'), {
    uid: 'alice_uid',
    planType: 'annual',
    redeemedCode: 'TK1Y-8K4M-9X2P',
    durationDays: 365,
    activatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(redeemBatch.commit());

  // 5. Double redemption by Mallory on already redeemed code denied
  const malloryDb = mallory.firestore();
  const replayBatch = writeBatch(malloryDb);
  replayBatch.update(doc(malloryDb, 'redeemCodes', 'TK1Y-8K4M-9X2P'), {
    status: 'redeemed',
    redeemedBy: 'mallory_uid',
    updatedAt: serverTimestamp(),
  });
  replayBatch.set(doc(malloryDb, 'users', 'mallory_uid', 'entitlements', 'pro'), {
    uid: 'mallory_uid',
    planType: 'annual',
    redeemedCode: 'TK1Y-8K4M-9X2P',
    durationDays: 365,
    activatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await assertFails(replayBatch.commit());

  // 12. Cross-user entitlement read denied
  await assertFails(
    getDoc(doc(mallory.firestore(), 'users', 'alice_uid', 'entitlements', 'pro'))
  );

  // 13. Orphan photobook order without /shipping/recipient denied
  await assertFails(
    setDoc(doc(aliceDb, 'photobookOrders', 'PB-261118-AB23'), {
      orderId: 'PB-261118-AB23',
      uid: 'alice_uid',
      bookTitle: '巴黎至阿姆斯特丹秋日纪行',
      tripTitlesSummary: '巴黎 -> 阿姆斯特丹',
      templateId: 'kinfolk',
      formatSpec: 'square_210',
      bindingSpec: 'hardcover_matte',
      pageCount: 24,
      photoCount: 12,
      copies: 1,
      currencyCode: 'CNY',
      totalPrice: 198,
      status: 'pending_payment',
      trackingNumber: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // Valid atomic photobook order + isolated shipping PII batch succeeds
  const orderBatch = writeBatch(aliceDb);
  orderBatch.set(doc(aliceDb, 'photobookOrders', 'PB-261118-AB23'), {
    orderId: 'PB-261118-AB23',
    uid: 'alice_uid',
    bookTitle: '巴黎至阿姆斯特丹秋日纪行',
    tripTitlesSummary: '巴黎 -> 阿姆斯特丹',
    templateId: 'kinfolk',
    formatSpec: 'square_210',
    bindingSpec: 'hardcover_matte',
    pageCount: 24,
    photoCount: 12,
    copies: 1,
    currencyCode: 'CNY',
    totalPrice: 198,
    status: 'pending_payment',
    trackingNumber: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  orderBatch.set(
    doc(aliceDb, 'photobookOrders', 'PB-261118-AB23', 'shipping', 'recipient'),
    {
      orderId: 'PB-261118-AB23',
      uid: 'alice_uid',
      recipientName: 'Alice Zhang',
      phone: '+86 13800138000',
      shippingAddress: '上海市静安区南京西路 1266 号',
      customerNote: '礼盒包装',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  await assertSucceeds(orderBatch.commit());

  // Customer self-marking order as paid_queued denied
  await assertFails(
    updateDoc(doc(aliceDb, 'photobookOrders', 'PB-261118-AB23'), {
      status: 'paid_queued',
      updatedAt: serverTimestamp(),
    })
  );

  // Cross-user shipping PII read & scraping denied
  await assertFails(
    getDoc(
      doc(
        mallory.firestore(),
        'photobookOrders',
        'PB-261118-AB23',
        'shipping',
        'recipient'
      )
    )
  );
  await assertFails(
    getDocs(
      collection(mallory.firestore(), 'photobookOrders', 'PB-261118-AB23', 'shipping')
    )
  );

  await testEnv.cleanup();
}

