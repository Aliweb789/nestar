import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Properties, Property } from '../../libs/dto/property/property';
import { AgentPropertiesInquiry, PropertiesInquiry, PropertyInput } from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import { lookUpMember, shapeIntoMongoObjectId } from '../../libs/config';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel('Property') private readonly propertyModel: Model<Property>,
    private readonly authService: AuthService,
    private readonly viewService: ViewService,
    private readonly memberService: MemberService,
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

    this.shapeMatchQuery(match, input);

    const result = await this.propertyModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          properties: [
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
    if (locationList?.length) match.propertyLocation = { $in: locationList };
    if (typeList?.length) match.propertyType = { $in: typeList };
    if (roomList?.length) match.propertyRooms = { $in: roomList };
    if (bedList?.length) match.propertyBeds = { $in: bedList };
    if (priceRange) match.propertyPrice = { $gte: priceRange.start, $lte: priceRange.end };
    if (periodsRange) {
      match.constructedAt = {
        $gte: new Date(`${periodsRange.start}-01-01T00:00:00.000Z`),
        $lte: new Date(`${periodsRange.end}-12-31T23:59:59.999Z`),
      };
    }
    if (squareRange) match.propertySquare = { $gte: squareRange.start, $lte: squareRange.end };
    if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
    if (options?.length) match.$or = options.map((option) => ({ [option]: true }));
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
          properties: [
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
}
