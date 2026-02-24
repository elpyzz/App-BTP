import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalBackground } from "@/components/GlobalBackground";
import { ChantiersProvider } from "@/context/ChantiersContext";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense } from "react";
import Home from "@/pages/Home";
import AuthPage from "@/pages/AuthPage";
import LoadingRedirectPage from "@/pages/LoadingRedirectPage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Lazy load des pages pour améliorer les performances
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const QuotesPage = lazy(() => import("@/pages/QuotesPage"));
const ProspectsPage = lazy(() => import("@/pages/ProspectsPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const PlanningPage = lazy(() => import("@/pages/PlanningPage"));
const EstimationPage = lazy(() => import("@/pages/EstimationPage"));
const ClientsPage = lazy(() => import("@/pages/ClientsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const DossiersPage = lazy(() => import("@/pages/DossiersPage"));
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.99
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  }
};

function Router() {
  const [location] = useLocation();

  const getComponent = () => {
    switch (location) {
      case "/":
        return <Home />;
      case "/auth":
        return <AuthPage />;
      case "/loading":
        return <LoadingRedirectPage />;
      case "/dashboard":
        return <ProtectedRoute><Dashboard /></ProtectedRoute>;
      case "/dashboard/estimation":
        return <ProtectedRoute><EstimationPage /></ProtectedRoute>;
      case "/dashboard/quotes":
        return <ProtectedRoute><QuotesPage /></ProtectedRoute>;
      case "/dashboard/invoices":
        return <ProtectedRoute><InvoicesPage /></ProtectedRoute>;
      case "/dashboard/dossiers":
        return <ProtectedRoute><DossiersPage /></ProtectedRoute>;
      case "/dashboard/prospects":
        return <ProtectedRoute><ProspectsPage /></ProtectedRoute>;
      case "/dashboard/projects":
        return <ProtectedRoute><ProjectsPage /></ProtectedRoute>;
      case "/dashboard/clients":
        return <ProtectedRoute><ClientsPage /></ProtectedRoute>;
      case "/dashboard/planning":
        return <ProtectedRoute><PlanningPage /></ProtectedRoute>;
      case "/dashboard/settings":
        return <ProtectedRoute><SettingsPage /></ProtectedRoute>;
      default:
        return <NotFound />;
    }
  };

  // Pages without sidebar (Home, Auth, Loading) get full page animation
  const isFullPage = location === "/" || location === "/auth" || location === "/loading";

  if (isFullPage) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          className="w-full h-full"
        >
          <Suspense fallback={<LoadingSpinner />}>
            {getComponent()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Pages with sidebar - animation handled in PageWrapper or Dashboard
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {getComponent()}
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChantiersProvider>
          <CompanyProvider>
            <TooltipProvider>
              <GlobalBackground />
              <Toaster />
              <Router />
            </TooltipProvider>
          </CompanyProvider>
        </ChantiersProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
