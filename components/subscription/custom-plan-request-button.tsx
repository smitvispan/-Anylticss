"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { COUNTRY_OPTIONS } from "@/lib/country-options";

type CustomPlanRequestButtonProps = {
  planName?: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
  triggerLabel?: string;
  className?: string;
};

export default function CustomPlanRequestButton({
  planName = "Own Plan",
  defaultName = "",
  defaultEmail = "",
  triggerLabel = "Request Own Plan",
  className = "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800",
}: CustomPlanRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: defaultName || "",
    contactEmail: defaultEmail || "",
    mobileNumber: "",
    country: "India",
    agencyName: "",
    website: "",
    notes: "",
  });

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";

  function resetForm() {
    setForm({
      name: defaultName || "",
      contactEmail: defaultEmail || "",
      mobileNumber: "",
      country: "India",
      agencyName: "",
      website: "",
      notes: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscriptions/custom-plan-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          planName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || "Unable to submit request.");
      }

      setSubmitted(true);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSubmitted(false);
          setSubmitting(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={className}>
          <Icon icon="lucide:messages-square" className="h-4 w-4" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl">
        {submitted ? (
          <div>
            <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <DialogTitle className="text-2xl font-bold text-slate-900">Thank you</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Your {planName.toLowerCase()} request has been submitted successfully.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon icon="lucide:check-check" className="h-8 w-8" />
              </div>
              <p className="mt-5 text-lg font-semibold text-slate-900">
                You will be contacted within 24 hours.
              </p>
            </div>
            <DialogFooter className="border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700"
              >
                Close
              </button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
              <DialogTitle className="text-2xl font-bold text-slate-900">
                {planName}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Share your contact details and reporting needs. We will contact you with a custom setup.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClass} htmlFor="custom-plan-name">Name</label>
                <input
                  id="custom-plan-name"
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="custom-plan-contact-email">Contact Email</label>
                <input
                  id="custom-plan-contact-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((current) => ({ ...current, contactEmail: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="custom-plan-mobile-number">Mobile Number</label>
                <input
                  id="custom-plan-mobile-number"
                  type="tel"
                  value={form.mobileNumber}
                  onChange={(e) => setForm((current) => ({ ...current, mobileNumber: e.target.value }))}
                  className={inputClass}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="custom-plan-country">Country</label>
                <select
                  id="custom-plan-country"
                  value={form.country}
                  onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))}
                  className={inputClass}
                  required
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="custom-plan-agency">Agency Name</label>
                <input
                  id="custom-plan-agency"
                  value={form.agencyName}
                  onChange={(e) => setForm((current) => ({ ...current, agencyName: e.target.value }))}
                  className={inputClass}
                  placeholder="Vispan Solutions"
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="custom-plan-website">Primary Website</label>
                <input
                  id="custom-plan-website"
                  value={form.website}
                  onChange={(e) => setForm((current) => ({ ...current, website: e.target.value }))}
                  className={inputClass}
                  placeholder="vispansolution.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className={labelClass} htmlFor="custom-plan-notes">Requirements</label>
                <textarea
                  id="custom-plan-notes"
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  className={`${inputClass} min-h-32`}
                  placeholder="Tell us which reports should be visible to which users."
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 px-6 py-5">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Submitting..." : "Send Request"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
