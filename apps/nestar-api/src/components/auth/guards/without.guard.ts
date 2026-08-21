import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class WithoutGuard implements CanActivate {
    constructor(private readonly authService: AuthService) { }

    async canActivate(context: ExecutionContext | any): Promise<boolean> {
        if (context.contextType !== 'graphql') return false;

        const request = context.getArgByIndex(2).req;
        const bearerToken = request.headers.authorization;

        if (bearerToken) {
            try {
                const token = bearerToken.split(' ')[1];
                request.body.authMember = await this.authService.verifyToken(token);
            } catch {
                request.body.authMember = null;
            }
        } else {
            request.body.authMember = null;
        }

        return true;
    }
}
