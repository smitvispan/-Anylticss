// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

async function initSEOAccounts() {
    // try {
    //     console.log('🚀 Initializing SEO accounts...');

    //     // Use the hardcoded user ID from your database
    //     const userId = "000000000000000000000000";

    //     // Check if user exists
    //     const user = await prisma.user.findUnique({

    //         where: { id: userId }
    //     });

    //     if (!user) {
    //         console.log('❌ User not found. Please make sure the user exists in the database.');
    //         return;
    //     }

    //     console.log('✅ User found:', user.email);

    //     // Add your Search Console sites
    //     const seoAccounts = [
    //         {
    //             siteUrl: 'sc-domain:vispan.ai',
    //             accountName: 'Vispan AI Website'
    //         }
    //         // Add more sites as needed
    //     ];

    //     for (const account of seoAccounts) {
    //         const existing = await prisma.seoAccount.findFirst({
    //             where: {
    //                 userId: userId,
    //                 siteUrl: account.siteUrl
    //             }
    //         });

    //         if (!existing) {
    //             await prisma.seoAccount.create({
    //                 data: {
    //                     userId: userId,
    //                     siteUrl: account.siteUrl,
    //                     accountName: account.accountName,
    //                     isActive: true
    //                 }
    //             });
    //             console.log(`✅ Created SEO account: ${account.accountName}`);
    //         } else {
    //             console.log(`ℹ️ SEO account already exists: ${account.accountName}`);
    //         }
    //     }

    //     console.log('🎉 SEO accounts initialization completed!');

    // } catch (error) {
    //     console.error('❌ Initialization error:', error);
    // } finally {
    //     await prisma.$disconnect();
    // }
}

initSEOAccounts();