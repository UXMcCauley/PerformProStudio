// Social features - Friendships, Band Memberships, Sharing
import { getDb } from './mongodb';
import { ObjectId } from 'mongodb';

// ============================================
// TYPES
// ============================================

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';
export type BandMemberRole = 'owner' | 'admin' | 'member';

export interface FriendRequest {
  _id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  _id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface BandMember {
  _id: string;
  band_id: string;
  user_id: string;
  role: BandMemberRole;
  invited_by: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface BandInvite {
  _id: string;
  band_id: string;
  from_user_id: string;
  to_user_id: string;
  role: BandMemberRole;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublicProfile {
  _id: string;
  displayName: string;
  email: string;
  avatar?: string;
}

// ============================================
// FRIEND REQUESTS
// ============================================

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string,
  message?: string
): Promise<FriendRequest | null> {
  const db = await getDb();

  // Can't friend yourself
  if (fromUserId === toUserId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if already friends
  const existingFriendship = await db.collection('friendships').findOne({
    $or: [
      { user_id: fromUserId, friend_id: toUserId },
      { user_id: toUserId, friend_id: fromUserId },
    ],
  });

  if (existingFriendship) {
    throw new Error('Already friends with this user');
  }

  // Check for existing pending request (either direction)
  const existingRequest = await db.collection('friend_requests').findOne({
    $or: [
      { from_user_id: fromUserId, to_user_id: toUserId, status: 'pending' },
      { from_user_id: toUserId, to_user_id: fromUserId, status: 'pending' },
    ],
  });

  if (existingRequest) {
    // If they already sent us a request, auto-accept it
    if (existingRequest.from_user_id === toUserId) {
      await acceptFriendRequest(existingRequest._id.toString(), fromUserId);
      return null; // Friendship created instead
    }
    throw new Error('Friend request already pending');
  }

  const now = new Date().toISOString();
  const request = {
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: 'pending' as FriendRequestStatus,
    message: message || null,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection('friend_requests').insertOne(request);

  return {
    _id: result.insertedId.toString(),
    ...request,
  };
}

export async function acceptFriendRequest(
  requestId: string,
  userId: string
): Promise<Friendship | null> {
  const db = await getDb();

  const request = await db.collection('friend_requests').findOne({
    _id: new ObjectId(requestId),
    to_user_id: userId,
    status: 'pending',
  });

  if (!request) {
    throw new Error('Friend request not found or already processed');
  }

  const now = new Date().toISOString();

  // Update request status
  await db.collection('friend_requests').updateOne(
    { _id: new ObjectId(requestId) },
    { $set: { status: 'accepted', updated_at: now } }
  );

  // Create bidirectional friendship records
  const friendships = [
    {
      user_id: request.from_user_id,
      friend_id: request.to_user_id,
      created_at: now,
    },
    {
      user_id: request.to_user_id,
      friend_id: request.from_user_id,
      created_at: now,
    },
  ];

  await db.collection('friendships').insertMany(friendships);

  return {
    _id: friendships[0].user_id + '_' + friendships[0].friend_id,
    user_id: friendships[0].user_id,
    friend_id: friendships[0].friend_id,
    created_at: now,
  };
}

export async function rejectFriendRequest(
  requestId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();

  const result = await db.collection('friend_requests').updateOne(
    {
      _id: new ObjectId(requestId),
      to_user_id: userId,
      status: 'pending',
    },
    { $set: { status: 'rejected', updated_at: new Date().toISOString() } }
  );

  return result.modifiedCount > 0;
}

export async function cancelFriendRequest(
  requestId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();

  const result = await db.collection('friend_requests').deleteOne({
    _id: new ObjectId(requestId),
    from_user_id: userId,
    status: 'pending',
  });

  return result.deletedCount > 0;
}

export async function getPendingFriendRequests(userId: string): Promise<any[]> {
  const db = await getDb();

  // Get incoming requests with sender info
  const requests = await db.collection('friend_requests').aggregate([
    {
      $match: {
        to_user_id: userId,
        status: 'pending',
      },
    },
    {
      $addFields: {
        from_user_oid: { $toObjectId: '$from_user_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'from_user_oid',
        foreignField: '_id',
        as: 'from_user',
      },
    },
    {
      $unwind: { path: '$from_user', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        from_user_id: 1,
        to_user_id: 1,
        status: 1,
        message: 1,
        created_at: 1,
        from_user_name: { $ifNull: ['$from_user.displayName', '$from_user.email'] },
        from_user_email: '$from_user.email',
      },
    },
    { $sort: { created_at: -1 } },
  ]).toArray();

  return requests.map(r => ({
    ...r,
    _id: r._id.toString(),
  }));
}

export async function getSentFriendRequests(userId: string): Promise<any[]> {
  const db = await getDb();

  const requests = await db.collection('friend_requests').aggregate([
    {
      $match: {
        from_user_id: userId,
        status: 'pending',
      },
    },
    {
      $addFields: {
        to_user_oid: { $toObjectId: '$to_user_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'to_user_oid',
        foreignField: '_id',
        as: 'to_user',
      },
    },
    {
      $unwind: { path: '$to_user', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        from_user_id: 1,
        to_user_id: 1,
        status: 1,
        message: 1,
        created_at: 1,
        to_user_name: { $ifNull: ['$to_user.displayName', '$to_user.email'] },
        to_user_email: '$to_user.email',
      },
    },
    { $sort: { created_at: -1 } },
  ]).toArray();

  return requests.map(r => ({
    ...r,
    _id: r._id.toString(),
  }));
}

// ============================================
// FRIENDSHIPS
// ============================================

export async function getFriends(userId: string): Promise<any[]> {
  const db = await getDb();

  const friends = await db.collection('friendships').aggregate([
    {
      $match: { user_id: userId },
    },
    {
      $addFields: {
        friend_oid: { $toObjectId: '$friend_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'friend_oid',
        foreignField: '_id',
        as: 'friend',
      },
    },
    {
      $unwind: { path: '$friend', preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: 'user_settings',
        localField: 'friend_id',
        foreignField: 'user_id',
        as: 'friend_settings',
      },
    },
    {
      $unwind: { path: '$friend_settings', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        friend_id: '$friend_id',
        friend_name: { $ifNull: ['$friend.displayName', '$friend.email'] },
        friend_email: '$friend.email',
        avatar: '$friend_settings.avatar',
        since: '$created_at',
      },
    },
    { $sort: { friend_name: 1 } },
  ]).toArray();

  return friends.map(f => ({
    ...f,
    _id: f._id.toString(),
  }));
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  const db = await getDb();

  // Remove both directions of the friendship
  const result = await db.collection('friendships').deleteMany({
    $or: [
      { user_id: userId, friend_id: friendId },
      { user_id: friendId, friend_id: userId },
    ],
  });

  return result.deletedCount > 0;
}

export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const db = await getDb();

  const friendship = await db.collection('friendships').findOne({
    user_id: userId1,
    friend_id: userId2,
  });

  return !!friendship;
}

// ============================================
// BAND MEMBERS
// ============================================

export async function addBandMember(
  bandId: string,
  userId: string,
  role: BandMemberRole,
  invitedBy: string
): Promise<BandMember> {
  const db = await getDb();

  // Check if already a member
  const existing = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: userId,
  });

  if (existing) {
    throw new Error('User is already a member of this band');
  }

  const now = new Date().toISOString();
  const member = {
    band_id: bandId,
    user_id: userId,
    role,
    invited_by: invitedBy,
    joined_at: now,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection('band_members').insertOne(member);

  return {
    _id: result.insertedId.toString(),
    ...member,
  };
}

export async function removeBandMember(
  bandId: string,
  userId: string,
  requestingUserId: string
): Promise<boolean> {
  const db = await getDb();

  // Check if requester has permission (must be owner or admin, or removing self)
  const requesterMember = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: requestingUserId,
  });

  if (!requesterMember) {
    throw new Error('You are not a member of this band');
  }

  // Users can remove themselves, or admins/owners can remove others
  if (userId !== requestingUserId) {
    if (requesterMember.role !== 'owner' && requesterMember.role !== 'admin') {
      throw new Error('Only admins can remove other members');
    }

    // Check target's role - can't remove owner, admins can't remove other admins
    const targetMember = await db.collection('band_members').findOne({
      band_id: bandId,
      user_id: userId,
    });

    if (targetMember?.role === 'owner') {
      throw new Error('Cannot remove the band owner');
    }

    if (targetMember?.role === 'admin' && requesterMember.role !== 'owner') {
      throw new Error('Only the owner can remove admins');
    }
  } else {
    // Can't leave if you're the owner
    if (requesterMember.role === 'owner') {
      throw new Error('Owner cannot leave the band. Transfer ownership first.');
    }
  }

  const result = await db.collection('band_members').deleteOne({
    band_id: bandId,
    user_id: userId,
  });

  return result.deletedCount > 0;
}

export async function updateBandMemberRole(
  bandId: string,
  userId: string,
  newRole: BandMemberRole,
  requestingUserId: string
): Promise<boolean> {
  const db = await getDb();

  // Only owner can change roles
  const requester = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: requestingUserId,
    role: 'owner',
  });

  if (!requester) {
    throw new Error('Only the band owner can change member roles');
  }

  // Can't change owner role this way
  if (newRole === 'owner') {
    throw new Error('Use transferOwnership to change band owner');
  }

  const result = await db.collection('band_members').updateOne(
    { band_id: bandId, user_id: userId, role: { $ne: 'owner' } },
    { $set: { role: newRole, updated_at: new Date().toISOString() } }
  );

  return result.modifiedCount > 0;
}

export async function transferBandOwnership(
  bandId: string,
  newOwnerId: string,
  currentOwnerId: string
): Promise<boolean> {
  const db = await getDb();

  // Verify current owner
  const currentOwner = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: currentOwnerId,
    role: 'owner',
  });

  if (!currentOwner) {
    throw new Error('You are not the owner of this band');
  }

  // Verify new owner is a member
  const newOwner = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: newOwnerId,
  });

  if (!newOwner) {
    throw new Error('New owner must be a member of the band');
  }

  const now = new Date().toISOString();

  // Update both roles in a transaction-like manner
  await db.collection('band_members').updateOne(
    { band_id: bandId, user_id: currentOwnerId },
    { $set: { role: 'admin', updated_at: now } }
  );

  await db.collection('band_members').updateOne(
    { band_id: bandId, user_id: newOwnerId },
    { $set: { role: 'owner', updated_at: now } }
  );

  // Also update the band's user_id field
  await db.collection('bands').updateOne(
    { _id: new ObjectId(bandId) },
    { $set: { user_id: newOwnerId, updated_at: now } }
  );

  return true;
}

