'use client';
import { Button } from "@/components/ui/button";
import { useForm, SubmitHandler } from "react-hook-form";
import { signIn } from "next-auth/react";

type Inputs = {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
};

const RegForm = () => {
  const { register, handleSubmit, watch } = useForm<Inputs>();
  
  const onSubmit: SubmitHandler<Inputs> = (data) => {
    console.log(data);
  };
  
  const handleFacebookLogin = async () => {
    try {
      await signIn("facebook", { 
        callbackUrl: '/', // Where to redirect after login
        redirect: true // Set to false if you want to handle the response manually
      });
    } catch (error) {
      console.error("Facebook login error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Button 
        type="button"
        onClick={handleFacebookLogin} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        Continue with Facebook
      </Button>
    </form>
  );
};

export default RegForm;