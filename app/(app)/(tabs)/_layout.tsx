import React from 'react';
import { Tabs } from 'expo-router';
import TabBarIcon from '@/components/TabBarIcon';

export default function TabLayout() {

  return (
    <Tabs
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Log Trail',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-graph" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
