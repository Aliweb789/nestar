import { Mutation, Resolver, Query, Args } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';

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
    public async updateMember(@AuthMember('_id') memberId: ObjectId): Promise<string> {
        console.log("Mutation: updateMember");
        console.log('memberId:', memberId);
        return this.memberService.updateMember()
    }

    @Mutation(() => String)
    @UseGuards(AuthGuard)
    public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
        return `Hi ${memberNick}, you are authenticated!`
    }
    @Query(() => String)
    public async getMember(): Promise<string> {
        return this.memberService.getMember()
    }

    /* Admin */

    @Mutation(() => String)
    public async getAllMembers(): Promise<string> {
        return this.memberService.getAllMembers()
    }

    @Mutation(() => String)
    public async updateMemberByAdmin(): Promise<string> {
        return this.memberService.updateMemberByAdmin()
    }
}
