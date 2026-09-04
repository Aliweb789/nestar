import { Mutation, Resolver, Query, Args } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { BadRequestException, InternalServerErrorException, UnsupportedMediaTypeException, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { getSerialForImage, shapeIntoMongoObjectId, validMimeTypes } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { createWriteStream } from 'fs';
import { Message } from '../../libs/enums/common.enum';

@Resolver()
export class MemberResolver {
    constructor(private readonly memberService: MemberService) { } //dependency injection --> hamma narsani ozi bilan olib keladi
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
        @AuthMember('_id') memberId: Types.ObjectId
    ): Promise<Member> {
        console.log("Mutation: updateMember");
        delete input._id
        return this.memberService.updateMember(memberId, input)
    }

    @UseGuards(WithoutGuard)
    @Query(() => Member)
    public async getMember(@Args("memberId") input: string, @AuthMember('_id') memberId: Types.ObjectId | null): Promise<Member> {
        console.log("Query: getMember")
        const targetId = shapeIntoMongoObjectId(input)
        return this.memberService.getMember(memberId, targetId)
    }

    @UseGuards(WithoutGuard)
    @Query(() => Members)
    public async getAgents(@Args('input') input: AgentsInquiry, @AuthMember('_id') memberId: Types.ObjectId | null): Promise<Members> {
        console.log("Query: getAgents")
        return this.memberService.getAgents(memberId, input)
    }

    /* Admin */

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Query(() => Members)
    public async getAllMembersByAdmin(@Args('input') input: MembersInquiry): Promise<Members> {
        console.log('Query: getAllMembersByAdmin')
        return this.memberService.getAllMembersByAdmin(input)
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Member)
    public async updateMemberByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
        console.log('Mutation: updateMemberByAdmin')
        return this.memberService.updateMemberByAdmin(input)
    }


    /**IMAGE UPLOADER */

    @UseGuards(AuthGuard)
    @Mutation((returns) => String)
    public async imageUploader(
        @Args({ name: 'file', type: () => GraphQLUpload })
        { createReadStream, filename, mimetype }: FileUpload,
        @Args('target') target: String, //qaysi manzilga joylash kerak
    ): Promise<string> {
        console.log('Mutation: imageUploader');
        console.log('filename:', filename);
        console.log('mimetype:', mimetype);
        console.log('validMimeTypes:', validMimeTypes);

        if (!filename) throw new BadRequestException(Message.UPLOAD_FAILED);
        const validMime = validMimeTypes.includes(mimetype);
        if (!validMime) throw new UnsupportedMediaTypeException(Message.PROVIDE_ALLOWED_FORMAT);

        const imageName = getSerialForImage(filename);
        const url = `uploads/${target}/${imageName}`;
        const stream = createReadStream();

        const result = await new Promise((resolve, reject) => {
            stream
                .pipe(createWriteStream(url))
                .on('finish', async () => resolve(true))
                .on('error', () => reject(false));
        });
        if (!result) throw new InternalServerErrorException(Message.UPLOAD_FAILED);

        return url;
    }

    @UseGuards(AuthGuard)
    @Mutation((returns) => [String])
    public async imagesUploader(
        @Args('files', { type: () => [GraphQLUpload] })
        files: Promise<FileUpload>[],
        @Args('target') target: String,
    ): Promise<string[]> {
        console.log('Mutation: imagesUploader');

        const uploadedImages = [];
        const promisedList = files.map(async (img: Promise<FileUpload>, index: number): Promise<Promise<void>> => {
            try {
                const { filename, mimetype, encoding, createReadStream } = await img;

                const validMime = validMimeTypes.includes(mimetype);
                if (!validMime) throw new UnsupportedMediaTypeException(Message.PROVIDE_ALLOWED_FORMAT);

                const imageName = getSerialForImage(filename);
                const url = `uploads/${target}/${imageName}`;
                const stream = createReadStream();

                const result = await new Promise((resolve, reject) => {
                    stream
                        .pipe(createWriteStream(url))
                        .on('finish', () => resolve(true))
                        .on('error', () => reject(false));
                });
                if (!result) throw new InternalServerErrorException(Message.UPLOAD_FAILED);

                uploadedImages[index] = url;
            } catch (err) {
                console.log('Error, file missing!');
            }
        });

        await Promise.all(promisedList);
        return uploadedImages;
    }
}
