import { AppRouter } from './routes';
import { AuthProvider } from './context/AuthContext';
import { ClassProvider } from './context/ClassContext';
import { PlatformAuthProvider } from './context/PlatformAuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <PlatformAuthProvider>
        <ClassProvider>
          <AppRouter />
        </ClassProvider>
      </PlatformAuthProvider>
    </AuthProvider>
  );
}

export default App;
