import { Types } from 'mongoose';

export const shapeIntoMongoObjectId = (target: unknown): Types.ObjectId => {
    return typeof target === 'string' ? new Types.ObjectId(target) : target as Types.ObjectId;
};


export const availableAgentSorts = ["createdAt", "updatedAt", "memberLikes", "memberViews", "memberRank"]