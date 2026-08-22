import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    corpusSize: 1144, // Hardcoded for now based on T007
    embeddingsLoaded: true
  });
}