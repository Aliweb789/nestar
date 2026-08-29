import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import type { Types } from 'mongoose';
import { PropertyLocation, PropertyType } from '../../enums/property.enum';

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
