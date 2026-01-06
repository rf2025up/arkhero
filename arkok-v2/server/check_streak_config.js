const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentName = '龙卓豫';
    const student = await prisma.students.findFirst({
        where: { name: studentName }
    });

    if (!student) {
        console.log('Student not found');
        return;
    }

    console.log(`Student: ${student.name}, SchoolId: ${student.schoolId}`);

    const items = await prisma.streak_category_items.findMany({
        where: { schoolId: student.schoolId }
    });

    console.log(`Found ${items.length} streak category items.`);
    items.forEach(i => console.log(`- ${i.code}: ${i.name}`));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
