import { Module } from '@nestjs/common';
import { TimeModule } from '../../common/time/time.module';
import { AuthModule } from '../auth/auth.module';
import { PracticeController } from './practice.controller';
import { PracticeRepository } from './practice.repository';
import { PracticeService } from './practice.service';

@Module({
  imports: [AuthModule, TimeModule],
  controllers: [PracticeController],
  providers: [PracticeService, PracticeRepository],
})
export class PracticeModule {}
