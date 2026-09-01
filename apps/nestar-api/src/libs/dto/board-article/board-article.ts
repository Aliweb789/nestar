import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import { BoardArticleCategory, BoardArticleStatus } from '../../enums/board-article.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class BoardArticle {
  @Field(() => String)
  _id: Types.ObjectId;

  @Field(() => BoardArticleCategory)
  articleCategory: BoardArticleCategory;

  @Field(() => BoardArticleStatus)
  articleStatus: BoardArticleStatus;

  @Field(() => String)
  articleTitle: string;

  @Field(() => String)
  articleContent: string;

  @Field(() => String, { nullable: true })
  articleImage?: string;

  @Field(() => Int)
  articleViews: number;

  @Field(() => Int)
  articleLikes: number;

  @Field(() => Int)
  articleComments: number;

  @Field(() => String)
  memberId: Types.ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Member, { nullable: true })
  memberData?: Member;
}

@ObjectType()
export class BoardArticles {
  @Field(() => [BoardArticle])
  list: BoardArticle[];

  @Field(() => [TotalCounter], { nullable: true })
  metaCounter: TotalCounter[];
}
