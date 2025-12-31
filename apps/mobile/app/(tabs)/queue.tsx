import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QueueManagementScreen } from '@/components/QueueManagementScreen';

export default function QueueScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <QueueManagementScreen />
    </SafeAreaView>
  );
}