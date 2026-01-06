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

    console.log(`Found student: ${student.id} (${student.name})`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await prisma.task_records.findMany({
        where: {
            studentId: student.id,
            // createdAt: { gte: today } // Just get recent ones
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log('--- Recent Records ---');
    records.forEach(r => {
        console.log(`ID: ${r.id}`);
        console.log(`Type: ${r.type}, Title: "${r.title}"`);
        console.log(`Created: ${r.createdAt.toLocaleString()}, Status: ${r.status}`);
        console.log(`Content: ${JSON.stringify(r.content, null, 2)}`);
        console.log('----------------------');
    });

    // Check mapping manually
    const { getStreakCategory } = require('./src/utils/streakMapping');
    // Note: streakMapping is TS, so I can't require it directly in JS without compile.
    // I will just checking the title string in output.
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