export async function getBandMembers(bandId: string): Promise<any[]> {
  const db = await getDb();

  const members = await db.collection('band_members').aggregate([
    {
      $match: { band_id: bandId },
    },
    {
      $addFields: {
        user_oid: { $toObjectId: '$user_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user_oid',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: 'user_settings',
        localField: 'user_id',
        foreignField: 'user_id',
        as: 'user_settings',
      },
    },
    {
      $unwind: { path: '$user_settings', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        band_id: 1,
        user_id: 1,
        role: 1,
        joined_at: 1,
        user: {
          _id: '$user._id',
          displayName: { $ifNull: ['$user.displayName', '$user.email'] },
          email: '$user.email',
          avatar: '$user_settings.avatar',
        },
      },
    },
    {
      $sort: {
        role: 1, // owner first, then admin, then member
        joined_at: 1,
      },
    },
  ]).toArray();

  return members;
}

export async function getUserBandMembership(
  bandId: string,
  userId: string
): Promise<BandMember | null> {
  const db = await getDb();

  const member = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: userId,
  });

  if (!member) return null;

  return {
    _id: member._id.toString(),
    band_id: member.band_id,
    user_id: member.user_id,
    role: member.role,
    invited_by: member.invited_by,
    joined_at: member.joined_at,
    created_at: member.created_at,
    updated_at: member.updated_at,
  };
}

