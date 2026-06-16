"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";

const schema = z.object({
  email: z.string().email({ message: "Your email is invalid." }),
  password: z.string().min(4, { message: "Password must be at least 4 characters long." }),
});

type Props = {
  locale?: string;
  callbackUrl?: string | null;
  defaultEmail?: string;
  defaultPassword?: string;
  autoSubmit?: boolean;
};
type LoginMode = "admin" | "client" | "user";

const LoginForm: React.FC<Props & { loginMode?: LoginMode }> = ({
  locale = "en",
  callbackUrl,
  loginMode = "user",
  defaultEmail = "",
  defaultPassword = "",
  autoSubmit = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [passwordType, setPasswordType] = useState<"password" | "text">("password");
  const autoSubmitTriggered = useRef(false);

  const togglePasswordType = () => {
    setPasswordType((t) => (t === "password" ? "text" : "password"));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "all",
    defaultValues: { email: defaultEmail, password: defaultPassword },
  });

  const onSubmit = useCallback(async (data: z.infer<typeof schema>) => {
    setIsLoading(true);

    try {
      const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : null;
      const adminUrl = `/${locale}/admin`;

      let nextUrl = safeCallbackUrl ?? adminUrl;

      if (loginMode !== "admin") {
        const response = await fetch("/api/client/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            keepSignedIn,
            loginMode,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.user?.id) {
          toast.error(payload?.error ?? "Invalid email or password");
          return;
        }

        nextUrl = safeCallbackUrl ?? `/${locale}/analytics/${payload.user.id}`;
      } else {
        const res = await signIn("credentials", {
          email: data.email,
          password: data.password,
          loginMode,
          redirect: false,
          callbackUrl: safeCallbackUrl ?? adminUrl,
        });

        if (!res) {
          toast.error("Login failed. Please try again.");
          return;
        }

        if (res.error) {
          toast.error(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
          return;
        }

        if (!keepSignedIn) {
          await fetch("/api/auth/session-cookie", {
            method: "POST",
            credentials: "include",
          }).catch(() => null);
        }
        nextUrl = safeCallbackUrl ?? adminUrl;
      }

      toast.success("Successfully logged in");
      window.location.assign(nextUrl);
      return;
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setIsLoading(false);
    }
  }, [callbackUrl, keepSignedIn, locale, loginMode]);

  useEffect(() => {
    reset({
      email: defaultEmail,
      password: defaultPassword,
    });
    autoSubmitTriggered.current = false;
  }, [defaultEmail, defaultPassword, reset]);

  useEffect(() => {
    if (!autoSubmit || !defaultEmail || !defaultPassword || autoSubmitTriggered.current) {
      return;
    }

    autoSubmitTriggered.current = true;
    void handleSubmit(onSubmit)();
  }, [autoSubmit, defaultEmail, defaultPassword, handleSubmit, onSubmit]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 2xl:mt-7 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="font-medium text-default-600">Email</Label>
        <Input
          size="lg"
          disabled={isLoading}
          {...register("email")}
          type="email"
          id="email"
          autoComplete="email"
          className={cn("", { "border-destructive": errors.email })}
        />
      </div>
      {errors.email && <div className="text-destructive mt-2 text-sm">{errors.email.message}</div>}

      <div className="mt-3.5 space-y-2">
        <Label htmlFor="password" className="mb-2 font-medium text-default-600">Password</Label>
        <div className="relative">
          <Input
            size="lg"
            disabled={isLoading}
            {...register("password")}
            type={passwordType}
            id="password"
            autoComplete="current-password"
            className="peer"
            placeholder=" "
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 cursor-pointer"
            onClick={togglePasswordType}
            aria-label={passwordType === "password" ? "Show password" : "Hide password"}
            role="button"
          >
            {passwordType === "password" ? (
              <Icon icon="heroicons:eye" className="w-5 h-5 text-default-400" />
            ) : (
              <Icon icon="heroicons:eye-slash" className="w-5 h-5 text-default-400" />
            )}
          </div>
        </div>
      </div>
      {errors.password && (
        <div className="text-destructive mt-2 text-sm">{errors.password.message}</div>
      )}

      <div className="flex justify-between">
        <div className="flex gap-2 items-center">
          <Checkbox
            id="checkbox"
            checked={keepSignedIn}
            onCheckedChange={(checked) => setKeepSignedIn(checked === true)}
          />
          <Label htmlFor="checkbox">Keep Me Signed In</Label>
        </div>
      </div>

      <Button fullWidth disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? "Loading..." : "Sign In"}
      </Button>
    </form>
  );
};

export default LoginForm;
