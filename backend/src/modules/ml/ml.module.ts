import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MlService } from './ml.service';
import { MlClientService } from './ml-client.service';
import { ConfigurationModule } from '../configuration/configuration.module';

@Global()
@Module({
  imports: [
    ConfigurationModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  providers: [MlService, MlClientService],
  exports: [MlService, MlClientService],
})
export class MlModule {}
