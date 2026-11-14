import { ViewTransition } from "react";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  /**
   * Identity for dynamic routes (slug/scope): changing it remounts the shell
   * so the entrance animation replays between sibling pages.
   */
  transitionKey?: string;
};

/**
 * Route-level view transition wrapper. In browsers with a working View
 * Transitions runtime the old page fades out quickly while the new one
 * arrives with a gentle fade-and-rise (`page-exit` / `page-enter` classes in
 * globals.css). Elsewhere — some embedded webviews abort transitions even
 * though the API exists — the `page-enter-fallback` CSS entrance animation on
 * the shell div takes over, so navigation still feels animated everywhere.
 *
 * Must wrap page content, not the layout: layouts persist across navigations,
 * so their enter/exit animations never fire.
 */
export function PageTransition({ children, transitionKey }: PageTransitionProps) {
  return (
    <ViewTransition key={transitionKey} enter="page-enter" exit="page-exit" default="none">
      <div key={transitionKey} className="page-enter-fallback">
        {children}
      </div>
    </ViewTransition>
  );
}
