import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Read encryption key from AppConfig entity
async function getEncryptionKey(base44) {
  const configs = await base44.asServiceRole.entities.AppConfig.filter({});
  const key = configs.find(c => c.key === 'credential_encryption_key')?.value || '';
  if (!key || key.length < 16) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY ยังไม่ได้ตั้งค่า — กรุณาไปที่ AppSettings → เชื่อมต่อ → Credential Vault');
  }
  return key;
}

// AES-GCM encryption helpers using Web Crypto API
async function getKey(encryptionKey) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
    { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("credential-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encrypt(text, encryptionKey) {
  const key = await getKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(base64, encryptionKey) {
  const key = await getKey(encryptionKey);
  const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// --- OTP persistence via AppConfig entity (survives across serverless invocations) ---
async function saveOtp(base44, storeKey, otp) {
  const configKey = `otp_${storeKey}`;
  const value = JSON.stringify({ otp, expires: Date.now() + 5 * 60 * 1000 });
  const existing = await base44.asServiceRole.entities.AppConfig.filter({ key: configKey });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.AppConfig.update(existing[0].id, { value });
  } else {
    await base44.asServiceRole.entities.AppConfig.create({ key: configKey, value, description: 'OTP temp' });
  }
}

async function getOtp(base44, storeKey) {
  const configKey = `otp_${storeKey}`;
  const existing = await base44.asServiceRole.entities.AppConfig.filter({ key: configKey });
  if (existing.length === 0) return null;
  const record = existing[0];
  const parsed = JSON.parse(record.value);
  return { ...parsed, recordId: record.id };
}

async function deleteOtp(base44, recordId) {
  await base44.asServiceRole.entities.AppConfig.delete(recordId);
}

async function logPdpaAccess(base44, { action, entity_type, entity_id, entity_label, user_email, user_name, details }) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      action: action,
      entity_type: 'pdpa_access',
      entity_name: entity_type,
      entity_id: entity_id || '',
      user_email: user_email,
      user_name: user_name || user_email,
      details: details || '',
      category: 'pdpa',
    });
  } catch (e) {
    console.warn('Failed to log PDPA access:', e.message);
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get encryption key from AppConfig — return graceful error if not set
  let encryptionKey;
  try {
    encryptionKey = await getEncryptionKey(base44);
  } catch (e) {
    return Response.json({
      error: e.message,
      setup_required: true,
      success: false,
    }, { status: 503 });
  }

  const body = await req.json();
  const { action } = body;

  // === SAVE CREDENTIAL (encrypt before saving) ===
  if (action === 'save') {
    const { customer_id, customer_name, service_id, service_code, service_name, username, password, url, notes, credential_id } = body;

    const encryptedPassword = await encrypt(password, encryptionKey);
    const encryptedUsername = await encrypt(username, encryptionKey);

    const data = {
      customer_id,
      customer_name,
      service_id: service_id || '',
      service_code: service_code || '',
      service_name: service_name || '',
      username: encryptedUsername,
      password_encrypted: encryptedPassword,
      url: url || '',
      notes: notes || '',
      last_modified_by: user.email,
      last_modified_by_name: user.full_name || user.email,
    };

    if (credential_id) {
      // Detect which fields changed
      const existing = await base44.entities.CustomerCredential.filter({ id: credential_id });
      const old = existing?.[0];
      const fieldsChanged = [];

      if (old) {
        const oldUsername = await decrypt(old.username, encryptionKey);
        const oldPassword = await decrypt(old.password_encrypted, encryptionKey);
        if (oldUsername !== username) fieldsChanged.push('username');
        if (oldPassword !== password) fieldsChanged.push('password');
        if ((old.url || '') !== (url || '')) fieldsChanged.push('url');
        if ((old.notes || '') !== (notes || '')) fieldsChanged.push('notes');
        if ((old.service_id || '') !== (service_id || '')) fieldsChanged.push('service');
        if ((old.customer_id || '') !== (customer_id || '')) fieldsChanged.push('customer');
      }

      const history = old?.change_history || [];
      if (fieldsChanged.length > 0) {
        history.push({
          changed_at: new Date().toISOString(),
          changed_by: user.email,
          changed_by_name: user.full_name || user.email,
          fields_changed: fieldsChanged,
        });
      }
      data.change_history = history;

      await base44.entities.CustomerCredential.update(credential_id, data);
      await logPdpaAccess(base44, {
        action: 'update',
        entity_type: 'CustomerCredential',
        entity_id: credential_id,
        entity_label: customer_name,
        user_email: user.email,
        user_name: user.full_name || user.email,
        details: `แก้ไข credential ของ ${customer_name} (เปลี่ยน: ${fieldsChanged.join(', ')})`,
      });
      return Response.json({ success: true, message: 'updated', fields_changed: fieldsChanged });
    } else {
      data.change_history = [{
        changed_at: new Date().toISOString(),
        changed_by: user.email,
        changed_by_name: user.full_name || user.email,
        fields_changed: ['created'],
      }];
      const created = await base44.entities.CustomerCredential.create(data);
      await logPdpaAccess(base44, {
        action: 'create',
        entity_type: 'CustomerCredential',
        entity_id: created.id,
        entity_label: customer_name,
        user_email: user.email,
        user_name: user.full_name || user.email,
        details: `สร้าง credential ใหม่ของ ${customer_name}`,
      });
      return Response.json({ success: true, id: created.id });
    }
  }

  // === SEND OTP ===
  if (action === 'send_otp') {
    const { credential_id } = body;
    const otp = generateOTP();
    const storeKey = `${user.email}_${credential_id}`;
    await saveOtp(base44, storeKey, otp);

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: 'OTP สำหรับดู/แก้ไข Credential - ACC Consulting',
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
    const stored = await getOtp(base44, storeKey);

    if (!stored) {
      return Response.json({ error: 'กรุณาขอ OTP ก่อน' }, { status: 400 });
    }
    if (Date.now() > stored.expires) {
      await deleteOtp(base44, stored.recordId);
      return Response.json({ error: 'OTP หมดอายุแล้ว กรุณาขอใหม่' }, { status: 400 });
    }
    if (stored.otp !== otp) {
      return Response.json({ error: 'OTP ไม่ถูกต้อง' }, { status: 400 });
    }

    await deleteOtp(base44, stored.recordId);

    // Fetch credential and decrypt
    const creds = await base44.entities.CustomerCredential.filter({ id: credential_id });
    const cred = creds?.[0];
    if (!cred) {
      return Response.json({ error: 'ไม่พบ credential' }, { status: 404 });
    }

    const decryptedUsername = await decrypt(cred.username, encryptionKey);
    const decryptedPassword = await decrypt(cred.password_encrypted, encryptionKey);

    await logPdpaAccess(base44, {
      action: 'view',
      entity_type: 'CustomerCredential',
      entity_id: credential_id,
      entity_label: cred.customer_name + ' - ' + (cred.service_name || ''),
      user_email: user.email,
      user_name: user.full_name || user.email,
      details: `ดู credential ของ ${cred.customer_name} (${cred.service_name || 'N/A'})`,
    });

    return Response.json({ success: true, username: decryptedUsername, password: decryptedPassword });
  }

  // === DELETE ===
  if (action === 'delete') {
    const { credential_id } = body;
    await base44.entities.CustomerCredential.delete(credential_id);
    await logPdpaAccess(base44, {
      action: 'delete',
      entity_type: 'CustomerCredential',
      entity_id: credential_id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      details: `ลบ credential ID: ${credential_id}`,
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});