import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

import HomeScreen from '../screens/HomeScreen';
import TimerScreen from '../screens/TimerScreen';
import TasksScreen from '../screens/TasksScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DeepFocusScreen from '../screens/DeepFocusScreen';
import BlockScreen from '../screens/BlockScreen';
import BlockedAppsScreen from '../screens/BlockedAppsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TABS = [
  { name: 'Home', screen: HomeScreen, icon: 'home', label: 'Home' },
  { name: 'Timer', screen: TimerScreen, icon: 'timer', label: 'Focus' },
  { name: 'Tasks', screen: TasksScreen, icon: 'list', label: 'Tasks' },
  { name: 'Analytics', screen: AnalyticsScreen, icon: 'stats-chart', label: 'Stats' },
  { name: 'Profile', screen: ProfileScreen, icon: 'person', label: 'Profile' },
];

function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tab = TABS.find((t) => t.name === route.name);
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, isFocused && styles.tabIconActive]}>
                <Ionicons
                  name={isFocused ? tab?.icon : `${tab?.icon}-outline`}
                  size={20}
                  color={isFocused ? Colors.primary : Colors.textMuted}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && { color: Colors.primary }]}>
                {tab?.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.screen} />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="DeepFocus"
        component={DeepFocusScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="BlockScreen"
        component={BlockScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="BlockedApps"
        component={BlockedAppsScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111113',
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  tabIconWrapper: {
    width: 42,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabIconActive: { backgroundColor: 'rgba(99,102,241,0.15)' },
  tabIcon: { fontSize: 18, color: Colors.textMuted, fontWeight: '600' },
  tabLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.3 },
});

