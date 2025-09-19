import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PaperProvider>
          <AuthProvider>
            <StatusBar style="auto" />
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
                  title: 'Book Details',
                  presentation: 'card'
                }} 
              />
              <Stack.Screen 
                name="book/edit/[id]" 
                options={{ 
                  title: 'Edit Book',
                  presentation: 'card'
                }} 
              />
              <Stack.Screen 
                name="book/add" 
                options={{ 
                  title: 'Add Book',
                  presentation: 'card'
                }} 
              />
              <Stack.Screen 
                name="scanner" 
                options={{ 
                  title: 'Scan Barcode',
                  presentation: 'card'
                }} 
              />
            </Stack>
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}