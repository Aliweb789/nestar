import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import type { Types } from 'mongoose';
import { PropertyLocation, PropertyStatus, PropertyType } from '../../enums/property.enum';
import { Direction } from '../../enums/common.enum';
import { availableOptions, availablePropertySorts } from '../../config';

@InputType()
export class PropertyInput {
  @IsNotEmpty()
  @Field(() => PropertyType)
  propertyType: PropertyType;

  @IsNotEmpty()
  @Field(() => PropertyLocation)
  propertyLocation: PropertyLocation;

  @IsNotEmpty()
  @Length(3, 100)
  @Field(() => String)
  propertyAddress: string;

  @IsNotEmpty()
  @Length(3, 100)
  @Field(() => String)
  propertyTitle: string;

  @IsNotEmpty()
  @Min(0)
  @Field(() => Float)
  propertyPrice: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Float)
  propertySquare: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Field(() => Int)
  propertyBeds: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Field(() => Int)
  propertyRooms: number;

  @IsNotEmpty()
  @Field(() => [String])
  propertyImages: string[];

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

  memberId?: Types.ObjectId;
}

@InputType()
export class PriceRange {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
}

@InputType()
export class PeriodsRange {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
}

@InputType()
export class SquareRange {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
}

@InputType()
export class PISearch {
  @IsOptional()
  @Field(() => String, { nullable: true })
  memberId?: string;

  @IsOptional()
  @Field(() => [PropertyLocation], { nullable: true })
  locationList?: PropertyLocation[];

  @IsOptional()
  @Field(() => [PropertyType], { nullable: true })
  typeList?: PropertyType[];

  @IsOptional()
  @Field(() => [Int], { nullable: true })
  roomList?: number[];

  @IsOptional()
  @Field(() => [Int], { nullable: true })
  bedList?: number[];

  @IsOptional()
  @IsIn(availableOptions, { each: true })
  @Field(() => [String], { nullable: true })
  options?: string[];

  @IsOptional()
  @Field(() => PriceRange, { nullable: true })
  priceRange?: PriceRange;

  @IsOptional()
  @Field(() => PeriodsRange, { nullable: true })
  periodsRange?: PeriodsRange;

  @IsOptional()
  @Field(() => SquareRange, { nullable: true })
  squareRange?: SquareRange;

  @IsOptional()
  @Field(() => String, { nullable: true })
  text?: string;
}

@InputType()
export class PropertiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availablePropertySorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => PISearch)
  search: PISearch;
}

@InputType()
class APISearch {
  @IsOptional()
  @Field(() => PropertyStatus, { nullable: true })
  propertyStatus?: PropertyStatus;
}

@InputType()
export class AgentPropertiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availablePropertySorts)
  @Field(() => String, { nullable: true })
  sort?: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => APISearch)
  search: APISearch;
}
