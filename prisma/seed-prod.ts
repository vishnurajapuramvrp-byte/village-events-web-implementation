import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgName = process.env.ORG_NAME?.trim() || "Village Welfare Trust";
  const villageName = process.env.VILLAGE_NAME?.trim() || "Vishnu Raja Puram";

  let organization = await prisma.organization.findFirst();
  if (!organization) {
    organization = await prisma.organization.create({ data: { name: orgName } });
  }

  let village = await prisma.village.findFirst({ where: { organizationId: organization.id } });
  if (!village) {
    village = await prisma.village.create({
      data: {
        name: villageName,
        district: process.env.VILLAGE_DISTRICT?.trim() || null,
        state: process.env.VILLAGE_STATE?.trim() || null,
        organizationId: organization.id,
      },
    });
  } else {
    village = await prisma.village.update({
      where: { id: village.id },
      data: {
        name: villageName,
        district: process.env.VILLAGE_DISTRICT?.trim() || village.district,
        state: process.env.VILLAGE_STATE?.trim() || village.state,
      },
    });
  }

  console.log(`Production seed ready: ${organization.name} / ${village.name} (${village.id})`);
  console.log("Sign in with a Google account listed in ADMIN_EMAILS; it will be attached to this village.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