export async function getUserBands(userId: string, contentType?: string): Promise<any[]> {
  const db = await getDb();

  const pipeline: any[] = [
    {
      $match: { user_id: userId },
    },
    {
      $addFields: {
        band_oid: { $toObjectId: '$band_id' },
      },
    },
    {
      $lookup: {
        from: 'bands',
        localField: 'band_oid',
        foreignField: '_id',
        as: 'band',
      },
    },
    {
      $unwind: { path: '$band', preserveNullAndEmptyArrays: true },
    },
  ];

  // Filter by content_type if specified
  if (contentType) {
    pipeline.push({
      $match: { 'band.content_type': contentType },
    });
  }

  pipeline.push(
    {
      $project: {
        _id: '$band._id',
        name: '$band.name',
        content_type: '$band.content_type',
        role: '$role',
        joined_at: '$joined_at',
        created_at: '$band.created_at',
      },
    },
    { $sort: { name: 1 } }
  );

  const bands = await db.collection('band_members').aggregate(pipeline).toArray();

  return bands;
}

// ============================================
// BAND INVITES
// ============================================

export async function sendBandInvite(
  bandId: string,
  fromUserId: string,
  toUserId: string,
  role: BandMemberRole = 'member',
  message?: string
): Promise<BandInvite> {
  const db = await getDb();

  // Verify sender has permission to invite
  const senderMember = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: fromUserId,
  });

  if (!senderMember || (senderMember.role !== 'owner' && senderMember.role !== 'admin')) {
    throw new Error('Only owners and admins can invite members');
  }

  // Can't invite as owner
  if (role === 'owner') {
    throw new Error('Cannot invite as owner. Use transfer ownership instead.');
  }

  // Check if already a member
  const existingMember = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: toUserId,
  });

  if (existingMember) {
    throw new Error('User is already a member of this band');
  }

  // Check for existing pending invite
  const existingInvite = await db.collection('band_invites').findOne({
    band_id: bandId,
    to_user_id: toUserId,
    status: 'pending',
  });

  if (existingInvite) {
    throw new Error('Invite already pending for this user');
  }

  const now = new Date().toISOString();
  const invite = {
    band_id: bandId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    role,
    status: 'pending' as const,
    message: message || null,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection('band_invites').insertOne(invite);

  return {
    _id: result.insertedId.toString(),
    ...invite,
  };
}

