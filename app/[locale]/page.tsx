import { Link } from '@/i18n/routing';
import LoginForm from "@/components/partials/auth/login-form";
import Image from "next/image";
import Social from "@/components/partials/auth/social";
import Copyright from "@/components/partials/auth/copyright";
import Logo from "@/components/partials/auth/logo";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// ✅ params is a Promise in Next.js 15+, so make the component async and await it
export default async function Login({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const created = sp?.created === "1";
  const session = await auth();

  // If a user is already logged in and lands on the domain, send them to the admin dashboard
  if (session?.user?.id) {
    redirect(`/${locale}/admin`);
  }

  return (
    <>
      <div className="flex w-full items-center overflow-hidden min-h-dvh h-dvh basis-full">
        <div className="overflow-y-auto flex flex-wrap w-full h-dvh">
          <div
            className="lg:block hidden flex-1 overflow-hidden text-[40px] leading-[48px] text-default-600 
 relative z-1 bg-default-50"
          >
            <div className="max-w-[520px] pt-20 ps-20 ">
              <Link href="/" className="mb-6 inline-block">
                <Logo />
              </Link>
              <h4>
                Unlock your Analytics
                <span className="text-default-800 font-bold ms-2">
                  Performance
                </span>
              </h4>
            </div>
            <div className="absolute left-0 2xl:bottom-[-160px] bottom-[-130px] h-full w-full z-[-1]">
              <Image
                src="/images/auth/ils1.svg"
                alt=""
                priority
                width={300}
                height={300}
                className="mb-10 w-full h-full"
              />
            </div>
          </div>
          <div className="flex-1 relative">
            <div className=" h-full flex flex-col  dark:bg-default-100 bg-white">
              <div className="max-w-[524px] md:px-[42px] md:py-[44px] p-7  mx-auto w-full text-2xl text-default-900  mb-3 h-full flex flex-col justify-center">
                <div className="flex justify-center items-center text-center mb-6 lg:hidden ">
                  <Link href="/">
                    <Logo />
                  </Link>
                </div>
                <div className="text-center 2xl:mb-10 mb-4">
                  <h4 className="font-medium">Sign in</h4>
                  <div className="text-default-500 text-base">
                    Sign in to your account to start using Analytics Vispan Solutions dashboard.
                  </div>
                </div>
                {/* <div className="mx-auto mt-8 w-full">
                  <Social locale={locale} />
                </div> */}
                {/* <div className="relative border-b-[#9AA2AF] border-opacity-[16%] border-b pt-6">
                  <div className="absolute inline-block bg-default-50 dark:bg-default-100 left-1/2 top-1/2 transform -translate-x-1/2 px-4 min-w-max text-sm text-default-500 font-normal">
                    Or continue with Email
                  </div>
                </div> */}
                <LoginForm />
              </div>
              <div className="text-xs font-normal text-default-500  z-999 pb-10 text-center">
                <Copyright />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
