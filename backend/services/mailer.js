import nodemailer from 'nodemailer'

let transporter
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  })
  return transporter
}

export async function sendEmail(to, subject, text) {
  const client = getTransporter()
  if (!client || !to) return false
  try {
    await client.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text })
    return true
  } catch (error) {
    console.error('Email notification failed:', error.message)
    return false
  }
}

export async function sendSms(to, text) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !to) return false
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const body = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: text.slice(0, 1500) })
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: controller.signal
    })
    if (!response.ok) throw new Error(`SMS provider returned HTTP ${response.status}.`)
    return true
  } catch (error) { console.error('SMS notification failed:', error.message); return false }
  finally { clearTimeout(timeout) }
}

export function isSmsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
}
