const fs=require('node:fs');
require('dotenv').config({path:'apps/api/.env'});
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
(async()=>{try{const files=process.argv.includes('--permissions')?['database/sql/permissions-matrix.sql']:process.argv.includes('--content')?['database/sql/content-library.sql']:['database/sql/batch-workspace.sql'];for(const file of files){const sql=fs.readFileSync(file,'utf8');await db.$transaction(async tx=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement);},{timeout:60000});console.log('Applied '+file);}}finally{await db.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
