import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AgentsList from "./pages/AgentsList";
import AgentForm from "./pages/AgentForm";
import TestBuilder from "./pages/TestBuilder";
import TestRunDetail from "./pages/TestRunDetail";
import TestRunHistory from "./pages/TestRunHistory";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NotFound />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/agents" component={() => <ProtectedRoute component={AgentsList} />} />
      <Route path="/agents/new" component={() => <ProtectedRoute component={AgentForm} />} />
      <Route path="/agents/:id/edit" component={() => <ProtectedRoute component={AgentForm} />} />
      <Route path="/agents/:id/test" component={() => <ProtectedRoute component={TestBuilder} />} />
      <Route path="/runs" component={() => <ProtectedRoute component={TestRunHistory} />} />
      <Route path="/runs/:id" component={() => <ProtectedRoute component={TestRunDetail} />} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc" })] })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Toaster />
          <Router />
        </ErrorBoundary>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
