const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const badges = await prisma.badges.findMany({
        select: { id: true, name: true, icon: true }
    });
    console.log(JSON.stringify(badges, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
