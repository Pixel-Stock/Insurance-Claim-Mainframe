import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth-context';
import LoginPage from './features/login/LoginPage';
import AppLayout from './app/AppLayout';
import BatchesPage from './features/batches/BatchesPage';
import SummaryPage from './features/summary/SummaryPage';
import QueuePage from './features/queue/QueuePage';
import ReportsPage from './features/reports/ReportsPage';
import AuditPage from './features/audit/AuditPage';
import RulesPage from './features/rules/RulesPage';
import RoleAccessPage from './features/roles/RoleAccessPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/batches" replace />} />
              <Route path="batches" element={<BatchesPage />} />
              <Route path="summary/:batchId" element={<SummaryPage />} />
              <Route path="queue" element={<QueuePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="rules" element={<RulesPage />} />
              <Route path="roles" element={<RoleAccessPage />} />
              <Route path="*" element={<Navigate to="/batches" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
