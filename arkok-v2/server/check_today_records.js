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

    console.log(`Student: ${student.name}, ID: ${student.id}`);

    // Get today's date range (UTC+8)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`\nChecking records from ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

    // All records for this student (recent 10)
    const allRecords = await prisma.task_records.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(`\n--- Recent 10 Records ---`);
    allRecords.forEach(r => {
        const hasStreak = r.content?.streakUpdate ? '🔥' : '';
        console.log(`[${r.createdAt.toISOString()}] Type: ${r.type}, Status: ${r.status}, Title: "${r.title}" ${hasStreak}`);
    });

    // Today's COMPLETED records
    const todayRecords = await prisma.task_records.findMany({
        where: {
            studentId: student.id,
            createdAt: { gte: todayStart, lte: todayEnd },
            status: 'COMPLETED'
        }
    });

    console.log(`\n--- Today's COMPLETED Records: ${todayRecords.length} ---`);
    todayRecords.forEach(r => {
        console.log(`  - ${r.title}: ${JSON.stringify(r.content?.streakUpdate || 'no streak')}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
