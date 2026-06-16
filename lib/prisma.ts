// Prisma client is currently not configured in this project. Provide a small stub so
// imports stay type-safe and the app can build without the generated client.
// Replace this with a real PrismaClient when Prisma is introduced.
export const prisma: any = new Proxy(
  {},
  {
    get: (_target, prop) => {
      throw new Error(`Prisma client is not configured. Attempted to access prisma.${String(prop)}.`);
    },
  }
);
