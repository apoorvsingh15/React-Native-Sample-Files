import React, { Component } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import Constants from '../constants';
import Icon from 'react-native-vector-icons/FontAwesome';
import { login, recoverPassword, forgotPassword } from '../redux/modules/user/actions';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Regex from '../utilities/Regex';

const stageInit = 'Enter the email associated with your account, and we\'ll send you a secure link to reset your password';
const stageInitTop = 'Forgot your password?';

const stageMiddle = 'Please provide a verified email address so we can send you a secure link to reset your password';
const stageErrorTop = 'Hmm, something\'s not right';

const stageValidTop = 'That looks better!';

const stageSuccess = 'We have sent you a secure link to reset you password. Please check your inbox';
const stageSuccessTop = 'Perfect! Check your inbox';


class ForgetPassword extends Component {
    constructor() {
        super()
        this.state = {
            email: '',
            emailError: '',
            isEmailError: false,
            emailFocussed: false,
            stage: 1
        }
    }

    onPressRecoverPassword = () => {
        this.setState({
            isEmailError: false,
            emailError: ''
        })
        let emailError = '', isEmailError = false, stage = this.state.stage;
        if (this.state.email === '') {
            emailError = 'Please enter an email';
            isEmailError = true;
            stage = 2;
        } else if (!Regex.validateEmail(this.state.email)) {
            emailError = 'Please enter a valid email';
            isEmailError = true;
            stage = 2;
        }
        this.setState({ emailError, isEmailError, stage }, () => {
            if (!this.state.isEmailError) {
                this.props.forgotPassword({
                    action: 'forgot',
                    email: this.state.email
                })
                    .then(result => {
                        if (result.success) {
                            this.setState({ stage: 4 })
                        } else {
                            this.setState({ stage: 2, emailError: result.error, isEmailError: true })
                        }
                    }
                    )
                    .catch(error => { })
            }
        });
    }

    onChangeText = text => {
        this.setState({ email: text }, () => {
            if (this.state.isEmailError || this.state.stage === 3) {
                if (this.state.email === '') {
                    emailError = 'Please enter an email';
                    isEmailError = true;
                    stage = 2;
                } else if (!Regex.validateEmail(this.state.email)) {
                    emailError = 'Please enter a valid email';
                    isEmailError = true;
                    stage = 2;
                } else {
                    emailError = '';
                    isEmailError = false;
                    stage = 3;
                }
                this.setState({ emailError, isEmailError, stage })
            }
        })
    }

