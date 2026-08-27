import { Types } from 'mongoose';

export const availableAgentSorts = ["createdAt", "updatedAt", "memberLikes", "memberViews", "memberRank"]

export const availableMemberSorts = [
    "createdAt",
    "updatedAt",
    "memberPoints",
    "memberProperties",
    "memberArticles",
    "memberFollowers",
    "memberFollowings",
    "memberLikes",
    "memberViews",
]

/** IMAGE CONFIGURATION */
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
    const ext = path.parse(filename).ext;
    return uuidv4() + ext;
};
export const shapeIntoMongoObjectId = (target: unknown): Types.ObjectId => {
    return typeof target === 'string' ? new Types.ObjectId(target) : target as Types.ObjectId;
};


