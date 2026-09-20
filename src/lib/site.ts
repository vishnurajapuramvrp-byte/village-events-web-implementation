import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export type SiteBranding = {
  villageName: string;
  tagline: string;
  headline: string;
  description: string;
  highlights: string[];
};

export async function getSiteBranding(): Promise<SiteBranding> {
  let villageNameFromDb = "";
  try {
    const village = await prisma.village.findFirst({
      orderBy: { createdAt: "asc" },
      select: { name: true },
    });
    villageNameFromDb = village?.name ?? "";
  } catch {
    villageNameFromDb = "";
  }

  const villageName = firstText(process.env.VILLAGE_NAME, siteConfig.villageName, villageNameFromDb) || "Village";
  const headline =
    firstText(process.env.VILLAGE_HEADLINE, siteConfig.headline) ||
    `Festival funds and need-based support for ${villageName}.`;
  const description =
    firstText(process.env.VILLAGE_DESCRIPTION, siteConfig.description) ||
    `Record donations and expenses for ${villageName} programmes, compute balances from transactions, and keep a verifiable audit trail.`;

  return {
    villageName,
    tagline: firstText(process.env.VILLAGE_TAGLINE, siteConfig.tagline) || "Events & Programs",
    headline,
    description,
    highlights: [...siteConfig.highlights],
  };
}
