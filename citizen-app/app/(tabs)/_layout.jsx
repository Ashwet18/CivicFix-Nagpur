import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
        headerStyle: {
          backgroundColor: '#1565C0',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerTitle: 'CivicFix Nagpur',
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report Issue',
          tabBarLabel: 'Report',
          headerTitle: 'Report an Issue',
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          title: 'My Complaints',
          tabBarLabel: 'Complaints',
          headerTitle: 'My Complaints',
        }}
      />
    </Tabs>
  );
}
