# Claude Lesson Brief: Nestar Member Authentication, Authorization, and GraphQL APIs

## Instructions for Claude

Use this document to teach me an interactive programming lesson in English. I am learning NestJS, GraphQL, MongoDB/Mongoose, JWT, guards, decorators, and service-layer architecture from a course project.

Teach one chapter at a time. For every chapter:

1. Begin with the purpose of the feature in plain English.
2. Explain the request lifecycle from the GraphQL client to MongoDB and back.
3. Explain every important decorator, parameter, type, and database operation.
4. Use short excerpts based on the project described below.
5. Show a working GraphQL Playground/Postman example.
6. Ask me two or three comprehension questions before moving on.
7. Give me one small coding exercise, but do not reveal the answer until I attempt it.
8. Point out security risks and implementation weaknesses separately from explaining what the course code currently does.
9. Do not rewrite the whole application for me. Help me reason about it and write changes myself.
10. When I answer incorrectly, explain why with a concrete execution trace.

Assume I understand basic JavaScript and TypeScript but am still learning NestJS architecture.

## Lesson title

Authentication and Authorization with Guards and Custom Decorators; Developing UpdateMember, GetMember, GetAgents, GetAllMembersByAdmin, and UpdateMemberByAdmin GraphQL APIs

## Learning objectives

By the end of the lesson, I should be able to:

- Distinguish authentication from authorization.
- Explain how a JWT moves from login to an authenticated GraphQL request.
- Explain the purpose of `AuthGuard`, `RolesGuard`, and `WithoutGuard`.
- Explain how `@Roles()` stores metadata and how `RolesGuard` reads it.
- Explain how `@AuthMember()` reads the decoded member from the request.
- Trace `updateMember` from resolver to Mongoose and back.
- Explain why a member ID should come from the authenticated token for self-updates.
- Trace `getMember`, including optional authentication and view recording.
- Build a MongoDB aggregation pipeline with `$match`, `$sort`, `$facet`, `$skip`, `$limit`, and `$count`.
- Explain the difference between `getAgents` and `getAllMembersByAdmin`.
- Explain why admin endpoints require both `@Roles(MemberType.ADMIN)` and `RolesGuard`.
- Explain GraphQL input DTOs, output DTOs, validation decorators, pagination, filtering, and sorting.
- Test every API in GraphQL Playground or Postman.

---

# 1. Project architecture

The application follows this general dependency flow:

```text
GraphQL client
    -> Resolver
    -> Guard (when attached)
    -> Custom parameter decorator
    -> Service
    -> Mongoose model / another service
    -> MongoDB
    -> Service result
    -> Resolver
    -> GraphQL response
```

Important files:

```text
apps/nestar-api/src/components/member/member.resolver.ts
apps/nestar-api/src/components/member/member.service.ts
apps/nestar-api/src/components/auth/auth.service.ts
apps/nestar-api/src/components/auth/guards/auth.guard.ts
apps/nestar-api/src/components/auth/guards/roles.guard.ts
apps/nestar-api/src/components/auth/guards/without.guard.ts
apps/nestar-api/src/components/auth/decorators/authMember.decorator.ts
apps/nestar-api/src/components/auth/decorators/roles.decorator.ts
apps/nestar-api/src/components/view/view.service.ts
apps/nestar-api/src/libs/dto/member/member.input.ts
apps/nestar-api/src/libs/dto/member/member.update.ts
apps/nestar-api/src/libs/dto/member/member.ts
apps/nestar-api/src/schemas/Member.model.ts
apps/nestar-api/src/schemas/View.model.ts
```

The resolver is the GraphQL entry point. The service contains business logic. DTO classes define GraphQL input/output and validation. Mongoose models communicate with MongoDB. Guards decide whether a resolver may execute.

---

# 2. Authentication versus authorization

Authentication answers:

> Who is making this request, and is the token valid?

Authorization answers:

> Is this authenticated member allowed to perform this operation?

Examples in this project:

