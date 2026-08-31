import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import type { Types } from 'mongoose';
import { PropertyLocation, PropertyStatus, PropertyType } from '../../enums/property.enum';

@InputType()
export class PropertyUpdate {
  @IsNotEmpty()
  @Field(() => String)
  _id: Types.ObjectId;

  @IsOptional()
  @Field(() => PropertyType, { nullable: true })
  propertyType?: PropertyType;

  @IsOptional()
  @Field(() => PropertyStatus, { nullable: true })
  propertyStatus?: PropertyStatus;

  @IsOptional()
  @Field(() => PropertyLocation, { nullable: true })
  propertyLocation?: PropertyLocation;

  @IsOptional()
  @Length(3, 100)
  @Field(() => String, { nullable: true })
  propertyAddress?: string;

  @IsOptional()
  @Length(3, 100)
  @Field(() => String, { nullable: true })
  propertyTitle?: string;

  @IsOptional()
  @Min(0)
  @Field(() => Float, { nullable: true })
  propertyPrice?: number;

  @IsOptional()
  @Min(1)
  @Field(() => Float, { nullable: true })
  propertySquare?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  propertyBeds?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Int, { nullable: true })
  propertyRooms?: number;

  @IsOptional()
  @Field(() => [String], { nullable: true })
  propertyImages?: string[];

  @IsOptional()
  @Length(5, 500)
  @Field(() => String, { nullable: true })
  propertyDesc?: string;

  @IsOptional()
  @Field(() => Boolean, { nullable: true })
  propertyBarter?: boolean;

  @IsOptional()
  @Field(() => Boolean, { nullable: true })
  propertyRent?: boolean;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  constructedAt?: Date;

  deletedAt?: Date;
  soldAt?: Date;
}
