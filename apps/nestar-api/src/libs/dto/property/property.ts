import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import { PropertyLocation, PropertyStatus, PropertyType } from '../../enums/property.enum';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';

@ObjectType()
export class Property {
  @Field(() => String)
  _id: Types.ObjectId;

  @Field(() => PropertyType)
  propertyType: PropertyType;

  @Field(() => PropertyStatus)
  propertyStatus: PropertyStatus;

  @Field(() => PropertyLocation)
  propertyLocation: PropertyLocation;

  @Field(() => String)
  propertyAddress: string;

  @Field(() => String)
  propertyTitle: string;

  @Field(() => Float)
  propertyPrice: number;

  @Field(() => Float)
  propertySquare: number;

  @Field(() => Int)
  propertyBeds: number;

  @Field(() => Int)
  propertyRooms: number;

  @Field(() => Int)
  propertyViews: number;

  @Field(() => Int)
  propertyLikes: number;

  @Field(() => Int)
  propertyComments: number;

  @Field(() => Int)
  propertyRank: number;

  @Field(() => [String])
  propertyImages: string[];

  @Field(() => String, { nullable: true })
  propertyDesc?: string;

  @Field(() => Boolean)
  propertyBarter: boolean;

  @Field(() => Boolean)
  propertyRent: boolean;

  @Field(() => String)
  memberId: Types.ObjectId;

  @Field(() => Date, { nullable: true })
  soldAt?: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;

  @Field(() => Date, { nullable: true })
  constructedAt?: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /** from aggregation **/
  @Field(() => [MeLiked], { nullable: true })
  meLiked?: MeLiked[]

  @Field(() => Member, { nullable: true })
  memberData?: Member;

}

@ObjectType()
export class Properties {
  @Field(() => [Property])
  list: Property[];

  @Field(() => [TotalCounter], { nullable: true })
  metaCounter?: TotalCounter[];
}