- `AuthGuard` performs authentication.
- `RolesGuard` performs authentication and role authorization.
- `WithoutGuard` performs optional authentication.
- `@Roles(MemberType.ADMIN)` declares the roles allowed to call a resolver.
- `@AuthMember()` provides the decoded member to a resolver parameter.

## JWT creation during login

The member logs in with a nickname and password. After checking the bcrypt password, `AuthService.createToken()` copies the member into a JWT payload, removes `memberPassword`, and signs the payload.

Conceptual code:

```ts
public async createToken(member: Member): Promise<string> {
  const memberObject = member['_doc'] ?? member;
  const payload = { ...memberObject };
  delete payload.memberPassword;
  return this.jwtService.signAsync(payload);
}
```

The client receives `accessToken` and sends it on later requests:

```http
Authorization: Bearer <accessToken>
```

Important lesson questions:

- Why must `memberPassword` be removed from the token?
- Why does signing a JWT not encrypt its payload?
- What information should and should not be stored in a JWT?

---

# 3. AuthGuard

`AuthGuard` protects resolvers that require a logged-in member.

Current behavior:

```text
Read the GraphQL request
    -> Read Authorization header
    -> Throw if missing
    -> Split "Bearer token"
    -> Verify JWT
    -> Store decoded member in request.body.authMember
    -> Return true
    -> Resolver may execute
```

Essential code shape:

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext | any): Promise<boolean> {
    const request = context.getArgByIndex(2).req;
    const bearerToken = request.headers.authorization;

    if (!bearerToken) {
      throw new BadRequestException(Message.TOKEN_NOT_EXIST);
    }

    const token = bearerToken.split(' ')[1];
    const authMember = await this.authService.verifyToken(token);

    if (!authMember) {
      throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
    }

    request.body.authMember = authMember;
    return true;
  }
}
```

Resolver usage:

```ts
@UseGuards(AuthGuard)
@Mutation(() => String)
public async checkAuth(
  @AuthMember('memberNick') memberNick: string,
): Promise<string> {
  return `Hi ${memberNick}, you are authenticated!`;
}
```

GraphQL request:

```graphql
mutation CheckAuth {
  checkAuth
}
```

Headers:

```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

Discuss these risks:

- The code must validate that the header really has the `Bearer <token>` form.
- Invalid or expired JWT exceptions should become an authentication error, not a generic server error.
- JWT member status and role can become stale if the database changes after token creation.

---

# 4. The `@AuthMember()` custom decorator

The guard writes the decoded member here:

```ts
request.body.authMember = authMember;
```

The custom decorator reads it:

```ts
export const AuthMember = createParamDecorator(
  (data: string, context: ExecutionContext | any) => {
    const request = context.getArgByIndex(2).req;
    const member = request.body.authMember;
    return member ? (data ? member[data] : member) : null;
  },
);
```

Usage differences:

```ts
@AuthMember() authMember: Member
```

Returns the entire decoded member.

```ts
@AuthMember('_id') memberId: ObjectId
```

Returns only the member ID.

```ts
@AuthMember('memberNick') memberNick: string
```

Returns only the nickname.

Teach why a parameter decorator is preferable to repeatedly reading `request.body.authMember` inside every resolver.

---

# 5. Roles decorator and RolesGuard

The custom roles decorator stores metadata on a resolver:

```ts
export const Roles = (...roles: string[]) =>
  SetMetadata('roles', roles);
```

Example:

```ts
@Roles(MemberType.USER, MemberType.AGENT)
```

The resulting metadata conceptually looks like:

```ts
{
  roles: ['USER', 'AGENT']
}
```

`RolesGuard` reads the metadata using Nest's `Reflector`:

```ts
const roles = this.reflector.get<string[]>(
  'roles',
  context.getHandler(),
);
```

It verifies the JWT and checks:

```ts
const hasPermission = roles.includes(authMember.memberType);
```

Admin endpoint example:

```ts
@Roles(MemberType.ADMIN)
@UseGuards(RolesGuard)
@Query(() => Members)
public async getAllMembersByAdmin(
  @Args('input') input: MembersInquiry,
): Promise<Members> {
  return this.memberService.getAllMembersByAdmin(input);
}
```

