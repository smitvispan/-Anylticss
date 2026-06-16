import React from 'react'
import { redirect } from 'next/navigation'
const page = async ({ params }: { params: Promise<{ id: string; locale: string }> }) => {
  const { locale } = await params;
  redirect(`/${locale}/auth/login`)
  return null
}

export default page