/// <reference types="jest" />

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AudienceScope,
  CefrLevel,
  UserWordStatus,
  WordType,
} from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  expectAuthResponseBody,
  expectBooleanField,
  expectNullableStringField,
  expectNumberField,
  expectObject,
  expectStringField,
} from './helpers/response.helpers';

type DeckSummaryBody = {
  id: string;
  title: string;
  description: string | null;
  isDefault: boolean;
  wordCount: number;
  masteryScore: number;
  maxMasteryScore: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
};

type DeckWordBody = {
  deckCardId: string;
  id: string;
  sourceText: string;
  targetText: string;
  wordType: WordType;
  cefrLevel: CefrLevel | null;
  definition: string | null;
  note: string | null;
  visibility: AudienceScope;
  userWord: {
    id: string;
    vocabularyItemId: string;
    status: UserWordStatus;
    masteryStep: number;
  };
};

type DeckDetailBody = DeckSummaryBody & {
  items: DeckWordBody[];
};

function expectDeckSummaryBody(value: unknown): DeckSummaryBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    title: expectStringField(body, 'title'),
    description: expectNullableStringField(body, 'description'),
    isDefault: expectBooleanField(body, 'isDefault'),
    wordCount: expectNumberField(body, 'wordCount'),
    masteryScore: expectNumberField(body, 'masteryScore'),
    maxMasteryScore: expectNumberField(body, 'maxMasteryScore'),
    progressPercent: expectNumberField(body, 'progressPercent'),
    createdAt: expectStringField(body, 'createdAt'),
    updatedAt: expectStringField(body, 'updatedAt'),
  };
}

function expectDeckWordBody(value: unknown): DeckWordBody {
  const body = expectObject(value);
  const userWord = expectObject(body.userWord);

  return {
    deckCardId: expectStringField(body, 'deckCardId'),
    id: expectStringField(body, 'id'),
    sourceText: expectStringField(body, 'sourceText'),
    targetText: expectStringField(body, 'targetText'),
    wordType: expectStringField(body, 'wordType') as WordType,
    cefrLevel:
      typeof body.cefrLevel === 'string' ? (body.cefrLevel as CefrLevel) : null,
    definition: expectNullableStringField(body, 'definition'),
    note: expectNullableStringField(body, 'note'),
    visibility: expectStringField(body, 'visibility') as AudienceScope,
    userWord: {
      id: expectStringField(userWord, 'id'),
      vocabularyItemId: expectStringField(userWord, 'vocabularyItemId'),
      status: expectStringField(userWord, 'status') as UserWordStatus,
      masteryStep: expectNumberField(userWord, 'masteryStep'),
    },
  };
}

function expectDeckDetailBody(value: unknown): DeckDetailBody {
  const body = expectObject(value);

  if (!Array.isArray(body.items)) {
    throw new Error('Expected "items" to be an array');
  }

  return {
    ...expectDeckSummaryBody(body),
    items: body.items.map((item) => expectDeckWordBody(item)),
  };
}

function expectDeckListBody(value: unknown): DeckSummaryBody[] {
  const body = expectObject(value);

  if (!Array.isArray(body.items)) {
    throw new Error('Expected "items" to be an array');
  }

  return body.items.map((item) => expectDeckSummaryBody(item));
}

