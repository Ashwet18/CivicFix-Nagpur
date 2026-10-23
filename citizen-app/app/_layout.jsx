import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/auth';
import { ComplaintsProvider } from '../context/complaints';

/**
 * RootLayout — top-level layout for the entire citizen app.
 *
 * Provider tree (outermost → innermost):
 *   AuthProvider         — user session, login/logout
 *   ComplaintsProvider   — in-memory complaint store, shared by Report + Complaints + Detail screens
 *
 * Route groups registered in Stack:
 *   (auth)      — login & registration (no header)
 *   (tabs)      — main bottom-tab app  (no header)
 *   complaint   — dynamic detail screen app/complaint/[id].jsx (with header)
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <ComplaintsProvider>
        <Stack>
          {/* Auth screens */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* Main tab app */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Complaint detail — dynamic route: /complaint/CF-001 etc. */}
          <Stack.Screen
            name="complaint/[id]"
            options={{
              title: 'Complaint Details',
              headerStyle: { backgroundColor: '#1565C0' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold', fontSize: 17 },
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ComplaintsProvider>
    </AuthProvider>
  );
}
