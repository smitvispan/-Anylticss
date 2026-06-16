// app/api/ads/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncAdAccountInsightsForAccount, syncAdAccountInsightsForAllAccounts } from '@/lib/syncAdAccountInsights';

// export async function POST(request: NextRequest) {
//   try {
//     const { adAccountId, since, until } = await request.json();

//     let result;

//     if (adAccountId) {
//       await syncAdAccountInsightsForAccount(adAccountId, { since, until });
//       result = { success: true, message: `Synced ad account ${adAccountId}` };
//     } else {
//       const results = await syncAdAccountInsightsForAllAccounts({ since, until });
//       result = { success: true, results };
//     }

//     return NextResponse.json(result);
//   } catch (error) {
//     console.error('Error syncing ad insights:', error);
//     return NextResponse.json(
//       { error: 'Failed to sync ad insights' },
//       { status: 500 }
//     );
//   }
// }


export async function POST(request: NextRequest) {
  try {
    const { adAccountId, since, until } = await request.json();

    let result;
    if (adAccountId) {
      await syncAdAccountInsightsForAccount(adAccountId, { since, until });
      result = { success: true, message: `Synced ad account ${adAccountId}` };
    } else {
      const results = await syncAdAccountInsightsForAllAccounts({ since, until });
      result = { success: true, results };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ Error syncing ad insights:", error);

    return NextResponse.json(
      { error: error.message || "Failed to sync ad insights", stack: error.stack },
      { status: 500 }
    );
  }
}


// Optional: Add a GET endpoint to trigger sync without body
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get('adAccountId');
    const since = searchParams.get('since');
    const until = searchParams.get('until');

    let result;

    if (adAccountId) {
      await syncAdAccountInsightsForAccount(adAccountId, { since: since || undefined, until: until || undefined });
      result = { success: true, message: `Synced ad account ${adAccountId}` };
    } else {
      const results = await syncAdAccountInsightsForAllAccounts({
        since: since || undefined,
        until: until || undefined
      });
      result = { success: true, results };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing ad insights:', error);
    return NextResponse.json(
      { error: 'Failed to sync ad insights' },
      { status: 500 }
    );
  }
}