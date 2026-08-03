/// <reference types="jest" />

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserWordStatus, WordType } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  expectAuthResponseBody,
  expectNullableStringField,
  expectNumberField,
  expectObject,
  expectStringField,
} from './helpers/response.helpers';

type AuthenticatedTestUser = {
  accessToken: string;
  id: string;
};

type TestVocabularyItem = {
  id: string;
  userWordId: string;
};

type MasteredCollectionSummaryBody = {
  id: string;
  title: string;
  description: string | null;
  wordCount: number;
  masteredWordCount: number;
};

type MasteredCollectionWordBody = {
  collectionWordId: string;
  id: string;
  sourceText: string;
  targetText: string;
  userWord: {
    id: string;
    status: UserWordStatus;
    masteryStep: number;
  };
};

type MasteredCollectionDetailBody = MasteredCollectionSummaryBody & {
  items: MasteredCollectionWordBody[];
};

function expectMasteredCollectionSummaryBody(
  value: unknown,
): MasteredCollectionSummaryBody {
  const body = expectObject(value);

  return {
    id: expectStringField(body, 'id'),
    title: expectStringField(body, 'title'),
    description: expectNullableStringField(body, 'description'),
    wordCount: expectNumberField(body, 'wordCount'),
    masteredWordCount: expectNumberField(body, 'masteredWordCount'),
  };
}

function expectMasteredCollectionWordBody(
  value: unknown,
): MasteredCollectionWordBody {
  const body = expectObject(value);
  const userWord = expectObject(body.userWord);

  return {
    collectionWordId: expectStringField(body, 'collectionWordId'),
    id: expectStringField(body, 'id'),
    sourceText: expectStringField(body, 'sourceText'),
    targetText: expectStringField(body, 'targetText'),
    userWord: {
      id: expectStringField(userWord, 'id'),
      status: expectStringField(userWord, 'status') as UserWordStatus,
      masteryStep: expectNumberField(userWord, 'masteryStep'),
    },
  };
}

function expectMasteredCollectionDetailBody(
  value: unknown,
): MasteredCollectionDetailBody {
  const body = expectObject(value);

  if (!Array.isArray(body.items)) {
    throw new Error('Expected "items" to be an array');
  }

  return {
    ...expectMasteredCollectionSummaryBody(body),
    items: body.items.map((item) => expectMasteredCollectionWordBody(item)),
  };
}

function expectMasteredCollectionListBody(
  value: unknown,
): MasteredCollectionSummaryBody[] {
  const body = expectObject(value);

  if (!Array.isArray(body.items)) {
    throw new Error('Expected "items" to be an array');
  }

  return body.items.map((item) => expectMasteredCollectionSummaryBody(item));
}