Explain the distinction:

```text
@Roles(...)
```

only declares metadata. It does not block anything by itself.

```text
@UseGuards(RolesGuard)
```

actually runs the permission check.

---

# 6. WithoutGuard and optional authentication

`WithoutGuard` allows public access but extracts the member when a valid token exists.

Behavior:

```text
No Authorization header -> authMember = null -> allow request
Valid token             -> authMember = decoded member -> allow request
Invalid token           -> authMember = null -> allow request
```

This is useful for `getMember` and `getAgents`, which are public queries but may perform personalized behavior for logged-in members.

Example:

```ts
@UseGuards(WithoutGuard)
@Query(() => Member)
public async getMember(
  @Args('memberId') targetId: string,
  @AuthMember('_id') memberId: ObjectId,
): Promise<Member> {
  // memberId is null for a guest.
}
```

Ask the student why using `AuthGuard` here would prevent guests from viewing public profiles.

---

# 7. UpdateMember GraphQL API

Purpose: allow an authenticated member to update their own profile.

## Resolver flow

```ts
@UseGuards(AuthGuard)
@Mutation(() => Member)
public async updateMember(
  @Args('input') input: MemberUpdate,
  @AuthMember('_id') memberId: ObjectId,
): Promise<Member> {
  delete input._id;
  return this.memberService.updateMember(memberId, input);
}
```

Execution trace:

```text
Client sends mutation and JWT
    -> AuthGuard verifies JWT
    -> AuthGuard stores authMember
    -> @AuthMember('_id') extracts authenticated member ID
    -> Resolver removes client-provided _id
    -> Service updates only the authenticated member
    -> Updated member is returned
```

## Service flow

```ts
const result = await this.memberModel.findOneAndUpdate(
  {
    _id: memberId,
    memberStatus: MemberStatus.ACTIVE,
  },
  input,
  { new: true },
);
```

Explain each part:

- `_id: memberId`: update the authenticated member.
- `memberStatus: ACTIVE`: do not update blocked or deleted members.
- `input`: MongoDB update fields.
- `{ new: true }`: return the document after the update.

After updating, the service creates a new JWT because profile data stored in the old token may be outdated.

Example mutation:

```graphql
mutation UpdateMember {
  updateMember(
    input: {
      _id: "IGNORED_BY_SELF_UPDATE"
      memberNick: "newNickname"
      memberFullName: "New Full Name"
      memberAddress: "Seoul"
    }
  ) {
    _id
    memberNick
    memberFullName
    memberAddress
    accessToken
  }
}
```

Security discussion:

- A self-update DTO should ideally not contain `_id` at all.
- A normal member should not be able to change `memberType` or `memberStatus`.
- A changed password must be hashed before saving.
- Admin updates should use a separate input type from self-updates.

---

# 8. GetMember GraphQL API and view recording

Purpose: fetch one member profile. Guests can view it, while authenticated viewers may create a view record.

Resolver responsibilities:

```ts
const targetId = shapeIntoMongoObjectId(input);
return this.memberService.getMember(memberId, targetId);
```

Why convert the ID? GraphQL sends an ID as a string, but MongoDB queries use an `ObjectId` value.

Service search:

```ts
const search = {
  _id: targetId,
  memberStatus: {
    $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK],
  },
};
```

If the viewer is authenticated:

```ts
const viewInput = {
  memberId,
  viewRefId: targetId,
  viewGroup: ViewGroup.MEMBER,
};

const newView = await this.viewService.recordView(viewInput);
```

`ViewService` checks whether this viewer-target combination already exists. If not, it creates a view document. A compound unique index also prevents duplicate views:

```ts
ViewSchema.index(
  { memberId: 1, viewRefId: 1 },
  { unique: true },
);
```

When a new view is inserted, the service increments:

```ts
{ $inc: { memberViews: 1 } }
```

Example query:

```graphql
query GetMember {
  getMember(memberId: "MEMBER_OBJECT_ID") {
    _id
    memberNick
    memberType
    memberStatus
    memberViews
    memberImage
    memberDesc
  }
}
```

