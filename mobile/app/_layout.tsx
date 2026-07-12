import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0f172a',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: '#0f172a',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'LifeOS Agent',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="tasks"
        options={{
          title: 'Tasks',
        }}
      />
      <Stack.Screen
        name="alarms"
        options={{
          title: 'Alarms',
        }}
      />
      <Stack.Screen
        name="learning"
        options={{
          title: 'Learning',
        }}
      />
      <Stack.Screen
        name="calendar"
        options={{
          title: 'Calendar',
        }}
      />
      <Stack.Screen
        name="routine"
        options={{
          title: 'Today\'s Routine',
        }}
      />
    </Stack>
  );
}
