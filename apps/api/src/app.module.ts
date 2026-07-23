import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TimeModule } from './common/time/time.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CountryModule } from './modules/countries/country.module';
import { DecksModule } from './modules/decks/decks.module';
import { LanguagePairModule } from './modules/language-pairs/language-pair.module';
import { LanguageModule } from './modules/languages/language.module';
import { MasteredCollectionsModule } from './modules/mastered-collections/mastered-collections.module';
import { MeModule } from './modules/me/me.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ScheduledReviewsModule } from './modules/scheduled-reviews/scheduled-reviews.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { PracticeModule } from './modules/practice/practice.module';
import { PushTokensModule } from './modules/push-tokens/push-tokens.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TimeModule,
    DatabaseModule,
    CountryModule,
    LanguageModule,
    LanguagePairModule,
    AuthModule,
    MeModule,
    VocabularyModule,
    DecksModule,
    MasteredCollectionsModule,
    ReviewsModule,
    ScheduledReviewsModule,
    PracticeModule,
    PushTokensModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
