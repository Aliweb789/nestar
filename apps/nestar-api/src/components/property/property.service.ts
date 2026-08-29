import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Property } from '../../libs/dto/property/property';
import { PropertyInput } from '../../libs/dto/property/property.input';
import { Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel('Property') private readonly propertyModel: Model<Property>,
    private readonly authService: AuthService,
    private readonly viewService: ViewService,
    private readonly memberService: MemberService,
  ) {}

  public async createProperty(input: PropertyInput): Promise<Property> {
    try {
      const result = await this.propertyModel.create(input);
      await this.memberService.memberStatsEditor({
        _id: result.memberId,
        targetKey: 'memberProperties',
        modifier: 1,
      });
      return result;
    } catch (err: any) {
      console.log('Error, PropertyService.createProperty:', err.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }
}
