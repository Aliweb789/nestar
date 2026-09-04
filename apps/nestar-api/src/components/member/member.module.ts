import { Module } from '@nestjs/common';
import { MemberResolver } from './member.resolver';
import { MemberService } from './member.service';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { LikeModule } from '../like/like.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Member", schema: MemberSchema }]), //schema boglanish yozilmasa resolverda inject qilaolmaymiz
    AuthModule,
    ViewModule,
    LikeModule
  ],
  providers: [
    MemberResolver, // Member Controller
    MemberService],  // member Serviec Model
  exports: [MemberService]
})

export class MemberModule { }
