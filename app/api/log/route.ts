import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Získání IP adresy (Vercel ji posílá v hlavičce)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const timestamp = new Date().toISOString();

    // Sestavení logovací zprávy
    const logEntry = {
      timestamp,
      ip,
      action: data.action,
      fileName: data.fileName || 'N/A',
      details: data.details || {},
      elementsCount: data.elementsCount || 0
    };

    // Vypíše se do konzole serveru (ve Vercel Dashboard -> Logs)
    console.log('--- SYSTEM LOG ---');
    console.log(JSON.stringify(logEntry, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}