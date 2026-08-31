import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { PropertyService } from './property.service';
import { Properties, Property } from '../../libs/dto/property/property';
import { AgentPropertiesInquiry, PropertiesInquiry, PropertyInput } from '../../libs/dto/property/property.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { PropertyUpdate } from '../../libs/dto/property/property.update';

@Resolver()
export class PropertyResolver {
  constructor(private readonly propertyService: PropertyService) { }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Mutation(() => Property)
  public async createProperty(
    @Args('input') input: PropertyInput,
    @AuthMember('_id') memberId: Types.ObjectId,
  ): Promise<Property> {
    console.log('Mutation: createProperty');
    input.memberId = memberId;
    return this.propertyService.createProperty(input);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Property)
  public async getProperty(
    @Args('propertyId') input: string,
    @AuthMember('_id') memberId: Types.ObjectId | null,
  ): Promise<Property> {
    console.log('Query: getProperty');
    const propertyId = shapeIntoMongoObjectId(input);
    return this.propertyService.getProperty(memberId, propertyId);
  }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Mutation(() => Property)
  public async updateProperty(
    @Args('input') input: PropertyUpdate,
    @AuthMember('_id') memberId: Types.ObjectId,
  ): Promise<Property> {
    console.log('Mutation: updateProperty');
    input._id = shapeIntoMongoObjectId(input._id);
    return this.propertyService.updateProperty(input, memberId);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Properties)
  public async getProperties(
    @Args('input') input: PropertiesInquiry,
    @AuthMember('_id') memberId: Types.ObjectId | null,
  ): Promise<Properties> {
    console.log('Query: getProperties');
    return this.propertyService.getProperties(memberId, input);
  }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Query(() => Properties)
  public async getAgentProperties(
    @Args('input') input: AgentPropertiesInquiry,
    @AuthMember('_id') memberId: Types.ObjectId,
  ): Promise<Properties> {
    console.log('Query: getAgentProperties');
    return this.propertyService.getAgentProperties(memberId, input);
  }
}