export async function acceptBandInvite(
  inviteId: string,
  userId: string
): Promise<BandMember> {
  const db = await getDb();

  const invite = await db.collection('band_invites').findOne({
    _id: new ObjectId(inviteId),
    to_user_id: userId,
    status: 'pending',
  });

  if (!invite) {
    throw new Error('Invite not found or already processed');
  }

  // Update invite status
  await db.collection('band_invites').updateOne(
    { _id: new ObjectId(inviteId) },
    { $set: { status: 'accepted', updated_at: new Date().toISOString() } }
  );

  // Add as member
  return addBandMember(invite.band_id, userId, invite.role, invite.from_user_id);
}

export async function rejectBandInvite(
  inviteId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();

  const result = await db.collection('band_invites').updateOne(
    {
      _id: new ObjectId(inviteId),
      to_user_id: userId,
      status: 'pending',
    },
    { $set: { status: 'rejected', updated_at: new Date().toISOString() } }
  );

  return result.modifiedCount > 0;
}

export async function getPendingBandInvites(userId: string): Promise<any[]> {
  const db = await getDb();

  const invites = await db.collection('band_invites').aggregate([
    {
      $match: {
        to_user_id: userId,
        status: 'pending',
      },
    },
    {
      $addFields: {
        band_oid: { $toObjectId: '$band_id' },
        from_user_oid: { $toObjectId: '$from_user_id' },
      },
    },
    {
      $lookup: {
        from: 'bands',
        localField: 'band_oid',
        foreignField: '_id',
        as: 'band',
      },
    },
    {
      $unwind: { path: '$band', preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'from_user_oid',
        foreignField: '_id',
        as: 'from_user',
      },
    },
    {
      $unwind: { path: '$from_user', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        band_id: 1,
        role: 1,
        message: 1,
        created_at: 1,
        band_name: '$band.name',
        invited_by_id: '$from_user_id',
        invited_by_name: { $ifNull: ['$from_user.displayName', '$from_user.email'] },
        invited_by_email: '$from_user.email',
      },
    },
    { $sort: { created_at: -1 } },
  ]).toArray();

  return invites.map(i => ({
    ...i,
    _id: i._id.toString(),
  }));
}

// ============================================
// USER SEARCH
// ============================================

export async function searchUsers(
  query: string,
  excludeUserId: string,
  limit: number = 10
): Promise<UserPublicProfile[]> {
  const db = await getDb();

  const users = await db.collection('users').aggregate([
    {
      $match: {
        _id: { $ne: new ObjectId(excludeUserId) },
        $or: [
          { email: { $regex: query, $options: 'i' } },
          { displayName: { $regex: query, $options: 'i' } },
        ],
      },
    },
    {
      $lookup: {
        from: 'user_settings',
        let: { userId: { $toString: '$_id' } },
        pipeline: [
          { $match: { $expr: { $eq: ['$user_id', '$$userId'] } } },
        ],
        as: 'settings',
      },
    },
    {
      $unwind: { path: '$settings', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        displayName: { $ifNull: ['$displayName', '$email'] },
        email: 1,
        avatar: '$settings.avatar',
      },
    },
    { $limit: limit },
  ]).toArray();

  return users.map(u => ({
    _id: u._id.toString(),
    displayName: u.displayName,
    email: u.email,
    avatar: u.avatar,
  }));
}

