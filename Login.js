import React, { Component } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Linking, Platform } from 'react-native';
import Constants from '../constants';
import Icon from 'react-native-vector-icons/FontAwesome';
import { login, recoverPassword, forgotPassword } from '../redux/modules/user/actions';
import { toast } from '../redux/modules/app/actions';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Regex from '../utilities/Regex';
import ForgetPassword from './ForgetPassword';
import Mixpanel from 'react-native-mixpanel';
import Logo from '../components/Logo';
import { openWithChromeOrSafari, isAllowedToReadPost } from '../utilities/CommonMethods';
import { BaseURL } from '../config/connection';
import OfflineNotice from '../components/OfflineNotice';

const NAVBAR_HEIGHT = Constants.BaseStyle.DEVICE_HEIGHT / 100 * 8;

function Header() {
    if (Platform.OS === 'ios') {
        return <Logo />
    }
    return <View style={[styles.navbar,]}>
        <View />
        <Logo />
        <View style={{ width: 70 }} />
    </View>
}

class Login extends Component {
    static navigationOptions = {
        headerStyle: {
            backgroundColor: Constants.Colors.BarnRed,
        },
        headerTintColor: '#fff',
        headerTitle: <Header />
    }
    constructor() {
        super()
        this.state = {
            email: '',
            password: '',
            screen: 'login',
            emailError: '',
            passwordError: '',
            isEmailError: false,
            isPasswordError: false,
            emailFocussed: false,
            passwordFocussed: false,
            passwordVisible: false
        }
    }

    onPressLogin = () => {
        // this.props.dispatch(ToastActionsCreators.displayInfo('emptyMobile'))
        let emailError = '', passwordError = '', error = false;
        if (this.state.email === '') {
            emailError = 'Please enter username or email';
            error = true;
        }

        if (this.state.password === '') {
            passwordError = 'Please enter password';
            error = true;
        }
        // } else if (!Regex.validatePassword(this.state.password)) {
        //     passwordError = 'invalid password';
        //     error = true;
        // }
        this.setState({ emailError, passwordError, error }, () => {
            const data = {
                email: this.state.email,
                password: this.state.password
            }
            if (!this.state.error) {
                const data = {
                    action: 'login',
                    username: this.state.email,
                    password: this.state.password,
                    rememberme: 'forever'
                }
                this.props.login(data)
                    .then(result => {
                        const posts = this.props.navigation.getParam('posts', [])
                        const index = this.props.navigation.getParam('index', 0)
                        const category = this.props.navigation.getParam('category')
                        const homeKey = this.props.navigation.getParam('homeKey')
                        const key = this.props.navigation.state.key
                        if (posts.length !== 0) {
                            const data = {
                                posts,
                                index,
                                key,
                                category,
                                homeKey
                            }
                            const isAllowedToReadArticle = isAllowedToReadPost(result.payment_plan)
                            if (isAllowedToReadArticle) {
                                this.props.navigation.navigate('SinglePost', data)
                            } else {
                                this.props.toast('Our articles are only available to standard and premium subscribers. Please visit our website to upgrade');
                                this.props.navigation.navigate('Home')
                            }
                            this.mixpanelUpdateUser(result);
                        } else {
                            this.props.navigation.navigate('Home')
                        }
                    })
                    .catch(error => {
                        if (error === 'Invalid credentials') {
                            this.setState({
                                emailError: 'We couldn\'t find that login/password combination. Please try again.'
                            })
                        }
                        console.log('error', error);
                    })
            }
        });
    }

    mixpanelUpdateUser = (user) => {
        Mixpanel.reset();
        if (user.user_id) {
            Mixpanel.identify(user.user_id.toString())
            Mixpanel.setOnce({
                "Push Notifications": JSON.stringify(this.props.app.notification),
                "Mobile": true,
                "User type": "Registered",
                "$email": user.email,
                "$username": user.login,
                "WP ID": user.user_id.toString()
            });

            Mixpanel.registerSuperPropertiesOnce({
                "Name": user.display_name,
                "User type": "Registered",
                "$email": user.email,
                "$username": user.login,
                "WP ID": user.user_id.toString()
            });
        }
    }

    openSiteRegisterPage = () => {
        const url = BaseURL + '/register/';
        Linking.canOpenURL(url).then(supported => {
            if (!supported) {
                console.log('Can\'t handle url: ' + url);
            } else {
                return Linking.openURL(url);
            }
        }).catch(err => console.error('An error occurred', err));
    }

