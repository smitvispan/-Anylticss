import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import SeoReport from "@/models/SeoReport";
import { ensureSearchConsoleAccessToken } from "./googleAuth";

type QueryDims = Array<"date" | "query" | "page" | "country" | "device">;

function normalizeDimensions(inputDims?: string[], pageFilter?: string | null): QueryDims {
  const base = new Set<string>(Array.isArray(inputDims) && inputDims.length ? inputDims : ["query"]);
  base.add("date");
  base.add("query");
  if (pageFilter) base.add("page");
  base.add("page");
  const ordered = ["date", "query", "page", "country", "device"].filter((d) => base.has(d)) as QueryDims;
  return ordered;
}

function buildRequestBody(opts: {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  pageContains?: string | null;
  rowLimit?: number;
}) {
  const { startDate, endDate, dimensions, pageContains, rowLimit = 1000 } = opts;
  const dims = normalizeDimensions(dimensions, pageContains);
  const body: any = { startDate, endDate, dimensions: dims, rowLimit };
  if (pageContains) {
    body.dimensionFilterGroups = [
      {
        filters: [
          {
            dimension: "page",
            operator: "contains",
            expression: pageContains,
          },
        ],
      },
    ];
  }
  return { body, dims };
}

function parseRowKeys(row: any, dims: string[]) {
  const out: any = {};
  if (Array.isArray(row?.keys)) {
    row.keys.forEach((val: string, i: number) => {
      const dim = dims[i];
      if (dim) out[dim] = val;
    });
  }
  return out;
}

async function fetchSearchConsoleRows(params: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  pageContains?: string | null;
  rowLimit?: number;
}) {
  const { accessToken, siteUrl, startDate, endDate, dimensions, pageContains, rowLimit } = params;
  const apiVersion = process.env.GOOGLE_SC_API_VERSION || "v3";
  const url = `https://searchconsole.googleapis.com/webmasters/${apiVersion}/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const { body, dims } = buildRequestBody({ startDate, endDate, dimensions, pageContains, rowLimit });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Search Console API error (${res.status}): ${text}`);
    (err as any).status = res.status;
    (err as any).body = text;
    throw err;
  }

  const json = text ? JSON.parse(text) : {};
  const rows = Array.isArray(json?.rows) ? json.rows : [];
  return { rows, dims };
}

export async function syncSearchConsole({
  userId,
  gscAccountId,
  siteUrl,
  startDate,
  endDate,
  pageContains,
  rowLimit,
  dimensions,
}: {
  userId: string;
  gscAccountId: string;
  siteUrl?: string | null;
  startDate: string;
  endDate: string;
  pageContains?: string | null;
  rowLimit?: number;
  dimensions?: string[];
}) {
  await connectDB();

  const user = await User.findById(userId).select({ _id: 1, email: 1 }).lean();
  if (!user) throw new Error("User not found");

  const account = await GoogleSearchConsoleAccount.findById(gscAccountId).lean();
  if (!account) throw new Error("Search Console account not found");

  const propertyUrl = siteUrl || account.siteUrl;
  if (!propertyUrl) throw new Error("Missing Search Console property URL");

  let accessToken = await ensureSearchConsoleAccessToken(account);

  let rows;
  let dims: string[] = [];
  try {
    const res = await fetchSearchConsoleRows({
      accessToken,
      siteUrl: propertyUrl,
      startDate,
      endDate,
      dimensions,
      pageContains,
      rowLimit,
    });
    rows = res.rows;
    dims = res.dims;
  } catch (err: any) {
    const isAuth = err?.status === 401 || String(err?.body || "").includes("invalid_grant");
    if (!isAuth) throw err;
    accessToken = await ensureSearchConsoleAccessToken(account, { forceRefresh: true });
    const res = await fetchSearchConsoleRows({
      accessToken,
      siteUrl: propertyUrl,
      startDate,
      endDate,
      dimensions,
      pageContains,
      rowLimit,
    });
    rows = res.rows;
    dims = res.dims;
  }

  const stored: any[] = [];

  for (const r of rows) {
    const keys = parseRowKeys(r, dims);
    const query = (keys.query ?? "").toString();
    const page = (keys.page ?? "").toString();
    const dateKey = keys.date ?? endDate;
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    const country = (keys.country ?? "all").toString();
    const device = (keys.device ?? "all").toString();

    const clicks = Number(r.clicks ?? 0);
    const impressions = Number(r.impressions ?? 0);
    const ctr = Number(r.ctr ?? 0);
    const position = Number(r.position ?? 0);

    const doc = await SeoReport.findOneAndUpdate(
      {
        userId,
        siteUrl: propertyUrl,
        query,
        page,
        date,
        country,
        device,
      },
      {
        $set: { clicks, impressions, ctr, position },
      },
      { upsert: true, new: true }
    ).lean();

    stored.push(doc);
  }

  return {
    totalRows: rows.length,
    storedCount: stored.length,
    stored,
    siteUrl: propertyUrl,
  };
}

export async function querySearchConsoleReports({
  userId,
  siteUrl,
  start,
  end,
  pageContains,
  limit = 100,
  page = 0,
}: {
  userId: string;
  siteUrl: string;
  start?: string | null;
  end?: string | null;
  pageContains?: string | null;
  limit?: number;
  page?: number;
}) {
  await connectDB();

  const filter: any = { userId, siteUrl };
  if (start || end) {
    filter.date = {};
    if (start) filter.date.$gte = new Date(`${start}T00:00:00.000Z`);
    if (end) filter.date.$lte = new Date(`${end}T23:59:59.999Z`);
  }
  if (pageContains) {
    filter.page = { $regex: pageContains, $options: "i" };
  }

  return SeoReport.find(filter)
    .sort({ date: -1, impressions: -1 })
    .skip(page * limit)
    .limit(limit)
    .lean();
}

export async function resolveGscAccountForUser(userId: string) {
  await connectDB();

  const user = await User.findById(userId)
    .select({ _id: 1, email: 1, mainSEOsites: 1, googleSearchConsoleAccounts: 1 })
    .lean();
  if (!user) return { user: null, account: null };

  const candidates = [
    user.mainSEOsites,
    ...(Array.isArray(user.googleSearchConsoleAccounts) ? user.googleSearchConsoleAccounts : []),
  ].filter(Boolean);

  let account = candidates.length
    ? await GoogleSearchConsoleAccount.findOne({ _id: { $in: candidates } }).lean()
    : null;

  if (!account && user.email) {
    account = await GoogleSearchConsoleAccount.findOne({ userEmail: user.email }).sort({ updatedAt: -1 }).lean();
  }

  return { user, account };
}

export function serializeSeoReport(doc: any) {
  return {
    id: doc?._id ? String(doc._id) : undefined,
    userId: doc?.userId ? String(doc.userId) : undefined,
    siteUrl: doc?.siteUrl,
    query: doc?.query,
    page: doc?.page,
    country: doc?.country,
    device: doc?.device,
    clicks: Number(doc?.clicks ?? 0),
    impressions: Number(doc?.impressions ?? 0),
    ctr: Number(doc?.ctr ?? 0),
    position: Number(doc?.position ?? 0),
    date:
      doc?.date instanceof Date
        ? doc.date.toISOString()
        : doc?.date
        ? new Date(doc.date).toISOString()
        : undefined,
    createdAt:
      doc?.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc?.createdAt
        ? new Date(doc.createdAt).toISOString()
        : undefined,
    updatedAt:
      doc?.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc?.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : undefined,
  };
}
