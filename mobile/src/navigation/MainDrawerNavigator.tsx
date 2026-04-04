import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Constants from 'expo-constants';

import DashboardScreen from '../screens/main/DashboardScreen';
import ReportsScreen from '../screens/main/ReportsScreen';
import StaffScreen from '../screens/main/StaffScreen';
import FeeGroupsScreen from '../screens/main/FeeGroupsScreen';
import FeeStructureScreen from '../screens/main/FeeStructureScreen';
import ExamsScreen from '../screens/main/ExamsScreen';
import MembersScreen from '../screens/main/MembersScreen';
import CreateExamScreen from '../screens/main/CreateExamScreen';
import AcademicYearsScreen from '../screens/main/AcademicYearsScreen';
import HeaderActions from '../components/HeaderActions';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { AuthContext } from '../context/AuthContext';
import { getTerm } from '../utils/terminology';

type DrawerParamList = {
    DashboardHome: undefined;
    Reports: undefined;
    Students: undefined;
    Staff: undefined;
    FeeGroups: undefined;
    FeeStructures: undefined;
    Exams: undefined;
    AcademicYears: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

function CustomDrawerContent(props: any) {
    const { signOut, user } = React.useContext(AuthContext);

    // Prefer the exact entity name from the database, fallback to Expo config name
    const appName = user?.entityName || Constants.expoConfig?.name || 'EMS Portal';
    const roleDisplay = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Administrator';

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ backgroundColor: theme.colors.primary, paddingTop: 0 }}>
                <View style={styles.drawerHeader}>
                    <Ionicons name="school" size={60} color={theme.colors.surface} />
                    <Text style={styles.drawerTitle}>{appName}</Text>
                    <Text style={styles.drawerSubtitle}>{roleDisplay}</Text>
                </View>
                <View style={styles.drawerListWrapper}>
                    <DrawerItemList {...props} />
                </View>
            </DrawerContentScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
                <Text style={styles.footerText}>Version 1.0.0</Text>
            </View>
        </View>
    );
}

export default function MainDrawerNavigator() {
    const { user } = React.useContext(AuthContext);

    return (
        <Drawer.Navigator
            initialRouteName="DashboardHome"
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    backgroundColor: theme.colors.surface,
                    elevation: 0, // Android shadow removal
                    shadowOpacity: 0, // iOS shadow removal
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                },
                headerTintColor: theme.colors.textPrimary,
                headerTitleStyle: {
                    fontWeight: '600',
                    fontSize: 22,
                },
                drawerActiveBackgroundColor: theme.colors.primary + '20',
                drawerActiveTintColor: theme.colors.primary,
                drawerInactiveTintColor: theme.colors.textSecondary,
                drawerLabelStyle: {
                    fontSize: 16,
                    fontWeight: '600',
                    marginLeft: -10,
                },
                drawerStyle: {
                    backgroundColor: theme.colors.surface,
                    width: 280,
                },
            }}
        >
            <Drawer.Screen
                name="DashboardHome"
                component={DashboardScreen}
                options={{
                    title: 'Dashboard',
                    drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
                    headerRight: () => <HeaderActions />
                }}
            />
            <Drawer.Screen
                name="Reports"
                component={ReportsScreen}
                options={{
                    title: 'Business Reports',
                    drawerIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Students"
                component={MembersScreen}
                options={{
                    title: getTerm('Students', user?.entityType),
                    drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />
                }}
            />
            {user?.role !== 'teacher' && (
                <Drawer.Screen
                    name="Staff"
                    component={StaffScreen}
                    options={{
                        title: 'Staff Management',
                        drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />
                    }}
                />
            )}
            {user?.entityType !== 'gym' && (
                <Drawer.Screen
                    name="FeeGroups"
                    component={FeeGroupsScreen}
                    options={{
                        title: getTerm('Classes', user?.entityType),
                        drawerIcon: ({ color }) => <Ionicons name="layers-outline" size={22} color={color} />,
                        headerRight: () => <HeaderActions />
                    }}
                />
            )}
            {user?.role !== 'teacher' && (
                <Drawer.Screen
                    name="FeeStructures"
                    component={FeeStructureScreen}
                    options={{
                        title: user?.entityType === 'gym' ? 'Billing Plans' : 'Fee Structures',
                        drawerIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />
                    }}
                />
            )}
            {user?.entityType !== 'gym' && (
                <Drawer.Screen
                    name="Exams"
                    component={ExamsScreen}
                    options={{
                        title: 'Exams & Results',
                        drawerIcon: ({ color }) => <Ionicons name="document-text-outline" size={24} color={color} />,
                        headerRight: () => <HeaderActions />
                    }}
                />
            )}
            {(user?.role === 'admin' || user?.role === 'owner') && user?.entityType !== 'gym' && (
                <Drawer.Screen
                    name="AcademicYears"
                    component={AcademicYearsScreen}
                    options={{
                        drawerIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
                        title: 'Academic Years',
                        drawerItemStyle: { marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }
                    }}
                />
            )}
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        backgroundColor: theme.colors.primary,
        padding: 24,
        paddingTop: 48,
        alignItems: 'center',
        borderBottomRightRadius: 24,
    },
    drawerTitle: {
        color: theme.colors.surface,
        fontSize: 24,
        fontWeight: '600',
        marginTop: 12,
        letterSpacing: 1,
    },
    drawerSubtitle: {
        color: theme.colors.surface + 'CC',
        fontSize: 14,
        marginTop: 4,
    },
    drawerListWrapper: {
        backgroundColor: theme.colors.surface,
        paddingTop: 16,
        borderTopLeftRadius: 24,
        marginTop: -20,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        alignItems: 'center',
    },
    footerText: {
        color: theme.colors.textMuted,
        fontSize: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        width: '100%',
        justifyContent: 'center',
        marginBottom: 12,
        backgroundColor: theme.colors.danger + '10',
        borderRadius: 8,
    },
    logoutText: {
        color: theme.colors.danger,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