Run once without an Authorization header and once with a valid token. Compare the view-recording behavior.

---

# 9. GetAgents GraphQL API

Purpose: return active agents with search, sorting, pagination, and a total counter.

Input shape:

```ts
class AgentsInquiry {
  page: number;
  limit: number;
  sort?: string;
  direction?: Direction;
  search: {
    text?: string;
  };
}
```

The service creates a dynamic MongoDB match:

```ts
const match = {
  memberType: MemberType.AGENT,
  memberStatus: MemberStatus.ACTIVE,
};

if (text) {
  match.memberNick = {
    $regex: new RegExp(text, 'i'),
  };
}
```

Case-insensitive regular expression example:

```text
text = "mar"
```

can match `Martin`, `MARIA`, or `Omar`.

Dynamic sorting:

```ts
const sort = {
  [input.sort ?? 'createdAt']:
    input.direction ?? Direction.DESC,
};
```

Aggregation pipeline:

```ts
[
  { $match: match },
  { $sort: sort },
  {
    $facet: {
      list: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ],
      metaCounter: [
        { $count: 'total' },
      ],
    },
  },
]
```

Explain `$facet`: it runs multiple sub-pipelines over the same matched documents. `list` returns the requested page, while `metaCounter` counts all matched documents before pagination.

Pagination example:

```text
page = 3
limit = 10
skip = (3 - 1) * 10 = 20
```

Example query:

```graphql
query GetAgents {
  getAgents(
    input: {
      page: 1
      limit: 10
      sort: "memberRank"
      direction: DESC
      search: { text: "" }
    }
  ) {
    list {
      _id
      memberNick
      memberType
      memberRank
      memberLikes
      memberViews
    }
    metaCounter {
      total
    }
  }
}
```

---

# 10. GetAllMembersByAdmin GraphQL API

Purpose: allow an administrator to retrieve all members with pagination and optional filters.

Protection:

```ts
@Roles(MemberType.ADMIN)
@UseGuards(RolesGuard)
@Query(() => Members)
```

`MembersInquiry.search` supports:

```ts
memberStatus?: MemberStatus;
memberType?: MemberType;
text?: string;
```

Dynamic match construction:

```ts
const match = {};

if (memberStatus) {
  match.memberStatus = memberStatus;
}

if (memberType) {
  match.memberType = memberType;
}

if (text) {
  match.memberNick = {
    $regex: new RegExp(text, 'i'),
  };
}
```

This is different from `getAgents`: `getAgents` always forces `memberType: AGENT` and `memberStatus: ACTIVE`; the admin query allows filters or can return every type/status.

Example:

```graphql
query GetAllMembersByAdmin {
  getAllMembersByAdmin(
    input: {
      page: 1
      limit: 20
      sort: "createdAt"
      direction: DESC
      search: {
        memberType: USER
        memberStatus: ACTIVE
        text: "mar"
      }
    }
  ) {
    list {
      _id
      memberNick
      memberType
      memberStatus
      memberPhone
      createdAt
    }
    metaCounter {
      total
    }
  }
}
```

Required header:

```json
{
  "Authorization": "Bearer ADMIN_ACCESS_TOKEN"
}
```

Have the student predict what happens with:

- No token
- An invalid token
- A valid `USER` token
- A valid `ADMIN` token

---

# 11. UpdateMemberByAdmin GraphQL API

Purpose: allow an administrator to update another member by ID, including administrative fields such as type or status.

Resolver:

```ts
@Roles(MemberType.ADMIN)
@UseGuards(RolesGuard)
@Mutation(() => Member)
public async updateMemberByAdmin(
  @Args('input') input: MemberUpdate,
): Promise<Member> {
  return this.memberService.updateMemberByAdmin(input);
}
```

Service:

```ts
const { _id, ...update } = input;

const result = await this.memberModel.findOneAndUpdate(
  { _id },
  update,
  { new: true },
);
```

Why destructure `_id`?

- `_id` identifies the target document.
- MongoDB `_id` is immutable.
- It should be used in the query filter, not included in the update document.

