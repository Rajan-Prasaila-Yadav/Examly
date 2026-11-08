// scripts/check-resend-account.js
require('dotenv').config();
const { Resend } = require('resend');

async function check() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log('Testing Resend configuration...');

  // 1. Check domains
  try {
    const domains = await resend.domains.list();
    console.log('Domains list result:', JSON.stringify(domains, null, 2));
  } catch (err) {
    console.log('Domain list error:', err.message);
  }

  // 2. Check sending to a sample email
  try {
    const send = await resend.emails.send({
      from: process.env.MAIL_FROM_ADDRESS || 'Examly <onboarding@resend.dev>',
      to: 'rajanprasailayadav@gmail.com',
      subject: 'Examly Password Reset Test',
      html: '<p>Testing reset</p>',
    });
    console.log('Send to real email result:', JSON.stringify(send, null, 2));
  } catch (err) {
    console.log('Send error:', err.message);
  }
}

check();