    render() {
        let topText, putEmailText;
        switch (this.state.stage) {
            case 1: {
                topText = stageInitTop;
                putEmailText = stageInit;
                break;
            }
            case 2: {
                topText = stageErrorTop;
                putEmailText = stageMiddle;
                break;
            }
            case 3: {
                topText = stageValidTop;
                putEmailText = stageMiddle;
                break;
            }
            case 4: {
                topText = stageSuccessTop;
                putEmailText = stageSuccess;
                break;
            }
        }
        return (
            <View style={styles.subWrapper}>
                {this.state.stage === 4 && <Image source={require('../assets/message.png')} style={styles.perfect} resizeMode={'contain'} />}
                <Text style={styles.topText}>{topText}</Text>
                <Text style={styles.putEmail}>{putEmailText}</Text>
                {this.state.stage !== 4 &&
                    <React.Fragment>
                        <Text style={[styles.label, this.state.emailFocussed && { color: Constants.Colors.BarnRed }, this.state.stage === 3 && { color: Constants.Colors.Green }]}>Email address</Text>
                        <View style={[styles.inputBox, this.state.emailError !== '' && styles.redBorder, this.state.emailFocussed && { borderColor: Constants.Colors.BarnRed }, this.state.stage === 3 && styles.greenBorder,]} >
                            <TextInput
                                style={styles.textInput}
                                onChangeText={this.onChangeText}
                                value={this.state.email}
                                placeholder={'Enter your email address'}
                                onFocus={() => this.setState({ emailFocussed: true, emailError: '' })}
                                onBlur={() => this.setState({ emailFocussed: false })}
                                returnKeyType={'go'}
                                autoFocus={true}
                                onSubmitEditing={this.onPressRecoverPassword}
                                textContentType={'emailAddress'}
                                textBreakStrategy={'highQuality'}
                            />
                            {this.state.emailError !== '' && <Icon name="exclamation-circle" size={15} color={Constants.Colors.Red} />}
                            {this.state.stage === 3 && <Icon name="check-circle" size={22} color={Constants.Colors.Green} />}
                        </View>
                    </React.Fragment>
                }
                {this.state.emailError !== '' && <View style={styles.errorWrap}>
                    <Icon name="exclamation-triangle" size={15} color={Constants.Colors.Red} />
                    <Text style={styles.error}>{this.state.emailError}</Text>
                </View>}
                {this.state.stage !== 4 ?
                    <TouchableOpacity
                        onPress={this.onPressRecoverPassword}
                        activeOpacity={0.9}
                        style={styles.loginButton}
                    >
                        <Text style={styles.login}>Recover password</Text>
                    </TouchableOpacity>
                    : <View style={styles.loginButton}>
                        <Text style={styles.login}>Check your inbox for secure link</Text>
                    </View>}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={this.props.switchToLogin}
                    hitSlop={{ top: 10, left: 10, bottom: 20, right: 20 }}
                >
                    <Text style={styles.logForget}>Login</Text>
                </TouchableOpacity>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    subWrapper: {
        flex: 1,
        padding: Constants.BaseStyle.DEVICE_WIDTH / 100 * 5.5,
        paddingTop: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 4.4,
        paddingBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 1
    },
    redBorder: {
        borderColor: Constants.Colors.Red
    },
    greenBorder: {
        borderColor: Constants.Colors.Green
    },
    topText: {
        alignSelf: 'center',
        paddingBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 2,
        ...Constants.Fonts.largeTitle,
        color: 'rgb(51, 53, 57)'
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
    loginButton: {
        marginTop: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 4,
        padding: Constants.BaseStyle.DEVICE_WIDTH / 100 * 4,
        alignItems: 'center',
        backgroundColor: Constants.Colors.CornFlowerBlue,
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 3,
        borderRadius: 2
    },
    login: {
        color: Constants.Colors.White,
        ...Constants.Fonts.smallBold,
        fontFamily: 'Arial-BoldMT',
        fontWeight: 'bold',
    },
    logForget: {
        color: Constants.Colors.Blue,
        ...Constants.Fonts.smallBold,
        fontFamily: 'Arial-BoldMT',
        fontWeight: 'bold',
        alignSelf: 'center'
    },
    borderBottom: {
        borderBottomWidth: 1,
        marginTop: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 6,
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 4
    },
    forget: {
        color: Constants.Colors.Blue,
        ...Constants.Fonts.Regular
    },
    error: {
        color: Constants.Colors.Red,
        marginLeft: Constants.BaseStyle.DEVICE_WIDTH / 100 * 2,
    },
    errorWrap: {
        marginTop: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    putEmail: {
        ...Constants.Fonts.Regular,
        lineHeight: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 3.5,
        fontFamily: 'ArialMT',
        textAlign: 'center',
        color: 'rgb(51, 53, 57)',
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 2,
        opacity: 0.7
    },
    perfect: {
        width: Constants.BaseStyle.DEVICE_WIDTH / 100 * 20,
        height: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 6,
        marginBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 3,
        alignSelf: 'center'
    }
})

const mapDispatchToProps = dispatch => ({
    recoverPassword: bindActionCreators(recoverPassword, dispatch),
    forgotPassword: bindActionCreators(forgotPassword, dispatch),
})

export default connect(null, mapDispatchToProps)(ForgetPassword);
