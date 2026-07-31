/**
 * Tab navigation helpers — pop nested stack to tab root on re-press.
 */
import type { EventArg } from '@react-navigation/native';
import { router } from 'expo-router';

type TabPressEvent = EventArg<'tabPress', true, undefined>;

type NavRoute = {
  name: string;
  state?: {
    index: number;
    routes: NavRoute[];
  };
};

function hasNestedStack(route: NavRoute | undefined): boolean {
  if (!route?.state) return false;
  if (route.state.index > 0) return true;
  const active = route.state.routes[route.state.index];
  return hasNestedStack(active);
}

/** Return to a tab's root screen (e.g. subscription → profile index). */
export function navigateToTabRoot(tabRootHref: string) {
  try {
    router.dismissTo(tabRootHref as never);
  } catch {
    router.replace(tabRootHref as never);
  }
}

/**
 * Safe back: nested pushes sometimes leave no history, so raw `router.back()` throws.
 */
export function safeGoBack(fallbackHref: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref as never);
}

export function handleTabPressToRoot(
  tabRootHref: string,
  navigation: {
    isFocused: () => boolean;
    getState: () => { routes: NavRoute[] };
  },
  routeName: string,
  e: TabPressEvent,
) {
  // Switching to another tab: jump to that tab's root so nested screens don't trap the user.
  if (!navigation.isFocused()) {
    e.preventDefault();
    router.navigate(tabRootHref as never);
    return;
  }

  const state = navigation.getState();
  const tabRoute = state.routes.find((r) => r.name === routeName);

  if (hasNestedStack(tabRoute)) {
    e.preventDefault();
    navigateToTabRoot(tabRootHref);
  }
}
