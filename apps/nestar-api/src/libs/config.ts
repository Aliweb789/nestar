import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import * as path from 'path';

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
export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];

export const availableOptions = ['propertyBarter', 'propertyRent'];
export const availablePropertySorts = [
    'createdAt',
    'updatedAt',
    'propertyViews',
    'propertyLikes',
    'propertyRank',
    'propertyPrice',
];

/** IMAGE CONFIGURATION */
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg', 'application/octet-stream'];
export const getSerialForImage = (filename: string) => {
    const ext = path.parse(filename).ext;
    return randomUUID() + ext;
};
export const shapeIntoMongoObjectId = (target: unknown): Types.ObjectId => {
    return typeof target === 'string' ? new Types.ObjectId(target) : target as Types.ObjectId;
};

export const lookUpMember = {
    $lookup: {
        from: 'members',
        localField: 'memberId',
        foreignField: '_id',
        as: 'memberData',
    },
};
