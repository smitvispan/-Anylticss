// pages/en/analytics/[gscSiteId]/seo/[action]/[siteUrl].tsx
import { GetServerSideProps, NextPage } from "next";
import { prisma } from "@/lib/prisma";
import SeoReportFilter from "@/app/[locale]/(public)/analytics/[id]/seo/_components/SeoReportFilter";

type GscSite = {
    id: string;
    siteUrl: string;
    permissionLevel: string;
    userId?: string;
    userEmail?: string;
    isActive: boolean;
    lastSynced?: string;
    createdAt: string;
    updatedAt: string;
};

type SeoProps = {
    gscSite: GscSite | null;
    action: string;
    siteUrl: string;
    gscSiteId: string;
};

const SeoPage: NextPage<SeoProps> = ({ gscSite, action, siteUrl }) => {

    if (!gscSite) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Site Not Found</h1>
                    <p className="text-gray-600">The requested site could not be found.</p>
                </div>
            </div>
        );
    }

    return <SeoReportFilter siteUrl={gscSite.siteUrl} gscSiteId={gscSite.id} />;
};

export const getServerSideProps: GetServerSideProps<SeoProps> = async ({ params }) => {
    const { gscSiteId, action, siteUrl } = params as { gscSiteId: string; action: string; siteUrl: string };

    // URL decode the siteUrl to handle special characters like ':'
    const decodedSiteUrl = decodeURIComponent(siteUrl);

    console.log("Decoded Site URL:", decodedSiteUrl);

    // Fetch the GSC Site data using Prisma
    const gscSite = await prisma.gscSite.findFirst({
        where: { siteUrl: decodedSiteUrl },
    });

    console.log("Fetched GSC Site:", gscSite);

    // If the site is not found, show a 404 page
    if (!gscSite) {
        return {
            notFound: true,
        };
    }

    // Serialize `Date` fields to strings
    const serializedGscSite = {
        ...gscSite,
        lastSynced: gscSite.lastSynced ? gscSite.lastSynced.toISOString() : null,
        createdAt: gscSite.createdAt.toISOString(),
        updatedAt: gscSite.updatedAt.toISOString(),
    };

    return {
        props: {
            gscSite: serializedGscSite,
            action,
            siteUrl: decodedSiteUrl,
            gscSiteId,
        },
    };
};

export default SeoPage;
