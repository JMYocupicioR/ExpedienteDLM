// Netlify Edge Function para verificar hCaptcha
// Esta es una copia de la función de Supabase para Netlify

interface VerifyRequestBody {
  token?: string;
  sitekey?: string;
}

interface HCaptchaResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  credit?: boolean;
  score?: number;
  score_reason?: string[];
}

const VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { token, sitekey }: VerifyRequestBody = await request.json().catch(() => ({}));
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Missing token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Secret debe estar configurado en las variables de entorno de Netlify
    const secret = Deno.env.get('HCAPTCHA_SECRET');
    if (!secret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server captcha secret not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener IP del cliente
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    if (clientIp) form.set('remoteip', clientIp);
    if (sitekey) form.set('sitekey', sitekey);

    const verifyRes = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const verifyJson = (await verifyRes.json()) as HCaptchaResponse;

    return new Response(JSON.stringify(verifyJson), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  path: "/api/verify-hcaptcha"
};