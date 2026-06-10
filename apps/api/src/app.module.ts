import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TimeModule } from './common/time/time.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CountryModule } from './modules/countries/country.module';
import { LanguagePairModule } from './modules/language-pairs/language-pair.module';
import { LanguageModule } from './modules/languages/language.module';
import { MeModule } from './modules/me/me.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
