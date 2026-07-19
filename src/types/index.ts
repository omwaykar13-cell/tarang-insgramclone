export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  is_private: boolean
  birthday: string | null
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  image_url: string
  caption: string | null
  location: string | null
  created_at: string
  media_type: 'post' | 'reel'
  media_kind: 'image' | 'video'
}

export type PostWithProfile = Post & {
  profile: Profile
  like_count: number
  comment_count: number
  liked_by_me: boolean
}

export type Conversation = {
  id: string
  other: Profile
  last_message?: Message | null
}

export type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  shared_post_id: string | null
  created_at: string
  shared_post?: PostWithProfile | null
}

export type Call = {
  id: string
  conversation_id: string
  caller_id: string
  status: 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended'
  started_at: string
  ended_at: string | null
}

export type Streak = {
  id: string
  conversation_id: string
  count: number
  last_activity_at: string
  last_bumped_at: string
}

export type Story = {
  id: string
  user_id: string
  image_url: string
  media_kind: 'image' | 'video'
  caption: string | null
  created_at: string
  expires_at: string
}

export type StoryWithProfile = Story & {
  profile: Profile
  viewed: boolean
}

export type StoryGroup = {
  profile: Profile
  stories: StoryWithProfile[]
  hasUnviewed: boolean
}
