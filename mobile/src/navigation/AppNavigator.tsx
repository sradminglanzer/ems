import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SetupMpinScreen from '../screens/auth/SetupMpinScreen';
import MainDrawerNavigator from './MainDrawerNavigator';
import AddMemberScreen from '../screens/main/AddMemberScreen';
import FeeGroupDetailsScreen from '../screens/main/FeeGroupDetailsScreen';
import MemberDetailsScreen from '../screens/main/MemberDetailsScreen';
import CreateExamScreen from '../screens/main/CreateExamScreen';
import ExamDetailsScreen from '../screens/main/ExamDetailsScreen';

type RootStackParamList = {
    Login: undefined;
    SetupMpin: { contactNumber: string };
    Main: undefined;
    AddMember: { feeGroupId?: string } | undefined;
    FeeGroupDetails: { group: any };
    MemberDetails: { member: any };
    CreateExam: undefined;
    ExamDetails: { exam: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { loading, user } = useContext(AuthContext);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user == null ? (
                    // No token found, user isn't signed in
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="SetupMpin" component={SetupMpinScreen} />
                    </>
                ) : (
                    // User is signed in
                    <>
                        <Stack.Screen name="Main" component={MainDrawerNavigator} />
                        <Stack.Screen name="AddMember" component={AddMemberScreen} />
                        <Stack.Screen name="FeeGroupDetails" component={FeeGroupDetailsScreen} />
                        <Stack.Screen name="MemberDetails" component={MemberDetailsScreen} />
                        <Stack.Screen name="CreateExam" component={CreateExamScreen} />
                        <Stack.Screen name="ExamDetails" component={ExamDetailsScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
