import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MemberService } from '../member/member.service';
import { PropertyService } from '../property/property.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { Comment, Comments } from '../../libs/dto/comment/comment';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { lookUpMember } from '../../libs/config';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel('Comment') private readonly commentModel: Model<Comment>,
    private readonly memberService: MemberService,
    private readonly boardArticleService: BoardArticleService,
    private readonly propertyService: PropertyService,
  ) {}

  public async createComment(input: CommentInput, memberId: Types.ObjectId): Promise<Comment> {
    input.memberId = memberId;

    let result: Comment;
    try {
      result = await this.commentModel.create(input);
    } catch (err: any) {
      console.log('Error, CommentService.createComment:', err.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }

    switch (input.commentGroup) {
      case CommentGroup.PROPERTY:
        await this.propertyService.propertyStatsEditor({
          _id: input.commentRefId,
          targetKey: 'propertyComments',
          modifier: 1,
        });
        break;
      case CommentGroup.ARTICLE:
        await this.boardArticleService.boardArticleStatsEditor({
          _id: input.commentRefId,
          targetKey: 'articleComments',
          modifier: 1,
        });
        break;
      case CommentGroup.MEMBER:
        await this.memberService.memberStatsEditor({
          _id: input.commentRefId,
          targetKey: 'memberComments',
          modifier: 1,
        });
        break;
    }

    return result;
  }

  public async updateComment(memberId: Types.ObjectId, input: CommentUpdate): Promise<Comment> {
    const result = await this.commentModel.findOneAndUpdate(
      { _id: input._id, memberId, commentStatus: CommentStatus.ACTIVE },
      input,
      { new: true },
    ).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
    return result;
  }

  public async getComments(
    memberId: Types.ObjectId | null,
    input: CommentsInquiry,
  ): Promise<Comments> {
    const match: T = {
      commentRefId: input.search.commentRefId,
      commentStatus: CommentStatus.ACTIVE,
    };
    const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    const result: Comments[] = await this.commentModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
            lookUpMember,
            { $unwind: '$memberData' },
          ],
          metaCounter: [{ $count: 'total' }],
        },
      },
    ]).exec();
    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  public async removeCommentByAdmin(commentId: Types.ObjectId): Promise<Comment> {
    const result = await this.commentModel.findByIdAndDelete(commentId).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return result;
  }
}
