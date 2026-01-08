"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting data fix...');
    const skills = await prisma.student_skills.findMany({
        where: { level: { gt: 0 }, levelUpAt: { equals: null } }
    });
    console.log(`Found ${skills.length} skills with missing levelUpAt`);
    for (const s of skills) {
        await prisma.student_skills.update({
            where: { id: s.id },
            data: { levelUpAt: s.updatedAt || s.createdAt }
        });
        console.log(`Updated skill ${s.id}`);
    }
    console.log('Done');
}
main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=fix_skill_data.js.map