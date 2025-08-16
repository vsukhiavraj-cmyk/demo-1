import React from 'react';
import { LenisScrollProvider, useLenisScroll } from './hooks/useLenis.jsx';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import AppRoutes from './Routes.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ScrollTriggerCleanup from './components/utils/ScrollTriggerCleanup';
import { TasksProvider } from './contexts/TasksContext.jsx';
import AuthProvider from './components/auth/AuthProvider.jsx';
import { useAppStore } from './store/appStore.js';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import { migrateLocalStorageToIndexedDB, checkForLegacyFiles } from './utils/migrationUtils';

// ScrollToTop component for route changes and page reloads
function ScrollToTop() {
  const location = useLocation();
  const lenis = useLenisScroll();

  // Scroll to top on route changes
  useEffect(() => {
    // Immediate scroll for dashboard to ensure it works
    if (location.pathname === '/dashboard') {
      window.scrollTo(0, 0);
      setTimeout(() => {
        if (lenis && lenis.scrollTo) {
          lenis.scrollTo(0, { immediate: true });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else {
      // Normal scroll for other pages
      if (lenis && lenis.scrollTo) {
        lenis.scrollTo(0, { duration: 0.8, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [location]);

  // Scroll to top on initial page load/reload
  useEffect(() => {
    if (lenis && lenis.scrollTo) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return null;
}

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const { initializeApp, handleLogout: appHandleLogout } = useAppStore();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
    
    // Auto-migrate localStorage files to IndexedDB
    const performMigration = async () => {
      try {
        const legacyFiles = checkForLegacyFiles();
        if (legacyFiles.length > 0) {
          console.log(`[App] Found ${legacyFiles.length} legacy files, starting auto-migration...`);
          const result = await migrateLocalStorageToIndexedDB();
          if (result.success) {
            console.log(`[App] Auto-migration completed: ${result.migratedCount} files migrated`);
          } else {
            console.warn('[App] Auto-migration failed:', result.message);
          }
        }
      } catch (error) {
        console.error('[App] Auto-migration error:', error);
      }
    };
    
    performMigration();
  }, [initializeApp]);

  const handleLogout = async () => {
    await logout();
    appHandleLogout(); // Clear app state
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <LenisScrollProvider>
          <TasksProvider>
            <ScrollTriggerCleanup />
            <ScrollToTop />
            <div className="flex flex-col min-h-screen bg-[#111111] transition-colors">
              <Header
                user={user}
                isAuthenticated={isAuthenticated}
                handleLogout={handleLogout}
              />
              <main className="flex-grow mt-16">
                <AppRoutes />
              </main>
              <Footer />
            </div>
          </TasksProvider>
        </LenisScrollProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 