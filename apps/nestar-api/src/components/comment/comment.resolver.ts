import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { CommentService } from './comment.service';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { Comment, Comments } from '../../libs/dto/comment/comment';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class CommentResolver {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(AuthGuard)
  @Mutation(() => Comment)
  public async createComment(
    @Args('input') input: CommentInput,
    @AuthMember('_id') memberId: Types.ObjectId,
  ): Promise<Comment> {
    console.log('Mutation: createComment');
    input.commentRefId = shapeIntoMongoObjectId(input.commentRefId);
    return this.commentService.createComment(input, memberId);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Comment)
  public async updateComment(
    @Args('input') input: CommentUpdate,
    @AuthMember('_id') memberId: Types.ObjectId,
  ): Promise<Comment> {
    console.log('Mutation: updateComment');
    input._id = shapeIntoMongoObjectId(input._id);
    return this.commentService.updateComment(memberId, input);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Comments)
  public async getComments(
    @Args('input') input: CommentsInquiry,
    @AuthMember('_id') memberId: Types.ObjectId | null,
  ): Promise<Comments> {
    console.log('Query: getComments');
    input.search.commentRefId = shapeIntoMongoObjectId(input.search.commentRefId);
    return this.commentService.getComments(memberId, input);
  }
}
