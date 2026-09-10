import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography } from '@/constants/theme';
import { tabLabels } from '@/constants/routes';

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcons: Record<string, IconName> = {
  index: 'calendar-outline',
  kitchen: 'restaurant-outline',
  missing: 'alert-circle-outline',
  shopping: 'cart-outline',
  more: 'ellipsis-horizontal-outline',
};

const activeIcons: Record<string, IconName> = {
  index: 'calendar',
  kitchen: 'restaurant',
  missing: 'alert-circle',
  shopping: 'cart',
  more: 'ellipsis-horizontal',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused }) => (
          <Ionicons
            name={focused ? activeIcons[route.name] : tabIcons[route.name]}
            size={24}
            color={focused ? colors.primary : colors.textMuted}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: tabLabels.plan }} />
      <Tabs.Screen name="kitchen" options={{ title: tabLabels.kitchen }} />
      <Tabs.Screen name="missing" options={{ title: tabLabels.missing }} />
      <Tabs.Screen name="shopping" options={{ title: tabLabels.shopping }} />
      <Tabs.Screen name="more" options={{ title: tabLabels.more }} />
    </Tabs>
  );
}
