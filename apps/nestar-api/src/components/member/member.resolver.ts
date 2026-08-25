import { Mutation, Resolver, Query, Args } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class MemberResolver {
    constructor(private readonly memberService: MemberService) { }
    @Mutation(() => Member)
    public async signup(@Args("input") input: MemberInput): Promise<Member> {
        console.log("Mutation: signup");
        return this.memberService.signup(input)

    }
    @Mutation(() => Member)
    public async login(@Args("input") input: LoginInput): Promise<Member> {
        console.log("Mutation: login");
        return this.memberService.login(input)
    }

    @Mutation(() => String)
    @UseGuards(AuthGuard)
    public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
        return `Hi ${memberNick}, you are authenticated!`
    }

    @Mutation(() => String)
    @Roles(MemberType.USER, MemberType.AGENT)
    @UseGuards(RolesGuard)
    public async checkAuthRoles(@AuthMember() authMember: Member): Promise<string> {
        return `Hi ${authMember.memberNick}, you are ${authMember.memberType}! (memberId: ${authMember._id})`
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Member)
    public async updateMember(
        @Args('input') input: MemberUpdate,
        @AuthMember('_id') memberId: ObjectId
    ): Promise<Member> {
        console.log("Mutation: updateMember");
        delete input._id
        return this.memberService.updateMember(memberId, input)
    }


    @Query(() => Member)
    public async getMember(@Args("memberId") input: string): Promise<Member> {
        console.log("Query: getMember")
        const targetId = shapeIntoMongoObjectId(input)
        //@ts-ignore
        return this.memberService.getMember(targetId)
    }

    /* Admin */

    @Mutation(() => String)
    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    public async getAllMembersByAdmin(): Promise<string> {
        return this.memberService.getAllMembersByAdmin()
    }

    @Mutation(() => String)
    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    public async updateMemberByAdmin(): Promise<string> {
        return this.memberService.updateMemberByAdmin()
    }
}
