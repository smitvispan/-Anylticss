import { Link } from "@/i18n/routing";
import Image from "next/image";
import Copyright from "@/components/partials/auth/copyright";
import Logo from "@/components/partials/auth/logo";
import LoginForm from "@/components/partials/auth/login-form";
import type { ReactNode } from "react";

type AuthScreenProps = {
  locale: string;
  callbackUrl?: string | null;
  heading?: string;
  description?: string;
  loginMode?: "admin" | "client" | "user";
  brandName?: string;
  showBranding?: boolean;
  showHeroPanel?: boolean;
  helperContent?: ReactNode;
  defaultEmail?: string;
  defaultPassword?: string;
  autoSubmit?: boolean;
};

export default function AuthScreen({
  locale,
  callbackUrl,
  heading = "Sign in",
  description = "Sign in to your account to start using Analytics Vispan Solutions dashboard.",
  loginMode = "user",
  brandName = "Vispan Solutions",
  showBranding = true,
  showHeroPanel = true,
  helperContent,
  defaultEmail = "",
  defaultPassword = "",
  autoSubmit = false,
}: AuthScreenProps) {
  return (
    <div className="flex w-full items-center overflow-hidden min-h-dvh h-dvh basis-full">
      <div className="overflow-y-auto flex flex-wrap w-full h-dvh">
        {showHeroPanel ? (
          <div
            className="lg:block hidden flex-1 overflow-hidden text-[40px] leading-[48px] text-default-600 relative z-1 bg-default-50"
          >
            <div className="max-w-[520px] pt-20 ps-20 ">
              {showBranding ? (
                <Link href="/" className="mb-6 inline-block">
                  <Logo title={brandName} />
                </Link>
              ) : null}
              <h4>
                Unlock your Analytics
                <span className="text-default-800 font-bold ms-2">Performance</span>
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
        ) : null}
        <div className={`relative ${showHeroPanel ? "flex-1" : "w-full"}`}>
          <div className="h-full flex flex-col dark:bg-default-100 bg-white">
            <div className={`md:px-[42px] md:py-[44px] p-7 mx-auto w-full text-2xl text-default-900 mb-3 h-full flex flex-col justify-center ${showHeroPanel ? "max-w-[524px]" : "max-w-[720px]"}`}>
              {showBranding ? (
                <div className="flex justify-center items-center text-center mb-6 lg:hidden ">
                  <Link href="/">
                    <Logo title={brandName} />
                  </Link>
                </div>
              ) : null}
              {helperContent ? <div className="mb-6">{helperContent}</div> : null}
              <div className="text-center 2xl:mb-10 mb-4">
                <h4 className="font-medium">{heading}</h4>
                <div className="text-default-500 text-base">{description}</div>
              </div>
              <LoginForm
                locale={locale}
                callbackUrl={callbackUrl}
                loginMode={loginMode}
                defaultEmail={defaultEmail}
                defaultPassword={defaultPassword}
                autoSubmit={autoSubmit}
              />
            </div>
            <div className="text-xs font-normal text-default-500 z-999 pb-10 text-center">
              <Copyright />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
