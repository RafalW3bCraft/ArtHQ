import { Suspense, lazy } from "react";
import { Route, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { GerakiProvider } from "./hooks/useGeraki";
import { AuthProvider } from "./hooks/useAuth";
import { Shell, Notice } from "./components/business/Shell";
import {
  Home,
  Services,
  Projects,
  Blog,
  Detail,
  Process,
  Contact,
  Policies,
  NotFound,
} from "./pages/Studio";
import { Start, Login, Orders, Community } from "./pages/Workspace";
const StudioAdmin = lazy(() => import("./pages/StudioAdmin"));
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GerakiProvider>
        <Shell>
          <Suspense
            fallback={
              <div className="container section">
                <Notice>Loading…</Notice>
              </div>
            }
          >
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/services" component={Services} />
              <Route path="/projects" component={Projects} />
              <Route path="/projects/:slug">
                {(p) => <Detail slug={p.slug} section="projects" />}
              </Route>
              <Route path="/blog" component={Blog} />
              <Route path="/blog/:slug">
                {(p) => <Detail slug={p.slug} section="blog" />}
              </Route>
              <Route path="/process" component={Process} />
              <Route path="/contact" component={Contact} />
              <Route path="/start" component={Start} />
              <Route path="/login" component={Login} />
              <Route path="/orders" component={Orders} />
              <Route path="/community" component={Community} />
              <Route path="/admin" component={StudioAdmin} />
              <Route path="/admin/:rest*">
                <Redirect to="/admin" />
              </Route>
              <Route path="/dashboard">
                <Redirect to="/orders" />
              </Route>
              <Route path="/settings">
                <Redirect to="/orders" />
              </Route>
              <Route path="/site-builder">
                <Redirect to="/start" />
              </Route>
              <Route path="/privacy">
                <Policies kind="privacy" />
              </Route>
              <Route path="/terms">
                <Policies kind="terms" />
              </Route>
              <Route path="/refunds">
                <Policies kind="refunds" />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </Shell>
        </GerakiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
