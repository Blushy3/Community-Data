/**
 * Domain types mirroring the planned database schema (README §9).
 *
 * These are hand-written for now; they will be replaced by generated
 * Supabase types (`supabase gen types typescript`) once the schema exists.
 */

export type Role = 'member' | 'moderator' | 'admin'

export type AccountStatus = 'active' | 'suspended'

export type PublishStatus = 'draft' | 'published'

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_path: string | null
  banner_path: string | null
  social_links: Record<string, string> | null
  favorite_games: string[] | null
  account_status: AccountStatus
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: string
  slug: string
  name: string
  description: string
  icon_path: string | null
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  awarded_by: string | null
  awarded_at: string
}

export interface CommunityUpdate {
  id: string
  title: string
  slug: string
  description: string
  content: string
  status: PublishStatus
  created_by: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ExploreSection {
  id: string
  slug: string
  title: string
  description: string
  content: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface SiteSettings {
  id: number
  registration_enabled: boolean
  discord_invite_url: string | null
  updated_at: string
  updated_by: string | null
}
