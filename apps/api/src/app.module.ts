import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CountryModule } from './modules/countries/country.module';
import { LanguageModule } from './modules/languages/language.module';
import { LanguagePairModule } from './modules/language-pairs/language-pair.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    CountryModule,
    LanguageModule,
    LanguagePairModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
