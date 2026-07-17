/// <reference types="jest" />

import {
  AudienceScope,
  UserRole,
  UserStatus,
  UserWordStatus,
  WordType,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MasteredCollectionsRepository } from './mastered-collections.repository';
import { MasteredCollectionsService } from './mastered-collections.service';
import type { MasteredCollectionResult } from './mastered-collections.types';

const currentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
};

const now = new Date('2026-07-17T09:00:00.000Z');

const collectionResult: MasteredCollectionResult = {
  collection: {
    id: 'collection-1',
    userId: currentUser.id,
    languagePairId: 'pair-1',
    title: 'Travel words',
    description: 'Words I already know',
    createdAt: now,
    updatedAt: now,
  },
  words: [
    {
      collectionWordId: 'collection-word-1',
      createdAt: now,
      userWord: {
        id: 'user-word-1',
        vocabularyItemId: 'word-1',
        status: UserWordStatus.MASTERED,
        isFavorite: false,
        masteryStep: 5,
        reviewCount: 5,
        correctCount: 5,
        wrongCount: 0,
        lastReviewedAt: now,
        nextReviewAt: null,
        createdAt: now,
      },
      vocabularyItem: {
        id: 'word-1',
        languagePairId: 'pair-1',
        sourceText: 'journey',
        targetText: 'səyahət',
        wordType: WordType.NOUN,
        cefrLevel: null,
        definition: null,
        note: null,
        visibility: AudienceScope.PRIVATE,
        isActive: true,
        createdAt: now,
        examples: [],
      },
    },
  ],
};

describe('MasteredCollectionsService', () => {
  let createCollectionMock: jest.Mock;
  let findCollectionsMock: jest.Mock;
  let findCollectionByIdMock: jest.Mock;
  let addWordsToCollectionMock: jest.Mock;
  let removeWordFromCollectionMock: jest.Mock;
  let deleteCollectionMock: jest.Mock;
  let service: MasteredCollectionsService;

  beforeEach(() => {
    createCollectionMock = jest.fn();
    findCollectionsMock = jest.fn();
    findCollectionByIdMock = jest.fn();
    addWordsToCollectionMock = jest.fn();
    removeWordFromCollectionMock = jest.fn();
    deleteCollectionMock = jest.fn();

    const repository = {
      findUserContext: jest.fn().mockResolvedValue({
        status: UserStatus.ACTIVE,
        profile: {
          activeLanguagePairId: 'pair-1',
        },
        languagePairs: [
          {
            languagePairId: 'pair-1',
            isLearning: true,
            languagePair: {
              id: 'pair-1',
              isActive: true,
            },
          },
        ],
      }),
      createCollection: createCollectionMock,
      findCollections: findCollectionsMock,
      findCollectionById: findCollectionByIdMock,
      addWordsToCollection: addWordsToCollectionMock,
      removeWordFromCollection: removeWordFromCollectionMock,
      deleteCollection: deleteCollectionMock,
    } as unknown as MasteredCollectionsRepository;

    service = new MasteredCollectionsService(repository);
  });

  it('creates a collection with normalized text in the active language pair', async () => {
    createCollectionMock.mockResolvedValue(collectionResult);

    const response = await service.createCollection(currentUser, {
      title: '  Travel   words ',
      description: ' Words   I already know ',
    });

    expect(createCollectionMock).toHaveBeenCalledWith({
      userId: currentUser.id,
      languagePairId: 'pair-1',
      title: 'Travel words',
      description: 'Words I already know',
    });
    expect(response.id).toBe('collection-1');
    expect(response.wordCount).toBe(1);
    expect(response.masteredWordCount).toBe(1);
  });

  it('lists collection summaries without exposing their storage purpose', async () => {
    findCollectionsMock.mockResolvedValue([
      {
        collection: collectionResult.collection,
        wordCount: 3,
        masteredWordCount: 2,
      },
    ]);

    const response = await service.listCollections(currentUser);

    expect(findCollectionsMock).toHaveBeenCalledWith({
      userId: currentUser.id,
      languagePairId: 'pair-1',
    });
    expect(response.items).toEqual([
      expect.objectContaining({
        id: 'collection-1',
        wordCount: 3,
        masteredWordCount: 2,
      }),
    ]);
  });

  it('adds mastered user words to a collection', async () => {
    addWordsToCollectionMock.mockResolvedValue({
      status: 'SUCCESS',
      collection: collectionResult,
    });

    const response = await service.addWordsToCollection(
      currentUser,
      'collection-1',
      {
        userWordIds: ['user-word-1'],
      },
    );

    expect(addWordsToCollectionMock).toHaveBeenCalledWith({
      userId: currentUser.id,
      languagePairId: 'pair-1',
      collectionId: 'collection-1',
      userWordIds: ['user-word-1'],
    });
    expect(response.items[0]).toEqual(
      expect.objectContaining({
        collectionWordId: 'collection-word-1',
        sourceText: 'journey',
      }),
    );
  });

  it('rejects words that are not mastered in the active language pair', async () => {
    addWordsToCollectionMock.mockResolvedValue({
      status: 'WORDS_NOT_ELIGIBLE',
    });

    await expect(
      service.addWordsToCollection(currentUser, 'collection-1', {
        userWordIds: ['user-word-2'],
      }),
    ).rejects.toThrow(
      'Only mastered words from the active language pair can be added',
    );
  });

  it('returns not found when adding words to another or missing collection', async () => {
    addWordsToCollectionMock.mockResolvedValue({
      status: 'COLLECTION_NOT_FOUND',
    });

    await expect(
      service.addWordsToCollection(currentUser, 'missing-collection', {
        userWordIds: ['user-word-1'],
      }),
    ).rejects.toThrow('Mastered collection not found');
  });

  it('removes only the collection membership', async () => {
    removeWordFromCollectionMock.mockResolvedValue(true);

    await service.removeWordFromCollection(
      currentUser,
      'collection-1',
      'collection-word-1',
    );

    expect(removeWordFromCollectionMock).toHaveBeenCalledWith({
      userId: currentUser.id,
      languagePairId: 'pair-1',
      collectionId: 'collection-1',
      collectionWordId: 'collection-word-1',
    });
  });

  it('returns not found when a collection membership cannot be removed', async () => {
    removeWordFromCollectionMock.mockResolvedValue(false);

    await expect(
      service.removeWordFromCollection(
        currentUser,
        'collection-1',
        'missing-word',
      ),
    ).rejects.toThrow('Collection word not found');
  });

  it('deletes only a mastered collection owned by the current user', async () => {
    deleteCollectionMock.mockResolvedValue(true);

    await service.deleteCollection(currentUser, 'collection-1');

    expect(deleteCollectionMock).toHaveBeenCalledWith({
      userId: currentUser.id,
      languagePairId: 'pair-1',
      collectionId: 'collection-1',
    });
  });
});
