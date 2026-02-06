import { Module, Global } from '@nestjs/common';
import { NlpService } from './nlp.service';
import { ConfigurationModule } from '../configuration/configuration.module';

@Global()
@Module({
  imports: [ConfigurationModule],
  providers: [NlpService],
  exports: [NlpService],
})
export class NlpModule {}
