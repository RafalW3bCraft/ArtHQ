import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import NotFound from "@/pages/not-found";

const Portal = lazy(() => import("@/pages/Portal"));
function Pages() {
  const [path] = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "ArtHQ | Websites, Apps & Digital Products",
      "/auth": "Client sign in | ArtHQ",
      "/dashboard": "Client portal | ArtHQ",
      "/admin": "Admin workspace | ArtHQ",
    };
    document.title = titles[path] || "Page not found | ArtHQ";
    if (path !== "/") {
      const robots = document.createElement("meta");
      robots.name = "robots";
      robots.content = "noindex, nofollow";
      document.head.append(robots);
      return () => robots.remove();
    }
  }, [path]);
  return (
    <>
      <Header />
      <main id="main">
        <Suspense
          fallback={
            <p className="wrap loading" role="status">
              Loading the client portal…
            </p>
          }
        >
          <Switch>
            <Route path="/" component={HomePage} />
            {["/auth", "/dashboard", "/admin"].map((route) => (
              <Route key={route} path={route}>
                <Portal path={route} />
              </Route>
            ))}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <Pages />
    </ThemeProvider>
  );
}
