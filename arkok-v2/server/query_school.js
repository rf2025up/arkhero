const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function querySchool() {
  try {
    // 查找星途与伴校区
    const schools = await prisma.schools.findMany({
      where: {
        OR: [
          { name: { contains: '星途' } },
          { name: { contains: '伴' } }
        ]
      }
    });

    console.log('找到的校区:', schools.length);
    console.log(JSON.stringify(schools, null, 2));

    if (schools.length > 0) {
      const school = schools[0];
      console.log('\n========================================');
      console.log('校区详细信息:');
      console.log('ID:', school.id);
      console.log('名称:', school.name);
      console.log('类型:', school.planType);
      console.log('状态:', school.isActive ? '启用' : '禁用');
      console.log('创建时间:', school.createdAt);
      console.log('到期时间:', school.expiredAt);

      // 查询该校区下的校长
      const admins = await prisma.teachers.findMany({
        where: {
          schoolId: school.id,
          role: 'ADMIN'
        },
        select: {
          id: true,
          username: true,
          password: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      console.log('\n========================================');
      console.log('校长账号:', admins.length);
      admins.forEach((admin, index) => {
        console.log(`\n校长 ${index + 1}:`);
        console.log('  用户名:', admin.username);
        console.log('  密码:', admin.password);
        console.log('  姓名:', admin.name);
        console.log('  邮箱:', admin.email);
        console.log('  角色:', admin.role);
      });

      // 查询该校区下的所有老师
      const teachers = await prisma.teachers.findMany({
        where: {
          schoolId: school.id
        }
      });

      console.log('\n========================================');
      console.log('老师总数:', teachers.length);

      teachers.forEach((teacher, index) => {
        console.log(`\n老师 ${index + 1}:`);
        console.log('  用户名:', teacher.username);
        console.log('  密码:', teacher.password);
        console.log('  姓名:', teacher.name);
        console.log('  角色:', teacher.role);
        console.log('  邮箱:', teacher.email);
      });
    }

  } catch (error) {
    console.error('查询出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

querySchool();
