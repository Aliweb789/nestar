import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import BoardArticleSchema from '../../schemas/BoardArticle.model';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';
import { ViewModule } from '../view/view.module';
import { CommentModule } from '../comment/comment.module';
import { LikeModule } from '../like/like.module';
import { BoardArticleResolver } from './board-article.resolver';
import { BoardArticleService } from './board-article.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'BoardArticle', schema: BoardArticleSchema }]),
    AuthModule,
    MemberModule,
    ViewModule,
    forwardRef(() => CommentModule),
    LikeModule,
  ],
  providers: [BoardArticleService, BoardArticleResolver],
  exports: [BoardArticleService],
})
export class BoardArticleModule {}
