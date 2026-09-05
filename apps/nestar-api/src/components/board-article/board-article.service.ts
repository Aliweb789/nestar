import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { AllBoardArticlesInquiry, BoardArticleInput, BoardArticlesInquiry } from '../../libs/dto/board-article/board-article.input';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { lookupAuthMemberLiked, lookUpMember, shapeIntoMongoObjectId } from '../../libs/config';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';

@Injectable()
export class BoardArticleService {
  constructor(
    @InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
    private readonly viewService: ViewService,
    private readonly memberService: MemberService,
    private readonly likeService: LikeService,
  ) { }

  public async createBoardArticle(input: BoardArticleInput, memberId: Types.ObjectId): Promise<BoardArticle> {
    input.memberId = memberId;
    try {
      const result = await this.boardArticleModel.create(input);
      await this.memberService.memberStatsEditor({
        _id: memberId,
        targetKey: 'memberArticles',
        modifier: 1,
      });
      return result;
    } catch (err: any) {
      console.log('Error, BoardArticleService.createBoardArticle:', err.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }

  public async getBoardArticle(
    memberId: Types.ObjectId | null,
    articleId: Types.ObjectId,
  ): Promise<BoardArticle> {
    const search: T = { _id: articleId, articleStatus: BoardArticleStatus.ACTIVE };
    const targetBoardArticle = await this.boardArticleModel.findOne(search).lean().exec();
    if (!targetBoardArticle) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    if (memberId) {
      const newView = await this.viewService.recordView({
        memberId,
        viewRefId: articleId,
        viewGroup: ViewGroup.ARTICLE,
      });
      if (newView) {
        await this.boardArticleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
        targetBoardArticle.articleViews++;
      }
      const likeInput = { memberId: memberId, likeRefId: articleId, likeGroup: LikeGroup.ARTICLE }
      targetBoardArticle.meLiked = await this.likeService.checkLikeExistance(likeInput)
    }

    targetBoardArticle.memberData = await this.memberService.getMember(null, targetBoardArticle.memberId);
    return targetBoardArticle;
  }

  public async updateBoardArticle(
    input: BoardArticleUpdate,
    memberId: Types.ObjectId,
  ): Promise<BoardArticle> {
    const result = await this.boardArticleModel.findOneAndUpdate(
      { _id: input._id, memberId, articleStatus: BoardArticleStatus.ACTIVE },
      input,
      { new: true },
    ).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (input.articleStatus === BoardArticleStatus.DELETE) {
      await this.memberService.memberStatsEditor({
        _id: memberId,
        targetKey: 'memberArticles',
        modifier: -1,
      });
    }
    return result;
  }

  public async getBoardArticles(
    input: BoardArticlesInquiry,
    memberId: Types.ObjectId | null,
  ): Promise<BoardArticles> {
    const { articleCategory, text } = input.search;
    const match: T = { articleStatus: BoardArticleStatus.ACTIVE };
    const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    if (articleCategory) match.articleCategory = articleCategory;
    if (text) match.articleTitle = { $regex: new RegExp(text, 'i') };
    if (input.search.memberId) match.memberId = shapeIntoMongoObjectId(input.search.memberId);

    const result = await this.boardArticleModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
            lookupAuthMemberLiked(memberId),
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
  public async likeTargetBoardArticle(memberId: Types.ObjectId, likeRefId: Types.ObjectId): Promise<BoardArticle> {
    const target: BoardArticle = await this.boardArticleModel.findOne({ _id: likeRefId, articleStatus: BoardArticleStatus.ACTIVE }).exec()
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND)

    const input: LikeInput = {
      memberId: memberId,
      likeRefId: likeRefId,
      likeGroup: LikeGroup.ARTICLE
    }

    const modifier: number = await this.likeService.toggleLike(input)
    const result = await this.boardArticleStatsEditor({ _id: likeRefId, targetKey: "articleLikes", modifier: modifier })
    if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG)
    return result
  }

  public async getAllBoardArticlesByAdmin(input: AllBoardArticlesInquiry): Promise<BoardArticles> {
    const { articleCategory, articleStatus } = input.search;
    const match: T = {};
    const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    if (articleCategory) match.articleCategory = articleCategory;
    if (articleStatus) match.articleStatus = articleStatus;

    const result = await this.boardArticleModel.aggregate([
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

  public async updateBoardArticleByAdmin(input: BoardArticleUpdate): Promise<BoardArticle> {
    const result = await this.boardArticleModel.findOneAndUpdate(
      { _id: input._id, articleStatus: BoardArticleStatus.ACTIVE },
      input,
      { new: true },
    ).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (input.articleStatus === BoardArticleStatus.DELETE) {
      await this.memberService.memberStatsEditor({
        _id: result.memberId,
        targetKey: 'memberArticles',
        modifier: -1,
      });
    }
    return result;
  }

  public async removeBoardArticleByAdmin(articleId: Types.ObjectId): Promise<BoardArticle> {
    const result = await this.boardArticleModel.findOneAndDelete({
      _id: articleId,
      articleStatus: BoardArticleStatus.DELETE,
    }).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return result;
  }

  public async boardArticleStatsEditor(input: StatisticModifier): Promise<BoardArticle> {
    const { _id, targetKey, modifier } = input;
    const result = await this.boardArticleModel.findByIdAndUpdate(
      _id,
      { $inc: { [targetKey]: modifier } },
      { new: true },
    ).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
    return result;
  }
}
