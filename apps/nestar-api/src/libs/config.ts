import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import * as path from 'path';
import { T } from './types/common';
import { pipeline } from 'stream';

export const availableAgentSorts = ['createdAt', 'updatedAt', 'memberRank', 'memberPoints', 'memberProperties', 'memberArticles', 'memberFollowers', 'memberFollowings', 'memberLikes', 'memberViews'];
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberPoints', 'memberProperties', 'memberArticles', 'memberFollowers', 'memberFollowings', 'memberLikes', 'memberViews'];
export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
export const availableCommentSorts = ['createdAt', 'updatedAt'];
export const availablePropertySorts = [
    'createdAt',
    'updatedAt',
    'propertyViews',
    'propertyLikes',
    'propertyRank',
    'propertyPrice',
];
export const availableOptions = ['propertyBarter', 'propertyRent'];


// IMAGE CONFIGURATION
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg', 'application/octet-stream'];
export const getSerialForImage = (filename: string) => {
    const ext = path.parse(filename).ext;
    return randomUUID() + ext;
};

export const shapeIntoMongoObjectId = (target: string | Types.ObjectId): Types.ObjectId => {
    return typeof target === 'string' ? new Types.ObjectId(target) : target;
};

export const lookupAuthMemberLiked = (memberId: T, targetRefId: string = '$_id') => {
    return {
        $lookup: {
            from: 'likes',
            let: { //local variables
                localLikeRefId: targetRefId,
                localMemberId: memberId,
                localMyFavorite: true, //ozimiz uchun bir qiymat
            },
            pipeline: [
                {
                    $match: {
                        $expr: { //bir nechta narsani match qilmoqchimiz
                            $and: [
                                { $eq: ['$likeRefId', '$$localLikeRefId'] }, // $ - schema field, $$ - local variable
                                { $eq: ['$memberId', '$$localMemberId'] },
                            ],
                        },
                    },
                },
                {
                    $project: {
                        _id: 0, //idni olib bermaslik uchun(default 1)
                        memberId: 1,
                        likeRefId: 1,
                        myFavorite: '$$localMyFavorite',
                    },
                },
            ], //pipeline hosil boldi
            as: 'meLiked', //qanday nom bilan saqlash(property.ts da meLiked qilganmiz)
        },
    };
};

interface LookupAuthMemberFollowed { //interface hosil qilamiz
    followerId: T;
    followingId: string;
}

export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
    const { followerId, followingId } = input;
    return {
        $lookup: {
            from: 'follows',
            let: {
                localFollowerId: followerId,
                localFollowingId: followingId, //"$followingId"
                localMyFollows: true,
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ['$followerId', '$$localFollowerId'] },
                                { $eq: ['$followingId', '$$localFollowingId'] },
                            ],
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        followerId: 1, //DTO nomi bilan bir hil(follow.ts)
                        followingId: 1,
                        myFollowing: '$$localMyFollows',
                    },
                },
            ],
            as: 'meFollowed',
        },
    };
};


export const lookUpMember = {
    $lookup: {
        from: 'members',
        localField: 'memberId',
        foreignField: '_id',
        as: 'memberData',
    },
}

export const lookupFollowingData = {
    $lookup: {
        from: 'members',
        localField: 'followingId',
        foreignField: '_id',
        as: 'followingData',
    },
};

export const lookupFollowerData = {
    $lookup: {
        from: 'members',
        localField: 'followerId',
        foreignField: '_id',
        as: 'followerData',
    }
}

export const lookupFavorite = {
    $lookup: {
        from: 'members',
        localField: 'favoriteProperty.memberId',
        foreignField: '_id',
        as: 'favoriteProperty.memberData',
    }
}

export const lookupVisit = {
    $lookup: {
        from: 'members',
        localField: 'visitedProperty.memberId',
        foreignField: '_id',
        as: 'visitedProperty.memberData',
    }
}
