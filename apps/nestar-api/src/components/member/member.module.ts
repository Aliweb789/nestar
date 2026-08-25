import { Module } from '@nestjs/common';
import { MemberResolver } from './member.resolver';
import { MemberService } from './member.service';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Member", schema: MemberSchema }]), //schema boglanish yozilmasa resolverda inject qilaolmaymiz
    AuthModule,
  ],
  providers: [
    MemberResolver, // Member Controller
    MemberService]  // member Serviec Model
})

export class MemberModule { }
