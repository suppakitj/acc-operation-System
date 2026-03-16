import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { SmtpClient } from 'npm:denomailer@1.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'management') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get SMTP config from AppConfig
    const configs = await base44.asServiceRole.entities.AppConfig.filter({});
    const getVal = (key) => configs.find(c => c.key === key)?.value || '';

    const senderName = getVal('smtp_sender_name') || 'ACC Consulting';
    const gmailAddress = getVal('smtp_gmail_address');
    const appPassword = getVal('smtp_app_password');

    if (!gmailAddress || !appPassword) {
      return Response.json({
        error: 'กรุณาบันทึก Gmail Address และ App Password ก่อนทดสอบการเชื่อมต่อ'
      }, { status: 400 });
    }

    // Connect to Gmail SMTP
    const client = new SmtpClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: gmailAddress,
          password: appPassword,
        },
      },
    });

    await client.send({
      from: `${senderName} <${gmailAddress}>`,
      to: user.email,
      subject: '✅ ทดสอบการเชื่อมต่อ Email — ACC Consulting',
      content: 'auto',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a9e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ACC Consulting</h1>
            <p style="color: #c2d6f0; margin: 8px 0 0;">ระบบจัดการงาน</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #22c55e; margin-top: 0;">✅ เชื่อมต่อสำเร็จ!</h2>
            <p style="color: #475569; line-height: 1.6;">
              อีเมลนี้เป็นการทดสอบจากระบบ ACC Consulting เพื่อยืนยันว่าการตั้งค่า Gmail SMTP ถูกต้องและพร้อมใช้งาน
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>📧 ส่งจาก:</strong> ${senderName} &lt;${gmailAddress}&gt;<br>
                <strong>📬 ส่งถึง:</strong> ${user.email}<br>
                <strong>🕐 เวลา:</strong> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
              </p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
              อีเมลนี้ส่งโดยอัตโนมัติจากระบบ ACC Consulting — กรุณาอย่าตอบกลับ
            </p>
          </div>
        </div>
      `,
    });

    await client.close();

    console.log(`Test email sent successfully to ${user.email}`);
    return Response.json({ status: 'success', message: 'ส่งอีเมลทดสอบสำเร็จ' });

  } catch (error) {
    console.error('Email test error:', error.message);

    let userMessage = 'ไม่สามารถเชื่อมต่อได้ รบกวนตรวจสอบอีเมลหรือ App Password อีกครั้งนะครับ';
    if (error.message?.includes('auth') || error.message?.includes('credentials')) {
      userMessage = 'อีเมลหรือ App Password ไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้งนะครับ';
    } else if (error.message?.includes('network') || error.message?.includes('connect')) {
      userMessage = 'ไม่สามารถเชื่อมต่อ Gmail SMTP ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    }

    return Response.json({ error: userMessage }, { status: 500 });
  }
});