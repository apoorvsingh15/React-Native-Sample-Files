/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import { View, Platform, StatusBar } from 'react-native';
import { PersistGate } from 'redux-persist/es/integration/react';
import { Provider, connect } from 'react-redux';
import Routes from './config/Routes';
import configureStore from './config/configureStore';
import SplashScreen from 'react-native-splash-screen';
import firebase from 'react-native-firebase';
import { Toast } from 'react-native-redux-toast';
import Constants from './constants';
import Loader from './components/Loader';
import Progress from './components/Progress';
import Test from './containers/Test';

const { persistor, store } = configureStore();

export default class App extends Component {

    componentDidMount() {
        SplashScreen.hide();
    }

    render() {
        return (
            <View style={{ flex: 1 }}>
                <StatusBar
                    backgroundColor={Constants.Colors.BarnRedDark}
                    barStyle="light-content"
                />
                {Platform.OS === 'ios' && <View style={{ height: Constants.BaseStyle.isIPhoneX ? 44 : 20, zIndex: 20, backgroundColor: Constants.Colors.BarnRedDark }} />}
                <View style={{ flex: 1 }}>
                    <Provider store={store}>
                        <PersistGate loading={<Loader />} persistor={persistor}>
                            <Routes />
                            {/* <Test /> */}
                            <Progress color={Constants.Colors.BarnRed} animation={'fade'} size={Platform.OS === 'android' ? Constants.BaseStyle.DEVICE_WIDTH / 100 * 20 : 'large'} />
                            <Toast messageStyle={{ color: 'white', ...Constants.Fonts.Regular }} containerStyle={{ backgroundColor: Constants.Colors.BarnRed, paddingBottom: 10, }} />
                        </PersistGate>
                    </Provider>
                </View>
            </View>
        );
    }
} 
