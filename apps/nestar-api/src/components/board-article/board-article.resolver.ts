import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { BoardArticleService } from './board-article.service';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { AllBoardArticlesInquiry, BoardArticleInput, BoardArticlesInquiry } from '../../libs/dto/board-article/board-article.input';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class BoardArticleResolver {
  constructor(private readonly boardArticleService: BoardArticleService) { }

  @UseGuards(AuthGuard)
  @Mutation(() => BoardArticle)
  public async createBoardArticle(
    @Args('input') input: BoardArticleInput,
    @AuthMember('_id') memberId: Types.ObjectId,
  ): Promise<BoardArticle> {
    console.log('Mutation: createBoardArticle');
    return this.boardArticleService.createBoardArticle(input, memberId);
  }

  @UseGuards(WithoutGuard)
  @Query(() => BoardArticle)
  public async getBoardArticle(
    @Args('articleId') input: string,
    @AuthMember('_id') memberId: Types.ObjectId | null,
  ): Promise<BoardArticle> {
    console.log('Query: getBoardArticle');
    const articleId = shapeIntoMongoObjectId(input);
    return this.boardArticleService.getBoardArticle(memberId, articleId);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => BoardArticle)
  public async updateBoardArticle(
    @Args('input') input: BoardArticleUpdate,
    @AuthMember('_id') memberId: Types.ObjectId,
  ): Promise<BoardArticle> {
    console.log('Mutation: updateBoardArticle');
    input._id = shapeIntoMongoObjectId(input._id);
    return this.boardArticleService.updateBoardArticle(input, memberId);
  }

  @UseGuards(WithoutGuard)
  @Query(() => BoardArticles)
  public async getBoardArticles(
    @Args('input') input: BoardArticlesInquiry,
    @AuthMember('_id') memberId: Types.ObjectId | null,
  ): Promise<BoardArticles> {
    console.log('Query: getBoardArticles');
    return this.boardArticleService.getBoardArticles(input, memberId);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => BoardArticle)
  public async likeTargetBoardArticle(@Args("articleId") input: string, @AuthMember('_id') memberId: Types.ObjectId): Promise<BoardArticle> {
    console.log("Mutation: likeTargetBoardArticle")
    const likeRefId = shapeIntoMongoObjectId(input)
    return await this.boardArticleService.likeTargetBoardArticle(memberId, likeRefId)
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => BoardArticles)
  public async getAllBoardArticlesByAdmin(
    @Args('input') input: AllBoardArticlesInquiry,
  ): Promise<BoardArticles> {
    console.log('Query: getAllBoardArticlesByAdmin');
    return this.boardArticleService.getAllBoardArticlesByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => BoardArticle)
  public async updateBoardArticleByAdmin(
    @Args('input') input: BoardArticleUpdate,
  ): Promise<BoardArticle> {
    console.log('Mutation: updateBoardArticleByAdmin');
    input._id = shapeIntoMongoObjectId(input._id);
    return this.boardArticleService.updateBoardArticleByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => BoardArticle)
  public async removeBoardArticleByAdmin(
    @Args('articleId') input: string,
  ): Promise<BoardArticle> {
    console.log('Mutation: removeBoardArticleByAdmin');
    const articleId = shapeIntoMongoObjectId(input);
    return this.boardArticleService.removeBoardArticleByAdmin(articleId);
  }
}
