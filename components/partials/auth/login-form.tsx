"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { Icon } from "@/components/ui/icon";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react"; // Import from next-auth

const schema = z.object({
  email: z.string().email({ message: "Your email is invalid." }),
  password: z.string().min(4, { message: "Password must be at least 4 characters long." }),
});

type Props = { locale?: string };

const LoginForm: React.FC<Props> = ({ locale = "en" }) => {
  const [isLoading, setIsLoading] = useState(false); // Use state for loading
  const router = useRouter();
  const [passwordType, setPasswordType] = useState<"password" | "text">("password");

  const togglePasswordType = () => {
    setPasswordType((t) => (t === "password" ? "text" : "password"));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "all",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setIsLoading(true); // Start loading state

    try {
      const callbackUrl = `/${locale}/admin`; // locale-aware

      // Perform sign-in with next-auth
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false, // we route manually
        callbackUrl, // pass it anyway (future-proof)
      });

      if (!res) {
        toast.error("Login failed. Please try again.");
        return;
      }

      if (res.error) {
        toast.error(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
        return;
      }

      toast.success("Successfully logged in");
      router.push(callbackUrl); // locale-aware push
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setIsLoading(false); // End loading state
    }
  };

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
          <Checkbox id="checkbox" defaultChecked />
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
