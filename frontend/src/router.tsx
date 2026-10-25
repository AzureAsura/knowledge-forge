import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { userQueries } from "@/features/users/queries";
import { categoriesQuery } from "@/features/categories/queries";
import { challengesQuery } from "@/features/challenges/queries";
import { leaderboardQuery, myBadgesQuery, parseLeaderboardParams } from "@/features/gamification/queries";
import { dashboardLoader } from "@/features/dashboard/queries";
import { scrollDetailLoader, scrollsLoader } from "@/features/scrolls/loader";
import { restoreSession } from "@/lib/api/client";
import { prefetch, redirectIfAuthed, requireAuth, requireRole } from "@/lib/router/guards";
import HydrateFallback from "@/routes/HydrateFallback";
import Layout from "@/routes/Layout";
import NotFound from "@/routes/NotFound";
import RouteError from "@/routes/RouteError";
import DashboardLayout from "@/routes/dashboard/Layout";

const page = (load: () => Promise<{ default: ComponentType }>) => ({
  lazy: async () => ({ Component: (await load()).default }),
});

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    loader: async () => {
      await restoreSession();
      return null;
    },
    HydrateFallback,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "auth", loader: redirectIfAuthed, ...page(() => import("@/routes/auth/Page")) },
      {
        path: "dashboard",
        element: <DashboardLayout />,
        loader: requireAuth,
        children: [
          {
            // Pathless: keeps Sidebar/Navbar on screen when a page throws.
            errorElement: <RouteError />,
            children: [
              { index: true, loader: dashboardLoader, ...page(() => import("@/routes/dashboard/Page")) },
              { path: "scrolls", loader: scrollsLoader, ...page(() => import("@/routes/dashboard/scrolls/Page")) },
              { path: "scrolls/new", ...page(() => import("@/routes/dashboard/scrolls/new/Page")) },
              { path: "scrolls/:id", loader: scrollDetailLoader, ...page(() => import("@/routes/dashboard/scrolls/[id]/Page")) },
              { path: "scrolls/:id/edit", loader: scrollDetailLoader, ...page(() => import("@/routes/dashboard/scrolls/[id]/edit/Page")) },
              { path: "review", loader: requireRole("senior", "admin"), ...page(() => import("@/routes/dashboard/review/Page")) },
              { path: "tree", loader: prefetch(categoriesQuery, challengesQuery), ...page(() => import("@/routes/dashboard/tree/Page")) },
              { path: "tree/:username", loader: prefetch(categoriesQuery, challengesQuery), ...page(() => import("@/routes/dashboard/tree/Page")) },
              {
                path: "leaderboard",
                loader: ({ request }) => {
                  const { type, period } = parseLeaderboardParams(new URL(request.url).searchParams);
                  return prefetch(leaderboardQuery(type, period))();
                },
                ...page(() => import("@/routes/dashboard/leaderboard/Page")),
              },
              { path: "badges", loader: prefetch(myBadgesQuery), ...page(() => import("@/routes/dashboard/badges/Page")) },
              { path: "challenges/manage", loader: requireRole("admin"), ...page(() => import("@/routes/dashboard/challenges/manage/Page")) },
              { path: "challenges", loader: prefetch(challengesQuery), ...page(() => import("@/routes/dashboard/challenges/Page")) },
              { path: "settings", ...page(() => import("@/routes/dashboard/settings/Page")) },
              { path: "profile/:username", loader: ({ params }) => prefetch(userQueries.profile(params.username!))(), ...page(() => import("@/routes/dashboard/profile/Page")) },
              { path: "*", Component: NotFound },
            ],
          },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
