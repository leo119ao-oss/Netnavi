const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const memories = await prisma.memory.findMany();
    console.log("Current Memories:");
    console.log(memories);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