// ============================================
// PERMISSION HELPERS
// ============================================

export async function canAccessBand(
  bandId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();

  const member = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: userId,
  });

  return !!member;
}

export async function canEditBand(
  bandId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();

  const member = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: userId,
    role: { $in: ['owner', 'admin'] },
  });

  return !!member;
}

export async function isBandOwner(
  bandId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();

  const member = await db.collection('band_members').findOne({
    band_id: bandId,
    user_id: userId,
    role: 'owner',
  });

  return !!member;
}

// ============================================
// PRACTICE INVITES
// ============================================

export type PracticeInviteStatus = 'pending' | 'accepted' | 'declined';

export interface PracticeInvite {
  _id: string;
  show_id: string;        // Reference to the practice/show
  band_id: string;
  from_user_id: string;
  to_user_id: string;
  status: PracticeInviteStatus;
  created_at: string;
  updated_at: string;
}

export async function createPracticeInvites(
  showId: string,
  bandId: string,
  fromUserId: string,
  toUserIds: string[]
): Promise<PracticeInvite[]> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Filter out the sender (can't invite yourself)
  const validUserIds = toUserIds.filter(id => id !== fromUserId);

  if (validUserIds.length === 0) return [];

  // Delete any existing invites for this show (to allow re-inviting)
  await db.collection('practice_invites').deleteMany({
    show_id: showId,
    to_user_id: { $in: validUserIds }
  });

  const invites = validUserIds.map(toUserId => ({
    show_id: showId,
    band_id: bandId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: 'pending' as PracticeInviteStatus,
    created_at: now,
    updated_at: now,
  }));

  const result = await db.collection('practice_invites').insertMany(invites);

  return invites.map((invite, index) => ({
    _id: result.insertedIds[index].toString(),
    ...invite,
  }));
}

