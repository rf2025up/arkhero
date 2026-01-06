const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 找到所有连胜荣耀记录
    const records = await prisma.task_records.findMany({
        where: { title: '连胜荣耀' }
    });

    console.log(`Found ${records.length} streak records`);

    // 删除旧格式的（没有 items 数组的）
    const oldRecords = records.filter(r => !r.content?.items);

    for (const r of oldRecords) {
        await prisma.task_records.delete({ where: { id: r.id } });
        console.log('Deleted:', r.id);
    }

    console.log('Total deleted:', oldRecords.length);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
