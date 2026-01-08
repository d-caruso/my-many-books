import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@my-many-books/shared-auth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/i18n'; // Initialize i18n
import { authService } from '@/services/authService';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SyncProvider } from '@/components/SyncProvider';
import { LifecycleProvider } from '@/components/LifecycleProvider';
import { useTranslation } from 'react-i18next';

export default function RootLayout() {
  const { t } = useTranslation();
  
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PaperProvider>
          <AuthProvider
            authService={authService}
            loadingComponent={<LoadingSpinner />}
          >
            <SyncProvider>
              <LifecycleProvider>
                <StatusBar style="auto" />
                <OfflineBanner />
            <Stack>
              <Stack.Screen 
                name="(tabs)" 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="auth" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
              <Stack.Screen 
                name="book/[id]" 
                options={{ 
                  title: t('pages:books.details_title'),
                  presentation: 'card'
                }} 
              />
              <Stack.Screen 
                name="book/edit/[id]" 
                options={{ 
                  title: t('pages:books.edit_title'),
                  presentation: 'card'
                }} 
              />
              <Stack.Screen 
                name="book/add" 
                options={{ 
                  title: t('pages:books.add_book'),
                  presentation: 'card'
                }} 
              />
              <Stack.Screen
                name="scanner"
                options={{
                  title: t('pages:books.scan_title'),
                  presentation: 'card'
                }}
              />
              <Stack.Screen
                name="admin"
                options={{
                  headerShown: false
                }}
              />
            </Stack>
              </LifecycleProvider>
            </SyncProvider>
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}