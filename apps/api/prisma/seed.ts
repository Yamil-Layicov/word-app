import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function seedCountries() {
  const countries = [
    { code: 'AZ', name: 'Azerbaijan', emoji: '🇦🇿' },
    { code: 'TR', name: 'Turkey', emoji: '🇹🇷' },
    { code: 'RU', name: 'Russia', emoji: '🇷🇺' },
    { code: 'NO', name: 'Norway', emoji: '🇳🇴' },
    { code: 'ES', name: 'Spain', emoji: '🇪🇸' },
    { code: 'US', name: 'United States', emoji: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', emoji: '🇬🇧' },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {
        name: country.name,
        emoji: country.emoji,
        isActive: true,
      },
      create: {
        code: country.code,
        name: country.name,
        emoji: country.emoji,
      },
    });
  }
}

async function seedLanguages() {
  const languages = [
    { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan dili' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  ];

  for (const language of languages) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: {
        name: language.name,
        nativeName: language.nativeName,
        isActive: true,
      },
      create: {
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
      },
    });
  }
}

async function seedLanguagePairs() {
  const pairs = [
    { source: 'en', target: 'az' },
    { source: 'ru', target: 'az' },
    { source: 'tr', target: 'az' },
    { source: 'az', target: 'en' },
    { source: 'ru', target: 'en' },
  ];

  for (const pair of pairs) {
    const sourceLanguage = await prisma.language.findUniqueOrThrow({
      where: { code: pair.source },
    });

    const targetLanguage = await prisma.language.findUniqueOrThrow({
      where: { code: pair.target },
    });

    await prisma.languagePair.upsert({
      where: {
        sourceLanguageId_targetLanguageId: {
          sourceLanguageId: sourceLanguage.id,
          targetLanguageId: targetLanguage.id,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: targetLanguage.id,
      },
    });
  }
}

async function main() {
  await seedCountries();
  await seedLanguages();
  await seedLanguagePairs();

  console.log('Seed completed successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
