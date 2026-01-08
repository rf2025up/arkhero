/**
 * 五维内功修炼系统 - 技能预置数据
 * 运行: npx ts-node prisma/seed-skills.ts
 */
declare const PrismaClient: any;
declare const prisma: any;
declare const skillsData: {
    code: string;
    name: string;
    attribute: string;
    category: string;
    levelData: {
        lvl: number;
        exp: number;
        title: string;
    }[];
}[];
declare function seedSkills(): Promise<void>;
//# sourceMappingURL=seed-skills.d.ts.map