export async function getPracticeInvitesForShow(showId: string): Promise<any[]> {
  const db = await getDb();

  const invites = await db.collection('practice_invites').aggregate([
    { $match: { show_id: showId } },
    {
      $addFields: {
        to_user_oid: { $toObjectId: '$to_user_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'to_user_oid',
        foreignField: '_id',
        as: 'to_user',
      },
    },
    { $unwind: { path: '$to_user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'user_settings',
        localField: 'to_user_id',
        foreignField: 'user_id',
        as: 'user_settings',
      },
    },
    { $unwind: { path: '$user_settings', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        show_id: 1,
        band_id: 1,
        to_user_id: 1,
        status: 1,
        created_at: 1,
        user_name: { $ifNull: ['$to_user.displayName', '$to_user.email'] },
        user_email: '$to_user.email',
        user_avatar: '$user_settings.avatar',
      },
    },
    { $sort: { user_name: 1 } },
  ]).toArray();

  return invites.map(i => ({
    ...i,
    _id: i._id.toString(),
  }));
}

export async function getPendingPracticeInvites(userId: string): Promise<any[]> {
  const db = await getDb();

  const invites = await db.collection('practice_invites').aggregate([
    {
      $match: {
        to_user_id: userId,
        status: 'pending',
      },
    },
    {
      $addFields: {
        show_oid: { $toObjectId: '$show_id' },
        from_user_oid: { $toObjectId: '$from_user_id' },
        band_oid: { $toObjectId: '$band_id' },
      },
    },
    {
      $lookup: {
        from: 'shows',
        localField: 'show_oid',
        foreignField: '_id',
        as: 'show',
      },
    },
    { $unwind: { path: '$show', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'bands',
        localField: 'band_oid',
        foreignField: '_id',
        as: 'band',
      },
    },
    { $unwind: { path: '$band', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'from_user_oid',
        foreignField: '_id',
        as: 'from_user',
      },
    },
    { $unwind: { path: '$from_user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        show_id: 1,
        band_id: 1,
        status: 1,
        created_at: 1,
        show_name: '$show.name',
        show_date: '$show.date',
        show_time: '$show.time',
        show_venue: '$show.venue',
        band_name: '$band.name',
        from_user_name: { $ifNull: ['$from_user.displayName', '$from_user.email'] },
      },
    },
    { $sort: { show_date: 1, show_time: 1 } },
  ]).toArray();

  return invites.map(i => ({
    ...i,
    _id: i._id.toString(),
  }));
}

export async function respondToPracticeInvite(
  inviteId: string,
  userId: string,
  accept: boolean
): Promise<boolean> {
  const db = await getDb();

  const result = await db.collection('practice_invites').updateOne(
    {
      _id: new ObjectId(inviteId),
      to_user_id: userId,
      status: 'pending',
    },
    {
      $set: {
        status: accept ? 'accepted' : 'declined',
        updated_at: new Date().toISOString(),
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function deletePracticeInvitesForShow(showId: string): Promise<boolean> {
  const db = await getDb();
  await db.collection('practice_invites').deleteMany({ show_id: showId });
  return true;
}

// ============================================
// SHARED SONGS
// ============================================

export interface SharedSong {
  _id: string;
  song_id: string;
  band_id: string;
  shared_by: string;       // user_id who shared
  shared_at: string;
  created_at: string;
}

export async function shareSongWithBand(
  songId: string,
  bandId: string,
  userId: string
): Promise<SharedSong | null> {
  const db = await getDb();

  // Check if already shared
  const existing = await db.collection('shared_songs').findOne({
    song_id: songId,
    band_id: bandId,
  });

  if (existing) {
    return {
      _id: existing._id.toString(),
      song_id: existing.song_id,
      band_id: existing.band_id,
      shared_by: existing.shared_by,
      shared_at: existing.shared_at,
      created_at: existing.created_at,
    };
  }

  const now = new Date().toISOString();
  const doc = {
    song_id: songId,
    band_id: bandId,
    shared_by: userId,
    shared_at: now,
    created_at: now,
  };

  const result = await db.collection('shared_songs').insertOne(doc);
  return {
    _id: result.insertedId.toString(),
    ...doc,
  };
}

export async function unshareSongFromBand(
  songId: string,
  bandId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();

  // Only the original sharer or band admin/owner can unshare
  const shared = await db.collection('shared_songs').findOne({
    song_id: songId,
    band_id: bandId,
  });

  if (!shared) return false;

  // Check if user is the sharer or has admin access
  const canUnshare = shared.shared_by === userId || await canEditBand(bandId, userId);
  if (!canUnshare) return false;

  const result = await db.collection('shared_songs').deleteOne({
    song_id: songId,
    band_id: bandId,
  });

  return result.deletedCount > 0;
}

export async function getSharedSongsForBand(bandId: string): Promise<any[]> {
  const db = await getDb();

  const sharedSongs = await db.collection('shared_songs').aggregate([
    { $match: { band_id: bandId } },
    {
      $addFields: {
        song_oid: { $toObjectId: '$song_id' },
        shared_by_oid: { $toObjectId: '$shared_by' },
      },
    },
    {
      $lookup: {
        from: 'songs',
        localField: 'song_oid',
        foreignField: '_id',
        as: 'song',
      },
    },
    { $unwind: { path: '$song', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'shared_by_oid',
        foreignField: '_id',
        as: 'sharer',
      },
    },
    { $unwind: { path: '$sharer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        song_id: 1,
        band_id: 1,
        shared_at: 1,
        shared_by: 1,
        shared_by_name: { $ifNull: ['$sharer.displayName', '$sharer.email'] },
        song: {
          _id: '$song._id',
          title: '$song.title',
          artist: '$song.artist',
          album: '$song.album',
          artwork_url: '$song.artwork_url',
          completed: '$song.completed',
          tags: '$song.tags',
        },
      },
    },
    { $sort: { shared_at: -1 } },
  ]).toArray();

  return sharedSongs.map(s => ({
    ...s,
    _id: s._id.toString(),
    song: s.song ? {
      ...s.song,
      _id: s.song._id?.toString(),
    } : null,
  }));
}

export async function getBandsForSong(songId: string): Promise<string[]> {
  const db = await getDb();

  const shares = await db.collection('shared_songs').find({ song_id: songId }).toArray();
  return shares.map(s => s.band_id);
}
