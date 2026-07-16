/// <reference types="jest" />

import { UserRole, UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DecksRepository } from './decks.repository';
import { DecksService } from './decks.service';

const currentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  role: UserRole.USER,
};

describe('DecksService', () => {
  let removeDeckCardMock: jest.Mock;
  let service: DecksService;

  beforeEach(() => {
    removeDeckCardMock = jest.fn();

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
      removeDeckCard: removeDeckCardMock,
    } as unknown as DecksRepository;

    service = new DecksService(repository);
  });

  it('removes only the requested card from a deck owned by the user', async () => {
    removeDeckCardMock.mockResolvedValue(true);

    await service.removeWordFromDeck(currentUser, 'deck-1', 'card-1');

    expect(removeDeckCardMock).toHaveBeenCalledWith({
      userId: currentUser.id,
      languagePairId: 'pair-1',
      deckId: 'deck-1',
      deckCardId: 'card-1',
    });
  });

  it('returns not found when the card is not part of the requested deck', async () => {
    removeDeckCardMock.mockResolvedValue(false);

    await expect(
      service.removeWordFromDeck(currentUser, 'deck-1', 'missing-card'),
    ).rejects.toThrow('Deck word not found');
  });
});
