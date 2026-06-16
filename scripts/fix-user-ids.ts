// scripts/fix-user-ids.ts
// import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

// const prisma = new PrismaClient();

function generateObjectId(input: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(input).digest('hex');
    return hash.substring(0, 24);
}

async function fixUserIds() {
//     console.log('🔧 Fixing user IDs...');

//     // Find all users with non-ObjectId IDs
//     const users = await prisma.user.findMany();

//     for (const user of users) {
//         // Check if ID is not a valid ObjectId (24 char hex)
//         if (!/^[0-9a-fA-F]{24}$/.test(user.id)) {
//             console.log(`🔄 Fixing user: ${user.email} (ID: ${user.id})`);

//             // Generate a proper ObjectId from the existing ID
//             const newId = generateObjectId(user.id);

//             try {
//                 // Update the user with new ID
//                 // await prisma.user.update({
//                 //     where: { id: user.id },
//                 //     data: { id: newId }
//                 // });
//                 await prisma.user.update({
//                     where: { id: user.id },
//                     data: {} // keep empty OR remove the entire update call
//                 });


//                 // Update all related records
//                 await prisma.account.updateMany({
//                     where: { userId: user.id },
//                     data: { userId: newId }
//                 });

//                 await prisma.session.updateMany({
//                     where: { userId: user.id },
//                     data: { userId: newId }
//                 });

//                 await prisma.gscSite.updateMany({
//                     where: { userId: user.id },
//                     data: { userId: newId }
//                 });

//                 await prisma.seoReport.updateMany({
//                     where: { userId: user.id },
//                     data: { userId: newId }
//                 });

//                 console.log(`✅ Fixed user: ${user.email} -> ${newId}`);
//             } catch (error: any) {
//                 console.error(`❌ Failed to fix user ${user.email}:`, error.message);
//             }
//         }
//     }

    console.log('🎉 User ID fix completed!');
}

fixUserIds()
    .catch(console.error)
    // .finally(() => prisma.$disconnect());