    render() {
        // console.log('this.props at Login screen', this.props)
        return (
            <View style={styles.container}>
                {/* <View style={[styles.navbar, this.props.style]}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => this.props.navigation.goBack()}>
                        <Icon name="arrow-left" size={30} color={"#fff"} />
                    </TouchableOpacity>
                    <Image resizeMode={'contain'} style={styles.logo} source={require('../assets/logo.png')} />
                    <View style={{ width: 30 }} />
                </View> */}
                <ScrollView contentContainerStyle={styles.wrapper}>
                    {(this.state.screen === 'login') && <View style={styles.subWrapper}>
                        <Text style={styles.topText}>{'Login to your account'}</Text>
                        <Text style={[styles.label, this.state.emailFocussed && { color: Constants.Colors.BarnRed }]}>Username or email</Text>
                        <View style={[styles.inputBox, this.state.emailError !== '' && styles.redBorder, this.state.emailFocussed && { borderColor: Constants.Colors.BarnRed }]} >
                            <TextInput
                                style={styles.textInput}
                                onChangeText={(text) => this.setState({ email: text })}
                                value={this.state.email}
                                placeholder={'Enter your username or email'}
                                onFocus={() => this.setState({ emailFocussed: true, emailError: '' })}
                                onBlur={() => this.setState({ emailFocussed: false })}
                                returnKeyType={'next'}
                                autoFocus={true}
                                onSubmitEditing={() => this.passwordInput.focus()}
                                textContentType={'emailAddress'}
                                textBreakStrategy={'highQuality'}
                            />
                            {this.state.emailError !== '' && <Icon name="exclamation-circle" size={15} color={Constants.Colors.Red} />}
                        </View>
                        {this.state.emailError !== '' && <View style={styles.errorWrap}>
                            <Icon name="exclamation-triangle" size={15} color={Constants.Colors.Red} />
                            {/* <Text style={styles.error}>{'This password does not match the account email address'}</Text> */}
                            <Text style={styles.error}>{this.state.emailError}</Text>
                        </View>}
                        <View style={styles.marginBottom} />
                        <Text style={[styles.label, this.state.passwordFocussed && { color: Constants.Colors.BarnRed }]}>Password</Text>
                        <View
                            style={[styles.inputBox, this.state.passwordError !== '' && styles.redBorder, this.state.passwordFocussed && { borderColor: Constants.Colors.BarnRed }]}
                        >
                            <View style={styles.lock}>
                                <Icon name="lock" size={15} color={Constants.Colors.LightGray} style={styles.marginLeft} />
                                <TextInput
                                    ref={passwordInput => this.passwordInput = passwordInput}
                                    style={styles.textInput}
                                    onChangeText={(text) => this.setState({ password: text })}
                                    value={this.state.password}
                                    secureTextEntry={!this.state.passwordVisible}
                                    placeholder={'Enter your password'}
                                    onFocus={() => this.setState({ passwordFocussed: true, passwordError: '' })}
                                    onBlur={() => this.setState({ passwordFocussed: false })}
                                    // returnKeyType={Platform.OS === 'android' ? 'go' : ''}
                                    returnKeyType={'go'}
                                    onSubmitEditing={this.onPressLogin}
                                    textContentType={'password'}
                                />
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    style={styles.passwordVisibilityToggle}
                                    onPress={() => this.setState({ passwordVisible: !this.state.passwordVisible })}
                                    hitSlop={{ top: 20, left: 20, bottom: 20, right: 20 }}
                                >
                                    {this.state.passwordVisible
                                        ? <Icon name="eye" size={20} color={Constants.Colors.LightDarkGrey} style={styles.marginLeft} />
                                        : <Icon name="eye-slash" size={20} color={Constants.Colors.LightDarkGrey} style={styles.marginLeft} />
                                    }
                                </TouchableOpacity>
                            </View>
                            {this.state.passwordError !== '' &&
                                <Icon name="exclamation-circle" style={{ paddingLeft: Constants.BaseStyle.DEVICE_WIDTH / 100 * 2 }} size={15} color={Constants.Colors.Red} />
                            }
                        </View>
                        {this.state.passwordError !== '' && <View style={styles.errorWrap}>
                            <Icon name="exclamation-triangle" size={15} color={Constants.Colors.Red} />
                            <Text style={styles.error}>{this.state.passwordError}</Text>
                        </View>}
                        <View style={styles.marginBottom} />
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => this.setState({ screen: 'forget' })}
                            hitSlop={{ top: 10, left: 0, bottom: 20, right: 0 }}
                        >
                            <Text style={styles.forget}>Forgotten password?</Text>
                        </TouchableOpacity>
                        <View style={styles.marginBottom} />
                        <TouchableOpacity onPress={this.onPressLogin} activeOpacity={0.9} style={styles.loginButton}><Text style={styles.login}>Login</Text></TouchableOpacity>
                        <TouchableOpacity onPress={this.openSiteRegisterPage} activeOpacity={0.9} style={styles.registerButton}><Text style={styles.signup}>Sign up</Text></TouchableOpacity>
                        <View style={styles.borderBottom} />
                        <Text style={styles.terms}>
                            {'By proceeding, you agree to the Undercurrent News\' '}
                            <Text
                                style={styles.CornFlowerBlue}
                                onPress={() => openWithChromeOrSafari(`${BaseURL}/terms-and-conditions/`)}
                            >
                                Terms of Service
                            </Text>
                            {' & '}
                            <Text
                                style={styles.CornFlowerBlue}
                                onPress={() => openWithChromeOrSafari(`${BaseURL}/privacy-policy/`)}
                            >
                                {'Privacy Policy'}
                            </Text>
                        </Text>

                    </View>}

                    {(this.state.screen === 'forget') && <ForgetPassword switchToLogin={() => this.setState({ screen: 'login' })} />
                    }
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{`© ${new Date().getFullYear()} Undercurrent News.`}</Text>
                        <Text style={styles.footerText}>All rights reserved.</Text>
                    </View>
                </ScrollView>
                <OfflineNotice/>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Constants.Colors.White
    },
    navbar: {
        width: '100%',
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Constants.Colors.BarnRed,
        paddingHorizontal: Constants.BaseStyle.DEVICE_WIDTH / 100 * 4,
        height: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 8,
    },
    wrapper: {
        flexGrow: 1,
    },
    subWrapper: {
        flex: 1,
        padding: Constants.BaseStyle.DEVICE_WIDTH / 100 * 5.5,
        paddingTop: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 4.4,
        paddingBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 1
    },
    redBorder: {
        borderColor: Constants.Colors.Red
    },
    topText: {
        alignSelf: 'center',
        paddingBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 4,
        ...Constants.Fonts.largeTitle,
        color: 'rgb(51, 53, 57)',
        lineHeight: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 5.2
    },
    footer: {
        backgroundColor: Constants.Colors.BarnRed,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Constants.BaseStyle.DEVICE_WIDTH / 100 * 5,
    },
    footerText: {
        color: Constants.Colors.White,
        fontSize: Constants.Fonts.mediumLargeBold.fontSize,
        fontFamily: 'Arial-BoldMT',
        fontWeight: 'bold',
        color: 'rgb(214, 166, 165)'
    },
    label: {
        paddingBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 1,
        ...Constants.Fonts.extraSmallRegular,
        fontFamily: 'ArialMT',
        color: 'rgb(156, 156, 156)',
    },
    inputBox: {
        // height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: Constants.BaseStyle.DEVICE_WIDTH / 100 * 3
    },
    textInput: {
        flex: 1,
        paddingLeft: Constants.BaseStyle.DEVICE_WIDTH / 100 * 3,
        ...Platform.select({
            ios: {
                paddingVertical: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 2
            }
        }),
        color: 'rgb(87, 87, 92)',
        ...Constants.Fonts.Regular,
        fontFamily: 'ArialMT'
    },
    marginBottom: {
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 4
    },
    marginLeft: {
        marginLeft: Constants.BaseStyle.DEVICE_WIDTH / 100 * 3
    },
    loginButton: {
        padding: Constants.BaseStyle.DEVICE_WIDTH / 100 * 4,
        alignItems: 'center',
        backgroundColor: Constants.Colors.CornFlowerBlue,
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 3,
        borderRadius: 2
    },
    registerButton: {
        padding: Constants.BaseStyle.DEVICE_WIDTH / 100 * 4,
        alignItems: 'center',
        borderColor: Constants.Colors.CornFlowerBlue,
        borderWidth: 1,
        borderRadius: 2
    },
    lock: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    login: {
        color: Constants.Colors.White,
        ...Constants.Fonts.smallBold,
        fontFamily: 'Arial-BoldMT',
        fontWeight: 'bold',
    },
    signup: {
        color: Constants.Colors.CornFlowerBlue,
        ...Constants.Fonts.smallBold,
        fontFamily: 'Arial-BoldMT',
        fontWeight: 'bold',
    },
    logForget: {
        color: Constants.Colors.Blue,
        ...Constants.Fonts.smallBold,
        alignSelf: 'center'
    },
    borderBottom: {
        borderBottomWidth: 1,
        marginTop: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 6,
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 4
    },
    terms: {
        textAlign: 'center',
        ...Constants.Fonts.Regular,
        fontFamily: 'ArialMT',
        height: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 10,
        lineHeight: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 3.2,
        color: 'rgb(94, 96, 99)'
    },
    CornFlowerBlue: {
        color: Constants.Colors.CornFlowerBlue
    },
    forget: {
        color: 'rgb(82, 170, 221)',
        ...Constants.Fonts.Regular,
        fontFamily: 'ArialMT',
        letterSpacing: 0
    },
    error: {
        color: Constants.Colors.Red,
        marginLeft: Constants.BaseStyle.DEVICE_WIDTH / 100 * 2,
    },
    errorWrap: {
        marginTop: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: Constants.BaseStyle.DEVICE_WIDTH / 100 * 3
    },
    putEmail: {
        ...Constants.Fonts.Regular,
        textAlign: 'center',
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 6
    },
    logo: {
        height: Constants.BaseStyle.DEVICE_WIDTH / 100 * 6.1
    },
    passwordVisibilityToggle: {
        // backgroundColor: 'red',
    }
})

const mapStateToProps = state => ({
    app: state.app,
    posts: state.posts,
    state: state
});

const mapDispatchToProps = dispatch => ({
    login: bindActionCreators(login, dispatch),
    recoverPassword: bindActionCreators(recoverPassword, dispatch),
    forgotPassword: bindActionCreators(forgotPassword, dispatch),
    toast: bindActionCreators(toast, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(Login);