describe('DecksController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;
  let ownerAccessToken: string;
  let otherAccessToken: string;

  const runId = `${Date.now()}`;
  const ownerEmail = `decks-owner-${runId}@example.com`;
  const otherEmail = `decks-other-${runId}@example.com`;
  const password = 'password123';

  async function registerAndLogin(
    email: string,
    displayName: string,
  ): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, displayName, languagePairId })
      .expect(201);

    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return expectAuthResponseBody(loginResponse.body as unknown).accessToken;
  }

  async function createDeck(
    label: string,
    token = ownerAccessToken,
  ): Promise<DeckDetailBody> {
    const response = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Deck ${runId} ${label}`,
        description: `Description for ${label}`,
      })
      .expect(201);

    return expectDeckDetailBody(response.body as unknown);
  }

  async function addWords(
    deckId: string,
    label: string,
    token = ownerAccessToken,
  ): Promise<DeckDetailBody> {
    const response = await request(app.getHttpServer())
      .post(`/decks/${deckId}/words`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        words: [
          {
            sourceText: `  source   ${runId} ${label} one  `,
            targetText: `  target   ${runId} ${label} one  `,
            wordType: WordType.NOUN,
            cefrLevel: CefrLevel.A1,
            definition: `  Definition   for ${label}  `,
          },
          {
            sourceText: `source ${runId} ${label} two`,
            targetText: `target ${runId} ${label} two`,
            wordType: WordType.VERB,
            note: `Note for ${label}`,
          },
        ],
      })
      .expect(201);

    return expectDeckDetailBody(response.body as unknown);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const sourceLanguage = await prisma.language.create({
      data: {
        code: `decks-src-${runId}`,
        name: 'Decks E2E Source',
        nativeName: 'Decks E2E Source',
      },
    });
    const targetLanguage = await prisma.language.create({
      data: {
        code: `decks-tgt-${runId}`,
        name: 'Decks E2E Target',
        nativeName: 'Decks E2E Target',
      },
    });
    const languagePair = await prisma.languagePair.create({
      data: {
        sourceLanguageId: sourceLanguage.id,
        targetLanguageId: targetLanguage.id,
      },
    });

    sourceLanguageId = sourceLanguage.id;
    targetLanguageId = targetLanguage.id;
    languagePairId = languagePair.id;
    ownerAccessToken = await registerAndLogin(ownerEmail, 'Deck Owner');
    otherAccessToken = await registerAndLogin(otherEmail, 'Other User');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, otherEmail] } },
    });
    await prisma.languagePair.deleteMany({
      where: { id: languagePairId },
    });
    await prisma.language.deleteMany({
      where: { id: { in: [sourceLanguageId, targetLanguageId] } },
    });
    await app.close();
  });

  it('rejects unauthenticated deck access', async () => {
    await request(app.getHttpServer()).get('/decks').expect(401);
  });

  it('creates normalized decks and keeps only one default deck', async () => {
    const firstResponse = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({
        title: '  Travel   words  ',
        description: '  Common   travel phrases  ',
        isDefault: true,
      })
      .expect(201);

    const firstDeck = expectDeckDetailBody(firstResponse.body as unknown);

    expect(firstDeck).toMatchObject({
      title: 'Travel words',
      description: 'Common travel phrases',
      isDefault: true,
      wordCount: 0,
      masteryScore: 0,
      maxMasteryScore: 0,
      progressPercent: 0,
      items: [],
    });

    const secondResponse = await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({ title: 'Daily words', isDefault: true })
      .expect(201);
    const secondDeck = expectDeckDetailBody(secondResponse.body as unknown);

    const listResponse = await request(app.getHttpServer())
      .get('/decks')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(200);
    const decks = expectDeckListBody(listResponse.body as unknown);

    expect(decks.find((deck) => deck.id === firstDeck.id)?.isDefault).toBe(
      false,
    );
    expect(decks.find((deck) => deck.id === secondDeck.id)?.isDefault).toBe(
      true,
    );
  });

  it('adds multiple words idempotently and returns initial progress', async () => {
    const deck = await createDeck('add-words');
    const updatedDeck = await addWords(deck.id, 'add-words');

    expect(updatedDeck.wordCount).toBe(2);
    expect(updatedDeck.masteryScore).toBe(0);
    expect(updatedDeck.maxMasteryScore).toBe(10);
    expect(updatedDeck.progressPercent).toBe(0);

    const firstWord = updatedDeck.items.find((item) =>
      item.sourceText.endsWith('add-words one'),
    );

    if (!firstWord) {
      throw new Error('Expected the first added deck word');
    }

    expect(firstWord).toMatchObject({
      sourceText: `source ${runId} add-words one`,
      targetText: `target ${runId} add-words one`,
      wordType: WordType.NOUN,
      cefrLevel: CefrLevel.A1,
      definition: 'Definition for add-words',
      note: null,
      visibility: AudienceScope.PRIVATE,
    });
    expect(firstWord.userWord).toMatchObject({
      vocabularyItemId: firstWord.id,
      status: UserWordStatus.NEW,
      masteryStep: 0,
    });

    const duplicateResponse = await request(app.getHttpServer())
      .post(`/decks/${deck.id}/words`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({
        words: [
          {
            sourceText: `SOURCE ${runId} ADD-WORDS ONE`,
            targetText: `TARGET ${runId} ADD-WORDS ONE`,
          },
        ],
      })
      .expect(201);
    const duplicateResult = expectDeckDetailBody(
      duplicateResponse.body as unknown,
    );

    expect(duplicateResult.wordCount).toBe(2);
    expect(
      duplicateResult.items.filter((item) => item.id === firstWord?.id),
    ).toHaveLength(1);
  });

  it('removes only the deck membership and preserves learning data', async () => {
    const deck = await createDeck('remove-word');
    const deckWithWords = await addWords(deck.id, 'remove-word');
    const word = deckWithWords.items[0];

    expect(word).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/decks/${deck.id}/words/${word?.deckCardId}`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(204);

    const detailResponse = await request(app.getHttpServer())
      .get(`/decks/${deck.id}`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(200);
    const updatedDeck = expectDeckDetailBody(detailResponse.body as unknown);

    expect(updatedDeck.wordCount).toBe(1);
    expect(updatedDeck.items.some((item) => item.id === word?.id)).toBe(false);
    await expect(
      prisma.userWord.findUnique({ where: { id: word?.userWord.id } }),
    ).resolves.not.toBeNull();
  });

  it('hides owner decks and mutations from another user', async () => {
    const deck = await createDeck('ownership');
    const deckWithWords = await addWords(deck.id, 'ownership');
    const word = deckWithWords.items[0];

    await request(app.getHttpServer())
      .get(`/decks/${deck.id}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/decks/${deck.id}/words`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({
        words: [{ sourceText: 'foreign', targetText: 'foreign-target' }],
      })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/decks/${deck.id}/words/${word?.deckCardId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);

    const ownerDetailResponse = await request(app.getHttpServer())
      .get(`/decks/${deck.id}`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .expect(200);
    const ownerDeck = expectDeckDetailBody(ownerDetailResponse.body as unknown);

    expect(ownerDeck.items.some((item) => item.id === word?.id)).toBe(true);
  });

  it('rejects empty titles and oversized word batches', async () => {
    await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({ title: '   ' })
      .expect(400);

    const deck = await createDeck('validation');
    const words = Array.from({ length: 21 }, (_, index) => ({
      sourceText: `source-${index}`,
      targetText: `target-${index}`,
    }));

    await request(app.getHttpServer())
      .post(`/decks/${deck.id}/words`)
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({ words })
      .expect(400);
  });
});
