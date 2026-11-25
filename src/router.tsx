import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/layouts/AdminLayout'
import { PublicLayout } from '@/layouts/PublicLayout'

import { AchievementsPage } from '@/pages/Achievements/AchievementsPage'
import { AdminAchievementsPage } from '@/pages/Admin/AdminAchievementsPage'
import { AdminCommunityPage } from '@/pages/Admin/AdminCommunityPage'
import { AdminDashboardPage } from '@/pages/Admin/AdminDashboardPage'
import { AdminExplorePage } from '@/pages/Admin/AdminExplorePage'
import { AdminAuditLogPage, AdminStoragePage } from '@/pages/Admin/AdminMiscPages'
import { AdminRegistrationPage } from '@/pages/Admin/AdminRegistrationPage'
import { AdminUpdatesPage } from '@/pages/Admin/AdminUpdatesPage'
import { AdminUsersPage } from '@/pages/Admin/AdminUsersPage'
import { LoginPage } from '@/pages/Auth/LoginPage'
import { RecoverPasswordPage } from '@/pages/Auth/RecoverPasswordPage'
import { RegisterPage } from '@/pages/Auth/RegisterPage'
import { CommunityPage } from '@/pages/Community/CommunityPage'
import { DiscordPage } from '@/pages/Discord/DiscordPage'
import { AccessDeniedPage, NotFoundPage } from '@/pages/Errors/ErrorPages'
import { ExplorePage } from '@/pages/Explore/ExplorePage'
import { ExploreSectionPage } from '@/pages/Explore/ExploreSectionPage'
import { HomePage } from '@/pages/Home/HomePage'
import { MembersPage } from '@/pages/Members/MembersPage'
import { ProfilePage } from '@/pages/Profile/ProfilePage'
import { SettingsPage } from '@/pages/Settings/SettingsPage'
import { TransparencyPage } from '@/pages/Transparency/TransparencyPage'
import { UpdateDetailPage } from '@/pages/Updates/UpdateDetailPage'
import { UpdatesPage } from '@/pages/Updates/UpdatesPage'

/** Vite injects BASE_URL ("/" locally, "/Community-Data/" on GitHub Pages). */
const baseUrl = import.meta.env.BASE_URL.replace(/\/+$/, '')

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <PublicLayout />,
      errorElement: <NotFoundPage />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'members', element: <MembersPage /> },
        { path: 'members/:username', element: <ProfilePage /> },
        { path: 'achievements', element: <AchievementsPage /> },
        { path: 'community', element: <CommunityPage /> },
        { path: 'explore', element: <ExplorePage /> },
        { path: 'explore/:slug', element: <ExploreSectionPage /> },
        { path: 'updates', element: <UpdatesPage /> },
        { path: 'updates/:slug', element: <UpdateDetailPage /> },
        { path: 'discord', element: <DiscordPage /> },
        { path: 'transparency', element: <TransparencyPage /> },
        { path: 'login', element: <LoginPage /> },
        { path: 'register', element: <RegisterPage /> },
        { path: 'recover', element: <RecoverPasswordPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'access-denied', element: <AccessDeniedPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { index: true, element: <AdminDashboardPage /> },
        { path: 'users', element: <AdminUsersPage /> },
        { path: 'registration', element: <AdminRegistrationPage /> },
        { path: 'achievements', element: <AdminAchievementsPage /> },
        { path: 'updates', element: <AdminUpdatesPage /> },
        { path: 'community', element: <AdminCommunityPage /> },
        { path: 'explore', element: <AdminExplorePage /> },
        { path: 'storage', element: <AdminStoragePage /> },
        { path: 'audit-log', element: <AdminAuditLogPage /> },
      ],
    },
  ],
  { basename: baseUrl || '/' },
)
