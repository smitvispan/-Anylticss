// app/api/ads/insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdInsightsRows } from '@/lib/syncAdAccountInsights';

export async function POST(request: NextRequest) {
  try {
    const { fields, id } = await request.json();
    
    if (!fields || !id) {
      return NextResponse.json(
        { error: 'Missing required fields or id' },
        { status: 400 }
      );
    }

    const rows = await getAdInsightsRows(fields, id);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching ad insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad insights' },
      { status: 500 }
    );
  }
}