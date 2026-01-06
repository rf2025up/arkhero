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

    console.log(`Found student: ${student.id} (${student.name}). Resetting streaks...`);

    // 1. Clear actual streaks
    const deleteResult = await prisma.category_streaks.deleteMany({
        where: { studentId: student.id }
    });
    console.log(`Deleted ${deleteResult.count} streak records.`);

    // 2. Reset QC tasks to PENDING so user can complete them again
    // And remove 'streakUpdate' from content
    const tasks = await prisma.task_records.findMany({
        where: {
            studentId: student.id,
            type: 'QC'
        }
    });

    console.log(`Found ${tasks.length} QC tasks. Resetting status...`);

    let resetCount = 0;
    for (const task of tasks) {
        const content = task.content || {};
        // Remove streakUpdate if exists
        if (content.streakUpdate) {
            delete content.streakUpdate;
        }

        await prisma.task_records.update({
            where: { id: task.id },
            data: {
                status: 'PENDING',
                expAwarded: 0,
                content: content
            }
        });
        resetCount++;
    }

    console.log(`Reset ${resetCount} tasks to PENDING.`);
    console.log('Done. Please refresh the page and try completing tasks again.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
