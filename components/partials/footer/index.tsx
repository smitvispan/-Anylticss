import React from 'react'
import FooterContent from './footer-content'
import { Link } from "@/components/navigation"
import Image from 'next/image'
import { Icon } from "@/components/ui/icon";
import { auth } from '@/lib/auth'

const DashCodeFooter = async () => {
    const session = await auth()
    return (
        <FooterContent>
            <div className="hidden items-center justify-between text-sm text-slate-600 md:flex">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        Admin workspace
                    </span>
                    <span className="hidden sm:inline-block">Secure console · {new Date().getFullYear()}</span>
                </div>
                <div className="flex items-center gap-4">
                    <a
                        href="https://vispansolutions.com/"
                        target="_blank"
                        className="text-sky-700 font-semibold hover:text-sky-800"
                    >
                        Support
                    </a>
                    {/* <Link href="/admin/users/new" className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700">
                        New user
                    </Link> */}
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 md:hidden">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Admin console</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin" className="font-semibold text-sky-700">Users</Link>
                    <Link href="/admin/account" className="text-slate-700">Channels</Link>
                </div>
            </div>
        </FooterContent>
    )
}

export default DashCodeFooter
