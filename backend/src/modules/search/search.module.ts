import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SemanticSearchService } from './semantic-search.service';
import { ContentIndexerService } from './content-indexer.service';
import { SearchController } from './search.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SearchController],
  providers: [SearchService, SemanticSearchService, ContentIndexerService],
  exports: [SearchService, SemanticSearchService, ContentIndexerService],
})
export class SearchModule {}