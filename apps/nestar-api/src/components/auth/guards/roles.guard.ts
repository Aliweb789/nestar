import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthService,
    ) { }

    async canActivate(context: ExecutionContext | any): Promise<boolean> {
        const roles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!roles) return true;
        if (context.contextType !== 'graphql') return false;

        const request = context.getArgByIndex(2).req;
        const bearerToken = request.headers.authorization;
        if (!bearerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

        const token = bearerToken.split(' ')[1];
        const authMember = await this.authService.verifyToken(token);
        const hasPermission = authMember && roles.includes(authMember.memberType);
        if (!hasPermission) throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);

        request.body.authMember = authMember;
        return true;
    }
}
