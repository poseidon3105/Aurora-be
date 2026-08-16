const { PrismaClient } = require('@prisma/client');

const systemRoles = [
  { name: 'USER', description: 'Standard application user' },
  { name: 'ADMIN', description: 'System administrator' },
  { name: 'SUPER_ADMIN', description: 'System super administrator' },
];

const projectRoles = [
  {
    name: 'PROJECT_MANAGER',
    description: 'Can manage project members and settings',
  },
  {
    name: 'MEMBER',
    description: 'Can work on project checklists and tasks',
  },
];

const taskStatuses = [
  { name: 'TODO', color: '#6B7280', orderIndex: 1 },
  { name: 'IN_PROGRESS', color: '#2563EB', orderIndex: 2 },
  { name: 'REVIEW', color: '#D97706', orderIndex: 3 },
  { name: 'DONE', color: '#16A34A', orderIndex: 4 },
];

async function seedCoreReferenceData(client) {
  await client.$transaction(async (tx) => {
    for (const role of systemRoles) {
      await tx.systemRole.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      });
    }

    for (const role of projectRoles) {
      await tx.projectRole.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      });
    }

    for (const status of taskStatuses) {
      await tx.taskStatus.upsert({
        where: { name: status.name },
        update: { color: status.color, orderIndex: status.orderIndex },
        create: status,
      });
    }
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedCoreReferenceData(prisma);
    console.log('Core roles and task statuses have been seeded.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  projectRoles,
  seedCoreReferenceData,
  systemRoles,
  taskStatuses,
};