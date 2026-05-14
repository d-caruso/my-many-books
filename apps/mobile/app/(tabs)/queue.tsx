import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QueueManagementScreen } from '@/components/QueueManagementScreen';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';

function QueueScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <QueueManagementScreen />
    </SafeAreaView>
  );
}

export default function QueueRoute() {
  return (
    <PageErrorBoundary screenName="Queue">
      <QueueScreen />
    </PageErrorBoundary>
  );
}