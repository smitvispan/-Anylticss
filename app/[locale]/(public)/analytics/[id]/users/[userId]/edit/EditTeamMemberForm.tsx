"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import Select from "react-select";

const customSelectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        minHeight: '46px',
        borderRadius: '1rem',
        borderColor: state.isFocused ? '#0ea5e9' : '#e2e8f0',
        boxShadow: state.isFocused ? '0 0 0 2px #e0f2fe' : 'none',
        '&:hover': { borderColor: '#bae6fd' },
        paddingLeft: '0.25rem',
        fontSize: '0.875rem',
        color: '#0f172a'
    }),
    menu: (base: any) => ({
        ...base,
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        zIndex: 50
    }),
    option: (base: any, state: { isSelected: boolean, isFocused: boolean }) => ({
        ...base,
        fontSize: '0.875rem',
        backgroundColor: state.isSelected ? '#0284c7' : state.isFocused ? '#f0f9ff' : 'transparent',
        color: state.isSelected ? 'white' : '#0f172a',
        cursor: 'pointer',
        '&:active': { backgroundColor: '#e0f2fe' }
    })
};

interface EditTeamMemberFormProps {
    userId: string;
    clientId: string;
    userToEdit: any;
    pages: any[];
    instas: any[];
    ads: any[];
    subAccounts: any[];
    gscSite: any[];
    updateClientUserAction: (formData: FormData) => Promise<any>;
}

export default function EditTeamMemberForm({
    userId,
    clientId,
    userToEdit,
    pages,
    instas,
    ads,
    subAccounts,
    gscSite,
    updateClientUserAction,
}: EditTeamMemberFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const inputClass =
        "w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400";
    const labelClass = "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;

        const formData = new FormData(formRef.current);
        setLoading(true);
        try {
            await updateClientUserAction(formData);
            toast.success("User updated successfully");
        } catch (err: any) {
            if (err.message?.includes("NEXT_REDIRECT")) return;
            toast.error(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            ref={formRef}
            onSubmit={handleFormSubmit}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl ring-1 ring-slate-100/60 backdrop-blur"
        >
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="clientId" value={clientId} />

            <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/80 via-white to-slate-50 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Edit User Profile</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 px-6 py-8 lg:grid-cols-2">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="name" className={labelClass}>Full name</label>
                        <input
                            id="name"
                            name="name"
                            defaultValue={userToEdit.name || ""}
                            className={inputClass}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className={labelClass}>Email address</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            defaultValue={userToEdit.email || ""}
                            className={inputClass}
                            placeholder="john@example.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className={labelClass}>New password (leave blank to keep current)</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            className={inputClass}
                            placeholder="••••••••"
                        />
                    </div>

                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="mainPage" className={labelClass}>Facebook Page Assignment</label>
                        <Select
                            name="mainPage"
                            options={[{ value: "", label: "— No Assignment —" }].concat(
                                pages.map(p => ({ value: String(p._id), label: p.name ?? String(p._id) }))
                            )}
                            defaultValue={{
                                value: userToEdit.mainPage ? String(userToEdit.mainPage) : "",
                                label: userToEdit.mainPage
                                    ? pages.find(p => String(p._id) === String(userToEdit.mainPage))?.name ?? String(userToEdit.mainPage)
                                    : "— No Assignment —"
                            }}
                            styles={customSelectStyles}
                            isSearchable
                            noOptionsMessage={() => "No Facebook pages found"}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="mainInstagram" className={labelClass}>Instagram Profile Assignment</label>
                        <Select
                            name="mainInstagram"
                            options={[{ value: "", label: "— No Assignment —" }].concat(
                                instas.map(i => ({ value: String(i._id), label: i.username ?? String(i._id) }))
                            )}
                            defaultValue={{
                                value: userToEdit.mainInstagram ? String(userToEdit.mainInstagram) : "",
                                label: userToEdit.mainInstagram
                                    ? instas.find(i => String(i._id) === String(userToEdit.mainInstagram))?.username ?? String(userToEdit.mainInstagram)
                                    : "— No Assignment —"
                            }}
                            styles={customSelectStyles}
                            isSearchable
                            noOptionsMessage={() => "No Instagram profiles found"}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="mainAd" className={labelClass}>Meta Ad Account Assignment</label>
                        <Select
                            name="mainAd"
                            options={[{ value: "", label: "— No Assignment —" }].concat(
                                ads.map(a => ({ value: String(a._id), label: a.name ?? String(a._id) }))
                            )}
                            defaultValue={{
                                value: userToEdit.mainAd ? String(userToEdit.mainAd) : "",
                                label: userToEdit.mainAd
                                    ? ads.find(a => String(a._id) === String(userToEdit.mainAd))?.name ?? String(userToEdit.mainAd)
                                    : "— No Assignment —"
                            }}
                            styles={customSelectStyles}
                            isSearchable
                            noOptionsMessage={() => "No Meta ad accounts found"}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="mainGoogleAd" className={labelClass}>Google Ads Account Assignment</label>
                        <Select
                            name="mainGoogleAd"
                            options={[{ value: "", label: "— No Assignment —" }].concat(
                                subAccounts.map(acc => ({ value: String(acc._id), label: acc.descriptiveName ?? acc.accountId ?? String(acc._id) }))
                            )}
                            defaultValue={{
                                value: userToEdit.mainGoogleAd ? String(userToEdit.mainGoogleAd) : "",
                                label: userToEdit.mainGoogleAd
                                    ? subAccounts.find(acc => String(acc._id) === String(userToEdit.mainGoogleAd))?.descriptiveName ?? "Assigned"
                                    : "— No Assignment —"
                            }}
                            styles={customSelectStyles}
                            isSearchable
                            noOptionsMessage={() => "No Google Ads accounts found"}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="mainSEOsites" className={labelClass}>SEO Property Assignment</label>
                        <Select
                            name="mainSEOsites"
                            options={[{ value: "", label: "— No Assignment —" }].concat(
                                gscSite.map((site) => ({ value: String(site._id), label: site.siteUrl ?? String(site._id) }))
                            )}
                            defaultValue={{
                                value: userToEdit.mainSEOsites ? String(userToEdit.mainSEOsites) : "",
                                label: userToEdit.mainSEOsites
                                    ? gscSite.find((site) => String(site._id) === String(userToEdit.mainSEOsites))?.siteUrl ?? String(userToEdit.mainSEOsites)
                                    : "— No Assignment —"
                            }}
                            styles={customSelectStyles}
                            isSearchable
                            noOptionsMessage={() => "No Search Console properties found"}
                        />
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading && <Icon icon="lucide:loader-2" className="w-4 h-4 mr-2 animate-spin" />}
                    {loading ? "Processing..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
