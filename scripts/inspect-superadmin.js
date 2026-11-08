require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const users = await p.user.findMany({
    where: { role: { code: 'SUPER_ADMIN' } },
    select: { id: true, email: true, identifier: true, fullName: true, status: true, passwordHash: true },
  });
  console.log('SuperAdmins:', users.map(u => ({ id: u.id, email: u.email, identifier: u.identifier, fullName: u.fullName, hasPassword: !!u.passwordHash })));
  await p.$disconnect();
})();
