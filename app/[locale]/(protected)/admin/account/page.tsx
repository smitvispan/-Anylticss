import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Page from "@/models/Page";
import InstagramAccount from "@/models/InstagramAccount";
import AdAccount from "@/models/AdAccount";



import { Link } from '@/i18n/routing';
import LoginForm from "@/components/partials/auth/login-form";
import Image from "next/image";
import Social from "@/components/partials/auth/social";
import Copyright from "@/components/partials/auth/copyright";
import Logo from "@/components/partials/auth/logo";

type Params = Promise<{ locale: string }>;

function shortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export default async function AdminUsersPage({ params }: { params: Params }) {
  const { locale } = await params;

  await connectDB();

  // 1️⃣ Fetch users
  const users = await User.find({ isAdmin: false })
    .sort({ createdAt: -1 })
    .lean();

  // 2️⃣ Collect IDs for mapping
  const pageIds = users.map((u) => u.mainPage).filter(Boolean);
  const instaIds = users.map((u) => u.mainInstagram).filter(Boolean);
  const adIds = users.map((u) => u.mainAd).filter(Boolean);

  // 3️⃣ Fetch related collections
  const [pages, instas, ads] = await Promise.all([
    pageIds.length ? Page.find({ _id: { $in: pageIds } }).lean() : [],
    instaIds.length ? InstagramAccount.find({ _id: { $in: instaIds } }).lean() : [],
    adIds.length ? AdAccount.find({ _id: { $in: adIds } }).lean() : [],
  ]);

  // 4️⃣ Build lookup maps
  const pageMap = new Map(pages.map((p) => [String(p._id), p.name || "(no name)"]));
  const instaMap = new Map(instas.map((i) => [String(i._id), i.username || "(no username)"]));
  const adMap = new Map(ads.map((a) => [String(a._id), a.name || "(no name)"]));

  return (
    <>
          <div className="flex w-full items-center overflow-hidden min-h-dvh h-dvh basis-full">
            <div className="overflow-y-auto flex flex-wrap w-full h-dvh">
              <div className="flex-1 relative">
                <div className=" h-full flex flex-col  dark:bg-default-100 bg-white">
                  <div className="max-w-[524px] md:px-[42px] md:py-[44px] p-7  mx-auto w-full text-2xl text-default-900  mb-3 h-full flex flex-col justify-center">
                    <div className="flex justify-center items-center text-center mb-6 lg:hidden ">
                      <Link href="/">
                        <Logo />
                      </Link>
                    </div>
                    <div className="text-center 2xl:mb-10 mb-4">
                      <h4 className="font-medium">Add Your account</h4>
                      <div className="text-default-500 text-base">
                        Add Yout Google OR Facebook account to get started
                      </div>
                    </div>
                    <div className="mx-auto mt-8 w-full">
                      <Social locale={locale} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
  );
}