import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ENCRYPTION_KEY = Deno.env.get("CREDENTIAL_ENCRYPTION_KEY");

// AES-GCM encryption helpers using Web Crypto API
async function getKey() {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("credential-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encrypt(text) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(base64) {
  const key = await getKey();
  const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

// Simple OTP store (in-memory, expires in 5 min)
const otpStore = new Map();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  // === SAVE CREDENTIAL (encrypt before saving) ===
  if (action === 'save') {
    const { customer_id, customer_name, service_type, service_label, username, password, url, notes, credential_id } = body;

    const encryptedPassword = await encrypt(password);
    const encryptedUsername = await encrypt(username);

    const data = {
      customer_id,
      customer_name,
      service_type,
      service_label: service_label || '',
      username: encryptedUsername,
      password_encrypted: encryptedPassword,
      url: url || '',
      notes: notes || '',
    };

    if (credential_id) {
      await base44.entities.CustomerCredential.update(credential_id, data);
      return Response.json({ success: true, message: 'updated' });
    } else {
      const created = await base44.entities.CustomerCredential.create(data);
      return Response.json({ success: true, id: created.id });
    }
  }

  // === SEND OTP ===
  if (action === 'send_otp') {
    const { credential_id } = body;
    const otp = generateOTP();
    otpStore.set(`${user.email}_${credential_id}`, { otp, expires: Date.now() + 5 * 60 * 1000 });

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'OTP สำหรับดู Password - ACC Consulting',
      body: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>รหัส OTP ของคุณ</h2>
          <p style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 8px;">${otp}</p>
          <p>รหัสนี้จะหมดอายุใน 5 นาที</p>
          <p style="color: #6b7280; font-size: 12px;">หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยข้อความนี้</p>
        </div>
      `,
    });

    return Response.json({ success: true, message: 'OTP sent to ' + user.email });
  }

  // === VERIFY OTP & DECRYPT ===
  if (action === 'decrypt') {
    const { credential_id, otp } = body;
    const storeKey = `${user.email}_${credential_id}`;
    const stored = otpStore.get(storeKey);

    if (!stored) {
      return Response.json({ error: 'กรุณาขอ OTP ก่อน' }, { status: 400 });
    }
    if (Date.now() > stored.expires) {
      otpStore.delete(storeKey);
      return Response.json({ error: 'OTP หมดอายุแล้ว กรุณาขอใหม่' }, { status: 400 });
    }
    if (stored.otp !== otp) {
      return Response.json({ error: 'OTP ไม่ถูกต้อง' }, { status: 400 });
    }

    otpStore.delete(storeKey);

    // Fetch credential and decrypt
    const creds = await base44.entities.CustomerCredential.filter({ id: credential_id });
    const cred = creds?.[0];
    if (!cred) {
      return Response.json({ error: 'ไม่พบ credential' }, { status: 404 });
    }

    const decryptedUsername = await decrypt(cred.username);
    const decryptedPassword = await decrypt(cred.password_encrypted);

    return Response.json({ success: true, username: decryptedUsername, password: decryptedPassword });
  }

  // === DELETE ===
  if (action === 'delete') {
    const { credential_id } = body;
    await base44.entities.CustomerCredential.delete(credential_id);
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});