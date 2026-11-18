import React, { useEffect, useState } from "react";

const NAVIGATE_EVENT = "matchvision:navigate";

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  if (options.replace) {
    window.history.replaceState({}, "", to);
  } else if (window.location.pathname + window.location.search !== to) {
    window.history.pushState({}, "", to);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

export function useRoute(): string {
  const [path, setPath] = useState<string>(() =>
    typeof window === "undefined" ? "/" : window.location.pathname + window.location.search
  );

  useEffect(() => {
    const update = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener("popstate", update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);

  return path;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

export function Link({ to, replace, children, onClick, ...rest }: LinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to, { replace });
  };

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

export function queryParam(path: string, key: string): string | null {
  const idx = path.indexOf("?");
  if (idx === -1) return null;
  return new URLSearchParams(path.slice(idx + 1)).get(key);
}
