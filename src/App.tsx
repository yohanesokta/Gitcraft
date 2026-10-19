import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './themes/ThemeContext'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { RepositoryPage } from './pages/RepositoryPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { NewRepositoryPage } from './pages/NewRepositoryPage'
import { NotFoundPage } from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route
              path="/"
              element={
                <AppShell>
                  <HomePage />
                </AppShell>
              }
            />
            <Route
              path="/explore"
              element={
                <AppShell>
                  <HomePage />
                </AppShell>
              }
            />
            <Route
              path="/new"
              element={
                <AppShell>
                  <NewRepositoryPage />
                </AppShell>
              }
            />
            <Route
              path="/new/repository"
              element={
                <AppShell>
                  <NewRepositoryPage />
                </AppShell>
              }
            />
            <Route
              path="/:owner"
              element={
                <AppShell>
                  <ProfilePage />
                </AppShell>
              }
            />
            <Route
              path="/:owner/:repo"
              element={
                <AppShell>
                  <RepositoryPage />
                </AppShell>
              }
            />
            <Route
              path="/:owner/:repo/*"
              element={
                <AppShell>
                  <RepositoryPage />
                </AppShell>
              }
            />
            <Route
              path="*"
              element={
                <AppShell>
                  <NotFoundPage />
                </AppShell>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