describe('MasteredCollectionsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let languagePairId: string;
  let sourceLanguageId: string;
  let targetLanguageId: string;
  let owner: AuthenticatedTestUser;
  let otherUser: AuthenticatedTestUser;

  const runId = `${Date.now()}`;
  const ownerEmail = `mastered-owner-${runId}@example.com`;
  const otherEmail = `mastered-other-${runId}@example.com`;
  const password = 'password123';

  async function registerAndLogin(
    email: string,
    displayName: string,
  ): Promise<AuthenticatedTestUser> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, displayName, languagePairId })
      .expect(201);

    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return {
      id: user.id,
      accessToken: expectAuthResponseBody(loginResponse.body as unknown)
        .accessToken,
    };
  }

  async function createVocabularyItem(
    label: string,
    user = owner,
  ): Promise<TestVocabularyItem> {
    const response = await request(app.getHttpServer())
      .post('/vocabulary/items')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        sourceText: `source-${runId}-${label}`,
        targetText: `target-${runId}-${label}`,
        wordType: WordType.NOUN,
      })
      .expect(201);
    const body = expectObject(response.body as unknown);
    const userWord = expectObject(body.userWord);

    return {
      id: expectStringField(body, 'id'),
      userWordId: expectStringField(userWord, 'id'),
    };
  }

  async function markAsMastered(
    item: TestVocabularyItem,
    user = owner,
  ): Promise<void> {
    const response = await request(app.getHttpServer())
      .patch(`/vocabulary/items/${item.id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ status: UserWordStatus.MASTERED })
      .expect(200);
    const body = expectObject(response.body as unknown);
    const userWord = expectObject(body.userWord);

    expect(userWord.status).toBe(UserWordStatus.MASTERED);
    expect(userWord.masteryStep).toBe(5);
  }

  async function createMasteredCollection(
    label: string,
    user = owner,
  ): Promise<MasteredCollectionDetailBody> {
    const response = await request(app.getHttpServer())
      .post('/mastered-collections')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        title: `Collection ${runId} ${label}`,
        description: `Description for ${label}`,
      })
      .expect(201);

    return expectMasteredCollectionDetailBody(response.body as unknown);
  }

  async function addWordsToCollection(
    collectionId: string,
    userWordIds: string[],
    user = owner,
  ): Promise<MasteredCollectionDetailBody> {
    const response = await request(app.getHttpServer())
      .post(`/mastered-collections/${collectionId}/words`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ userWordIds })
      .expect(201);

    return expectMasteredCollectionDetailBody(response.body as unknown);
  }

  async function getMasteredCollection(
    collectionId: string,
    user = owner,
  ): Promise<MasteredCollectionDetailBody> {
    const response = await request(app.getHttpServer())
      .get(`/mastered-collections/${collectionId}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    return expectMasteredCollectionDetailBody(response.body as unknown);
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
        code: `mastered-src-${runId}`,
        name: 'Mastered E2E Source',
        nativeName: 'Mastered E2E Source',
      },
    });
    const targetLanguage = await prisma.language.create({
      data: {
        code: `mastered-tgt-${runId}`,
        name: 'Mastered E2E Target',
        nativeName: 'Mastered E2E Target',
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
    owner = await registerAndLogin(ownerEmail, 'Mastered Owner');
    otherUser = await registerAndLogin(otherEmail, 'Mastered Other User');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, otherEmail] } },
    });
    await prisma.languagePair.deleteMany({ where: { id: languagePairId } });
    await prisma.language.deleteMany({
      where: { id: { in: [sourceLanguageId, targetLanguageId] } },
    });
    await app.close();
  });

  it('rejects collection access without an access token', async () => {
    await request(app.getHttpServer()).get('/mastered-collections').expect(401);
  });

  it('creates normalized collections and lists only mastered collections', async () => {
    await request(app.getHttpServer())
      .post('/decks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: `Learning deck ${runId}` })
      .expect(201);

    const createResponse = await request(app.getHttpServer())
      .post('/mastered-collections')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        title: '  Travel   words  ',
        description: '  Words   I already know  ',
      })
      .expect(201);
    const collection = expectMasteredCollectionDetailBody(
      createResponse.body as unknown,
    );

    expect(collection).toMatchObject({
      title: 'Travel words',
      description: 'Words I already know',
      wordCount: 0,
      masteredWordCount: 0,
      items: [],
    });

    const listResponse = await request(app.getHttpServer())
      .get('/mastered-collections')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const collections = expectMasteredCollectionListBody(
      listResponse.body as unknown,
    );

    expect(collections.some((item) => item.id === collection.id)).toBe(true);
    expect(
      collections.some((item) => item.title === `Learning deck ${runId}`),
    ).toBe(false);
  });

  it('accepts only mastered words and adds them idempotently', async () => {
    const collection = await createMasteredCollection('eligibility');
    const masteredWord = await createVocabularyItem('mastered');
    const learningWord = await createVocabularyItem('learning');
    await markAsMastered(masteredWord);

    await request(app.getHttpServer())
      .post(`/mastered-collections/${collection.id}/words`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        userWordIds: [masteredWord.userWordId, learningWord.userWordId],
      })
      .expect(400);

    const unchangedCollection = await getMasteredCollection(collection.id);
    expect(unchangedCollection.items).toHaveLength(0);

    const addedCollection = await addWordsToCollection(collection.id, [
      masteredWord.userWordId,
    ]);
    const repeatedAdd = await addWordsToCollection(collection.id, [
      masteredWord.userWordId,
    ]);

    expect(addedCollection).toMatchObject({
      wordCount: 1,
      masteredWordCount: 1,
    });
    expect(addedCollection.items[0]).toMatchObject({
      id: masteredWord.id,
      sourceText: `source-${runId}-mastered`,
      userWord: {
        id: masteredWord.userWordId,
        status: UserWordStatus.MASTERED,
        masteryStep: 5,
      },
    });
    expect(repeatedAdd.items).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/mastered-collections/${collection.id}/words`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        userWordIds: [masteredWord.userWordId, masteredWord.userWordId],
      })
      .expect(400);
  });

  it('removes only collection membership and preserves learning data', async () => {
    const collection = await createMasteredCollection('remove');
    const masteredWord = await createVocabularyItem('remove-word');
    await markAsMastered(masteredWord);

    const learningDeck = await prisma.deck.create({
      data: {
        userId: owner.id,
        languagePairId,
        title: `Original deck ${runId}`,
      },
    });
    const learningDeckCard = await prisma.deckCard.create({
      data: {
        deckId: learningDeck.id,
        userWordId: masteredWord.userWordId,
      },
    });
    await prisma.userWord.update({
      where: { id: masteredWord.userWordId },
      data: {
        reviewCount: 7,
        correctCount: 6,
        wrongCount: 1,
      },
    });

    const populatedCollection = await addWordsToCollection(collection.id, [
      masteredWord.userWordId,
    ]);
    const collectionWord = populatedCollection.items[0];

    if (!collectionWord) {
      throw new Error('Expected the mastered collection word');
    }

    await request(app.getHttpServer())
      .delete(
        `/mastered-collections/${collection.id}/words/${collectionWord.collectionWordId}`,
      )
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(204);

    const emptiedCollection = await getMasteredCollection(collection.id);
    const preservedUserWord = await prisma.userWord.findUniqueOrThrow({
      where: { id: masteredWord.userWordId },
    });
    const preservedLearningCard = await prisma.deckCard.findUnique({
      where: { id: learningDeckCard.id },
    });

    expect(emptiedCollection.items).toHaveLength(0);
    expect(preservedUserWord).toMatchObject({
      status: UserWordStatus.MASTERED,
      masteryStep: 5,
      reviewCount: 7,
      correctCount: 6,
      wrongCount: 1,
    });
    expect(preservedLearningCard).not.toBeNull();
  });

  it('enforces ownership for collection reads and mutations', async () => {
    const ownerCollection = await createMasteredCollection('owner-scope');
    const ownerWord = await createVocabularyItem('owner-word');
    await markAsMastered(ownerWord);
    const populatedOwnerCollection = await addWordsToCollection(
      ownerCollection.id,
      [ownerWord.userWordId],
    );
    const ownerCollectionWord = populatedOwnerCollection.items[0];

    if (!ownerCollectionWord) {
      throw new Error('Expected the owner collection word');
    }

    const otherCollection = await createMasteredCollection(
      'other-scope',
      otherUser,
    );
    const otherWord = await createVocabularyItem('other-word', otherUser);
    await markAsMastered(otherWord, otherUser);

    await request(app.getHttpServer())
      .get(`/mastered-collections/${ownerCollection.id}`)
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/mastered-collections/${ownerCollection.id}/words`)
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .send({ userWordIds: [otherWord.userWordId] })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/mastered-collections/${otherCollection.id}/words`)
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .send({ userWordIds: [ownerWord.userWordId] })
      .expect(400);
    await request(app.getHttpServer())
      .delete(
        `/mastered-collections/${ownerCollection.id}/words/${ownerCollectionWord.collectionWordId}`,
      )
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/mastered-collections/${ownerCollection.id}`)
      .set('Authorization', `Bearer ${otherUser.accessToken}`)
      .expect(404);

    const unchangedOwnerCollection = await getMasteredCollection(
      ownerCollection.id,
    );
    expect(unchangedOwnerCollection.items).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/mastered-collections/${ownerCollection.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/mastered-collections/${ownerCollection.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(404);

    const preservedOwnerWord = await prisma.userWord.findUnique({
      where: { id: ownerWord.userWordId },
    });
    expect(preservedOwnerWord).toMatchObject({
      status: UserWordStatus.MASTERED,
      masteryStep: 5,
    });
  });
});