Example mutation:

```graphql
mutation UpdateMemberByAdmin {
  updateMemberByAdmin(
    input: {
      _id: "TARGET_MEMBER_OBJECT_ID"
      memberStatus: BLOCK
      memberDesc: "Blocked by administrator"
    }
  ) {
    _id
    memberNick
    memberType
    memberStatus
    memberDesc
    updatedAt
  }
}
```

Required header:

```json
{
  "Authorization": "Bearer ADMIN_ACCESS_TOKEN"
}
```

Security discussion:

- Use a dedicated `MemberUpdateByAdmin` DTO in production.
- Decide exactly which fields an admin may update.
- Never save an updated password without bcrypt hashing.
- Audit sensitive admin operations.
- Consider preventing an admin from deleting or demoting the last administrator.

---

# 12. GraphQL output model for paginated members

The paginated response uses:

```ts
@ObjectType()
class TotalCounter {
  @Field(() => Int, { nullable: true })
  total?: number;
}

@ObjectType()
class Members {
  @Field(() => [Member])
  list: Member[];

  @Field(() => [TotalCounter], { nullable: true })
  metaCounter: TotalCounter[];
}
```

The reason `metaCounter` is an array is that MongoDB `$facet` returns the `$count` sub-pipeline as an array:

```json
{
  "list": [],
  "metaCounter": [
    { "total": 42 }
  ]
}
```

Ask the student to explain why the response is not simply `{ total: 42 }` and how the service could transform it into that shape if desired.

---

# 13. Complete request lifecycle comparisons

## UpdateMember

```text
GraphQL mutation
 -> AuthGuard verifies JWT
 -> @AuthMember extracts logged-in member ID
 -> MemberResolver.updateMember
 -> MemberService.updateMember
 -> Mongoose findOneAndUpdate
 -> New JWT created
 -> Updated Member returned
```

## GetMember as guest

```text
GraphQL query
 -> WithoutGuard finds no token and allows request
 -> memberId is null
 -> MemberResolver.getMember
 -> MemberService.getMember
 -> MongoDB member lookup
 -> No view recorded
 -> Member returned
```

## GetMember as authenticated member

```text
GraphQL query with JWT
 -> WithoutGuard verifies token
 -> @AuthMember extracts viewer ID
 -> Member lookup
 -> ViewService checks duplicate view
 -> New view inserted if necessary
 -> memberViews incremented
 -> Member returned
```

## GetAllMembersByAdmin

```text
GraphQL query with JWT
 -> RolesGuard reads ADMIN metadata
 -> JWT verified
 -> memberType checked
 -> Resolver receives MembersInquiry
 -> Service builds match and sort objects
 -> MongoDB aggregation
 -> Members pagination object returned
```

---

# 14. Suggested exercises

Do not give answers until I attempt each exercise.

1. Draw the complete `AuthGuard` request lifecycle from the Authorization header to the resolver argument.
2. Explain why `@Roles(MemberType.ADMIN)` does nothing without `RolesGuard`.
3. Change `getAgents` pagination from page 1 to page 3 with a limit of 5 and calculate `$skip` manually.
4. Add a filter that searches both `memberNick` and `memberFullName` using `$or`.
5. Design separate `MemberUpdate` and `MemberUpdateByAdmin` DTOs.
6. Prevent a normal user from changing `memberType` and `memberStatus`.
7. Hash `memberPassword` when either update API changes it.
8. Return a simpler pagination shape with `total: number` instead of `metaCounter: [{ total }]`.
9. Explain what happens when two identical view requests arrive at nearly the same time.
10. Replace `ObjectId` schema-type usage with the correct runtime `Types.ObjectId` typing and explain the distinction.

---

# 15. Final assessment Claude should give me

At the end, test me with:

- Five conceptual questions
- Three request-lifecycle tracing questions
- Two MongoDB aggregation questions
- Two security questions
- One debugging task involving a broken guard
- One debugging task involving a broken `$match` field name
- One implementation task for a new admin-only GraphQL API

Do not grade only by the final answer. Ask me to explain why each step works.

