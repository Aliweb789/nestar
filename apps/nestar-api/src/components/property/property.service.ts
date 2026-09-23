import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Properties, Property } from '../../libs/dto/property/property';
import { AgentPropertiesInquiry, AllPropertiesInquiry, OrdinaryInquiry, PropertiesInquiry, PropertyInput } from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import { lookupAuthMemberLiked, lookUpMember, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel('Property') private readonly propertyModel: Model<Property>,
    private readonly authService: AuthService,
    private readonly viewService: ViewService,
    private readonly memberService: MemberService,
    private readonly likeService: LikeService,
  ) { }

  public async createProperty(input: PropertyInput): Promise<Property> {
    try {
      const result = await this.propertyModel.create(input);
      await this.memberService.memberStatsEditor({
        _id: result.memberId,
        targetKey: 'memberProperties',
        modifier: 1,
      });
      return result;
    } catch (err: any) {
      console.log('Error, PropertyService.createProperty:', err.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }
  public async getProperty(memberId: Types.ObjectId | null, propertyId: Types.ObjectId): Promise<Property> {
    const search: T = {
      _id: propertyId,
      propertyStatus: PropertyStatus.ACTIVE,
    };

    const targetProperty: Property = await this.propertyModel.findOne(search).lean().exec();
    if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    if (memberId) {
      const viewInput = { memberId: memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
      const newView = await this.viewService.recordView(viewInput);
      if (newView) {
        await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
        targetProperty.propertyViews++;
      }
      // meLiked
      const likeInput = { memberId: memberId, likeRefId: propertyId, likeGroup: LikeGroup.PROPERTY }
      targetProperty.meLiked = await this.likeService.checkLikeExistance(likeInput)
    }

    targetProperty.memberData = await this.memberService.getMember(null, targetProperty.memberId);
    return targetProperty;
  }

  public async propertyStatsEditor(input: StatisticModifier): Promise<Property> {
    const { _id, targetKey, modifier } = input;
    return await this.propertyModel
      .findByIdAndUpdate(
        _id,
        { $inc: { [targetKey]: modifier } },
        {
          new: true,
        },
      )
      .exec();
  }

  public async updateProperty(input: PropertyUpdate, memberId: Types.ObjectId): Promise<Property> {
    const search: T = {
      _id: input._id,
      memberId,
      propertyStatus: PropertyStatus.ACTIVE,
    };

    if (input.propertyStatus === PropertyStatus.SOLD) input.soldAt = new Date();
    else if (input.propertyStatus === PropertyStatus.DELETE) input.deletedAt = new Date();

    const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (input.soldAt || input.deletedAt) {
      await this.memberService.memberStatsEditor({
        _id: memberId,
        targetKey: 'memberProperties',
        modifier: -1,
      });
    }

    return result;
  }

  public async getProperties(memberId: Types.ObjectId | null, input: PropertiesInquiry): Promise<Properties> {
    const match: T = { propertyStatus: PropertyStatus.ACTIVE };
    const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    //objectimiz referenci bor, uni return qilishimiz shart emas
    this.shapeMatchQuery(match, input);

    const result = await this.propertyModel.aggregate([
      { $match: match }, //list va metaCounterda yozish kerak edi lekin biz qisqartirib shunday bitta qilib yozdik(global)
      { $sort: sort }, //list arryi ichida bolishi kerak edi
      //[Property1.memberId, Property2.memberId]
      {
        $facet: {
          list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
            //meLiked
            lookupAuthMemberLiked(memberId),
            lookUpMember,
            { $unwind: '$memberData' },
          ],
          //[Property1[memberId], Property2[memberId]]
          metaCounter: [{ $count: 'total' }], //property hosil qilgan odamni memberDatasini qoshib qoyayapmiz
          //[Property1+memberData, Property2+memberData]
        },
      },
    ]).exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
    const {
      memberId,
      locationList,
      typeList,
      roomList,
      bedList,
      options,
      priceRange,
      periodsRange,
      squareRange,
      text,
    } = input.search;

    if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
    if (locationList && locationList?.length) match.propertyLocation = { $in: locationList };
    if (typeList && typeList?.length) match.propertyType = { $in: typeList };
    if (roomList && roomList?.length) match.propertyRooms = { $in: roomList };
    if (bedList && bedList?.length) match.propertyBeds = { $in: bedList };
    if (priceRange) match.propertyPrice = { $gte: priceRange.start, $lte: priceRange.end };
    if (periodsRange) {
      match.constructedAt = { $gte: periodsRange.start, $lte: periodsRange.end };
    }
    if (squareRange) match.propertySquare = { $gte: squareRange.start, $lte: squareRange.end };
    if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
    if (options?.length) match.$or = options.map((option) => ({ [option]: true }));
  }

  public async getFavorites(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Properties> {
    return this.likeService.getFavoriteProperties(memberId, input);
  }

  public async getVisited(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Properties> {
    return this.viewService.getVisited(memberId, input);
  }

  public async getAgentProperties(memberId: Types.ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
    const { propertyStatus } = input.search;
    if (propertyStatus === PropertyStatus.DELETE) {
      throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
    }

    const match: T = {
      memberId,
      propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
    };
    const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    const result = await this.propertyModel.aggregate([
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

  public async likeTargetProperty(memberId: Types.ObjectId, likeRefId: Types.ObjectId): Promise<Property> {
    const target: Property = await this.propertyModel.findOne({ _id: likeRefId, propertyStatus: PropertyStatus.ACTIVE }).exec()
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND)

    const input: LikeInput = {
      memberId: memberId,
      likeRefId: likeRefId,
      likeGroup: LikeGroup.PROPERTY
    }

    const modifier: number = await this.likeService.toggleLike(input)
    const result = await this.propertyStatsEditor({ _id: likeRefId, targetKey: "propertyLikes", modifier: modifier })
    if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG)
    return result
  }
  public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
    const { propertyStatus, propertyLocationList } = input.search;
    const match: T = {};
    const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    if (propertyStatus) match.propertyStatus = propertyStatus;
    if (propertyLocationList?.length) match.propertyLocation = { $in: propertyLocationList };

    const result = await this.propertyModel.aggregate([
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

  public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
    const search: T = {
      _id: input._id,
      propertyStatus: PropertyStatus.ACTIVE,
    };

    if (input.propertyStatus === PropertyStatus.SOLD) input.soldAt = new Date();
    else if (input.propertyStatus === PropertyStatus.DELETE) input.deletedAt = new Date();

    const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (input.soldAt || input.deletedAt) {
      await this.memberService.memberStatsEditor({
        _id: result.memberId,
        targetKey: 'memberProperties',
        modifier: -1,
      });
    }

    return result;
  }

  public async removePropertyByAdmin(propertyId: Types.ObjectId): Promise<Property> {
    const search: T = {
      _id: propertyId,
      propertyStatus: PropertyStatus.DELETE,
    };

    const result = await this.propertyModel.findOneAndDelete(search).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return result;
  }
}
