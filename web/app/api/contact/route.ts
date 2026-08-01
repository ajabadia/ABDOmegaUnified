/**
 * @purpose Gestiona contactos entrantes, valida datos y envía notificaciones emergentes a administradores.
 * @purpose_en Handles incoming contact transmissions, validates data, dispatches alerts to administrators, and sends confirmations to operators using the API Resend.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:1qdva5t
 * @lastUpdated 2026-06-15T17:04:03.549Z
 */

import { NextResponse } from 'next/server';

/**
 * CONTACT TRANSMISSION HANDLER (v1.0)
 * -----------------------------------
 * This route processes incoming contact transmissions, dispatches an alert to the administrator,
 * and sends an aseptic confirmation to the operator.
 */

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, email, subject, message, bot_field, challenge, challenge_expected } = data;

    // 1. HONEYPOT CHECK (Anti-Bot)
    if (bot_field) {
      return NextResponse.json({ status: 'Transmission Complete (Ghosted)' }, { status: 200 });
    }

    // 2. DATA INTEGRITY CHECK
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Incomplete data payload' }, { status: 400 });
    }

    // 3. EMAIL VALIDATION (Strict Pattern)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid return address format' }, { status: 400 });
    }

    // 4. HUMAN VERIFICATION CHECK
    if (Number(challenge) !== Number(challenge_expected)) {
      return NextResponse.json({ error: 'Human verification failed' }, { status: 400 });
    }

    // 5. DISPATCH TRANSMISSIONS (Real Dispatch via Resend)
    // Clean potential quotes from .env
    const RAW_KEY = process.env.RESEND_API_KEY;
    const RESEND_API_KEY = RAW_KEY?.replace(/['"]+/g, '');

    if (!RESEND_API_KEY) {
      console.warn('CRITICAL: RESEND_API_KEY is missing.');
      return NextResponse.json({ status: 'Transmission Complete (Simulated)' }, { status: 200 });
    }

    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.replace(/['"]+/g, '') || 'ABD Virtual Instruments <onboarding@resend.dev>';

    try {
      const adminRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: 'ajabadia@gmail.com',
          reply_to: email,
          subject: `[CONTACT] ${subject}`,
          text: `Operator: ${name}\nEmail: ${email}\n\nPayload:\n${message}`
        })
      });

      if (!adminRes.ok) {
        const errorData = await adminRes.json();
        console.error('RESEND ADMIN ERROR:', errorData);
        return NextResponse.json({ error: 'Failed to dispatch to administrator', details: errorData }, { status: 502 });
      }

      // Confirmation to user (Only if domain is verified or sending to self)
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: `[CONFIRMATION] ${subject}`,
          text: `Transmission ID: ${Math.random().toString(36).substring(7).toUpperCase()}\nStatus: Received\n\nYour inquiry has been received.`
        })
      });

      return NextResponse.json({ status: 'Transmission Complete' }, { status: 200 });
    } catch (err) {
      console.error('FETCH ERROR:', err);
      return NextResponse.json({ error: 'Network failure during transmission' }, { status: 500 });
    }
  } catch (error) {
    console.error('TRANSMISSION ERROR:', error);
    return NextResponse.json({ error: 'Internal System Failure' }, { status: 500 });
  }
}
