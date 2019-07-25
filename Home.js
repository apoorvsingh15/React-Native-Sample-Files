import React, { Component } from 'react';
import { StyleSheet, View, Animated, BackHandler, Platform } from 'react-native';
import Constants from '../constants';
import Header from './Header';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { getPosts, refreshPosts } from '../redux/modules/post/actions';
import ScrollableTabView, { ScrollableTabBar } from 'react-native-scrollable-tab-view';
import PostList from './PostList';
import { getPageNumber, getCategoryName, CATEGORIES, isAllowedToReadPost } from '../utilities/CommonMethods';
import { updateNotificationSettings, updateDeviceInfo, toast } from '../redux/modules/app/actions';
import { logout, tokenValidateByBackend } from '../redux/modules/user/actions';
import firebase from 'react-native-firebase';
import { ToastActionsCreators } from 'react-native-redux-toast';
import Mixpanel from 'react-native-mixpanel';
import { NavigationActions } from 'react-navigation';
import branch from 'react-native-branch'
import { BaseURL } from '../config/connection';

const NAVBAR_HEIGHT = Constants.BaseStyle.DEVICE_HEIGHT / 100 * 8;
const AnimatedHeader = Animated.createAnimatedComponent(Header);

class Home extends Component {
  static navigationOptions = {
    header: null
  }
  _didFocusSubscription;
  _willBlurSubscription;

  constructor(props) {
    super(props)
    const scrollAnim = new Animated.Value(0);
    const offsetAnim = new Animated.Value(0);

    this.state = {
      refreshing: [],
      endReached: false,
      page: 0,
      scrollAnim,
      offsetAnim,
      backButtonPressCount: 0,
      clampedScroll: Animated.diffClamp(
        Animated.add(
          scrollAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
            extrapolateLeft: 'clamp',
          }),
          offsetAnim,
        ),
        0,
        NAVBAR_HEIGHT,
      ),
    }
    this._didFocusSubscription = props.navigation.addListener('didFocus', payload =>
      BackHandler.addEventListener('hardwareBackPress', this.onBackButtonPressAndroid)
    );
  }

  async componentDidMount() {
    this.mounted = true;
    this._willBlurSubscription = this.props.navigation.addListener('willBlur', payload =>
      BackHandler.removeEventListener('hardwareBackPress', this.onBackButtonPressAndroid)
    );
    const context = this;
    if (this.props.posts.home.data.length === 0) {
      this._onRefresh('home')
    }

    //for branch.io subscribe
    branch.subscribe(({ error, params }) => {
      if (error) {
        console.error('Error from Branch: ' + error)
        return
      }

      console.log('params', params);
      // params will never be null if error is null
    })

    let lastParams = await branch.getLatestReferringParams() // params from last open
    let installParams = await branch.getFirstReferringParams() // params from original install

    //for mixpanel initialisation
    await this.mixpanelInitialisation();

    //user token valid check
    this.validateUserTokenExpiry();

    if (Platform.OS === 'ios') {
      firebase.messaging().hasPermission()
        .then(enabled => {
          if (!enabled) {
            firebase.messaging().requestPermission()
              .then(() => {
                // alert("User Now Has Permission")
              })
              .catch(error => {
                alert("Error", error)
                // User has rejected permissions  
              });
          }
        });
    }

    this.messageListener = firebase.messaging().onMessage((message) => {
      console.log('message', message);
      // Process your message as required
    });
    const notificationOpen = await firebase.notifications().getInitialNotification();
    console.log('notificationOpen', notificationOpen);
    if (notificationOpen) {
      const action = notificationOpen.action;
      const notification = notificationOpen.notification;
      var seen = [];
      // alert(JSON.stringify(notification.data, function (key, val) {
      //     if (val != null && typeof val == "object") {
      //         if (seen.indexOf(val) >= 0) {
      //             return;
      //         }
      //         seen.push(val);
      //     }
      //     return val;
      // }));
      if (notification._data.postId) {
        this.props.navigation.navigate('NotificationPost', { postId: notification._data.postId })
      }
    }

    this.messageListener = firebase.messaging().onMessage((message) => {
      console.log('messageListener', message)
      // Process your message as required
    });
    const channel = new firebase.notifications.Android.Channel('test-channel', 'Test Channel', firebase.notifications.Android.Importance.Max)
      .setDescription('My apps test channel');
    // Create the channel
    firebase.notifications().android.createChannel(channel);

    this.notificationDisplayedListener = firebase.notifications().onNotificationDisplayed((notification) => {
      console.log('in notificationDisplayedListener');
      // Process your notification as required
      // ANDROID: Remote notifications do not contain the channel ID. You will have to specify this manually if you'd like to re-display the notification.
    });

    this.notificationListener = firebase.notifications().onNotification((notification) => {
      console.log('in notificationListener', notification);
      // Process your notification as required
      notification
        .android.setChannelId('test-channel')
        .android.setSmallIcon('ic_notification')
        .android.setColor(Constants.Colors.BarnRed);

      firebase.notifications().displayNotification(notification);

    });

    this.notificationOpenedListener = firebase.notifications().onNotificationOpened((notificationOpen) => {
      // Get the action triggered by the notification being opened
      const action = notificationOpen.action;
      // Get information about the notification that was opened
      const notification = notificationOpen.notification;
      console.log('in notificationOpenedListener ********', notification)
      // var seen = [];
      // alert(JSON.stringify(notification.data, function (key, val) {
      //     if (val != null && typeof val == "object") {
      //         if (seen.indexOf(val) >= 0) {
      //             return;
      //         }
      //         seen.push(val);
      //     }
      //     return val;
      // }));
      firebase.notifications().removeDeliveredNotification(notification.notificationId);

      if (notification._data.postId) {
        this.props.navigation.navigate('NotificationPost', { postId: notification._data.postId })
      }

    });



    const fcmToken = await firebase.messaging().getToken();
    if (fcmToken) {
      if (Platform.OS === 'android') {
        Mixpanel.setPushRegistrationId(fcmToken);
      }

      // user has a device token
      if (context.props.app.device.token === '') {
        const data = {
          device_token: fcmToken,
          device_type: Platform.OS === 'android' ? 1 : 2
        }

        let formBody = [];
        for (let property in data) {
          let encodedKey = encodeURIComponent(property);
          let encodedValue = encodeURIComponent(data[property]);
          formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");
        // console.log('data', data);
        fetch(`${BaseURL}/oauth/notify_device`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formBody,
        })
          .then(response => response.json())
          .then(result => {
            // console.log('result', result)
            context.props.updateDeviceInfo(fcmToken);
            context.props.updateNotificationSettings(fcmToken, 1, 1, 1)
          })
          .catch(error => console.log('error', error))
      }
    }

  }

  componentWillReceiveProps(nextProps) {
    let category = this.props.navigation.getParam('category', 'home')
    let newCat = nextProps.navigation.getParam('category', 'home')
    if (category !== newCat) {
      let page = getPageNumber(newCat)
      this.setState({ page })
      // if (this.props.posts[newCat].data.length === 0) {
      //   this._onRefresh(newCat)
      // }
    }
  }

  mixpanelInitialisation = () => {
    Mixpanel.sharedInstanceWithToken('bd075af8b64c8b0bb1cbcb02f832b47e').then(() => { //LIVE
      // Mixpanel.sharedInstanceWithToken('a813a8c0e79ff475a36ac15542721c51').then(() => { //pankaj mixpanel key for test
      //mixpanel.init('873b12b0cc0aed8b41b565008ef4279a', //STAGING
      Mixpanel.increment('App opens', 1)
      const user = this.props.user.userData;
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
      } else {
        Mixpanel.setOnce({
          "Push Notifications": JSON.stringify(this.props.app.notification),
          "Mobile": true,
          "User type": "Unregistered",
          "User plan": ""
        })
        Mixpanel.registerSuperPropertiesOnce({
          "User type": "Unregistered",
          "User plan": ""
        });
      }
      this.mixpanelUpdateCategories('home');
    });

  }

  validateUserTokenExpiry = () => {
    if (this.props.user.userData.session_token) {
      let currentTimestamp = Math.round(+new Date() / 1000); console.log('currentTimestamp', currentTimestamp)
      if (currentTimestamp > this.props.user.userData.expiration) {
        const data = {
          action: 'logout',
          session_token: this.props.user.userData.session_token
        }
        this.props.logout(data, false)
          .then(() => {
            this.props.toast('session token expired, login again');
          })
      } else {
        this.props.tokenValidateByBackend({ action: 'validate', session_token: this.props.user.userData.session_token });
      }
    }
  }

  onBackButtonPressAndroid = () => {
    this.props.navigation.dispatch(ToastActionsCreators.displayInfo('press back again to exit'));
    let noBack;
    this.mounted && this.setState((prevState, props) => ({ backButtonPressCount: prevState.backButtonPressCount + 1 }),
      () => {
        if (this.state.backButtonPressCount > 1) {
          noBack = false
        } else {
          this.props.toast('press back again to exit');
          noBack = true
        }
        this.timeoutId = setTimeout(() => this.mounted && this.setState({ backButtonPressCount: 0 }), 3000)
      }
    )
    return noBack
  };

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    this.mounted = false;
    clearTimeout(this.timeoutId);
    this.notificationDisplayedListener();
    this.notificationListener();
    this.notificationOpenedListener();
    this.messageListener();
  }

  refreshingVariables = []

  _onRefresh = (category) => {
    if (!this.refreshingVariables.includes(category)) {
      this.refreshingVariables = [...this.refreshingVariables, category]
      this.setState({ refreshing: this.refreshingVariables })
    }
    this.props.getPosts(category, 0, true)
      .then(() => this.closeRefreshingState(category))
      .catch(error => this.closeRefreshingState(category));
  }

  closeRefreshingState = category => {
    const index = this.refreshingVariables.indexOf(category)
    if (index > -1) {
      let deleted = this.refreshingVariables.splice(index, 1);
      this.setState({ refreshing: this.refreshingVariables })
    }
  }

  onChangeTab = tab => {
    const category = getCategoryName(tab.i)
    this.setState({ page: tab.i }, () => this.mixpanelUpdateCategories(category))
    if (this.props.posts[category].data.length === 0) {
      this._onRefresh(category)
    }
    const navigateAction = NavigationActions.setParams({
      params: { category },
      key: this.props.navigation.state.key
    });
    this.props.navigation.dispatch(navigateAction);
  }

  mixpanelUpdateCategories = category => {
    const section_data = {
      'Page name': category,
      // 'Page url': post.link,
      'Category': 'Section'
    };
    Mixpanel.trackWithProperties('Load page', section_data)

  }

  onPressShowPost = (category, index) => {
    const data = {
      posts: this.props.posts[category].data,
      index,
      category,
      homeKey: this.props.navigation.state.key
    }
    if (category === 'liveblog') {
      this.props.navigation.navigate('SinglePost', data)
    } else if (this.props.user.userData.session_token) {
      const isAllowedToReadArticle = isAllowedToReadPost(this.props.user.userData.payment_plan)
      if (isAllowedToReadArticle) {
        this.props.navigation.navigate('SinglePost', data)
      } else {
        this.props.toast('Our articles are only available to standard and premium subscribers. Please visit our website to upgrade');
      }
    } else {
      this.props.navigation.navigate('Login', data)
    }
  }

  onPressRight = () => {
    this.props.refreshPosts();
    const category = getCategoryName(this.state.page)
    this._onRefresh(category);
  }

  renderCatTab = () => {
    return CATEGORIES.map(cat =>
      <PostList
        key={cat.id}
        onPressShowPost={index => this.onPressShowPost(cat.id, index)}
        _onRefresh={() => this._onRefresh(cat.id)}
        onEndReached={() => this.onEndReached(cat.id)}
        refreshing={this.state.refreshing.includes(cat.id)}
        endReached={this.state.endReached === cat.id}
        tabLabel={cat.label.charAt(0) + cat.label.substr(1).toLowerCase()}
        data={this.props.posts[cat.id]}
        onScroll={Platform.OS === 'ios' ? undefined : Animated.event(
          [{ nativeEvent: { contentOffset: { y: this.state.scrollAnim } } }],
          { useNativeDriver: true },
        )}
      />
    )
  }

  onEndReached = category => {
    if (this.state.endReached !== category) {
      this.setState({ endReached: category })
      let data = this.props.posts[category]
      this.props.getPosts(category, data.data.length)
        .then(() => this.setState({ endReached: false }))
        .catch(error => this.setState({ endReached: false }));
    }
  }


  render() {
    let { navigation } = this.props;
    const { clampedScroll } = this.state;

    const navbarTranslate = clampedScroll.interpolate({
      inputRange: [0, NAVBAR_HEIGHT],
      outputRange: [0, -(NAVBAR_HEIGHT)],
      extrapolate: 'clamp',
    });
    const navbarTranslate2 = clampedScroll.interpolate({
      inputRange: [0, NAVBAR_HEIGHT],
      outputRange: [NAVBAR_HEIGHT, 0],
      extrapolate: 'clamp',
    });

    return <View style={styles.container}>
      {Platform.OS === 'ios' && <AnimatedHeader
        style={[styles.navbar, { position: 'relative' }, { transform: [{ translateY: navbarTranslate }] }]}
        onPress={navigation.openDrawer}
        onPressRight={this.onPressRight}
      />}

      <ScrollableTabView
        style={styles.scrollStyle}
        renderTabBar={() => <ScrollableTabBar
          style={[styles.tabBarStyle, Platform.OS === 'ios' ? { position: 'relative' } : { transform: [{ translateY: navbarTranslate2 }] }]}
          tabStyle={styles.tabStyle}
          tabsContainerStyle={{ paddingVertical: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 2, }}
        />}
        tabBarActiveTextColor={Constants.Colors.White}
        tabBarUnderlineStyle={styles.tabBarUnderline}
        tabBarTextStyle={{ ...Constants.Fonts.RegularTab, color: Constants.Colors.White }}
        tabBarBackgroundColor={Constants.Colors.White}
        onChangeTab={this.onChangeTab}
        page={this.state.page}
        scrollWithoutAnimation={true}
        prerenderingSiblingsNumber={1}
      >
        {this.renderCatTab()}
      </ScrollableTabView>
      {Platform.OS === 'android' && <AnimatedHeader
        style={[styles.navbar, { transform: [{ translateY: navbarTranslate }] }]}
        onPress={navigation.openDrawer}
        onPressRight={this.onPressRight}
      />}
    </View>
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  tabBarUnderline: {
    backgroundColor: Constants.Colors.BarnRed,
    height: 0
  },
  flatlist: {
    backgroundColor: Constants.Colors.White
  },
  updationTime: {
    paddingHorizontal: Constants.BaseStyle.DEVICE_WIDTH / 100 * 4,
    paddingVertical: Constants.BaseStyle.DEVICE_WIDTH / 100 * 2,
  },
  itemWrapper: {
    width: '100%',
    padding: Constants.BaseStyle.DEVICE_WIDTH / 100 * 4,
    borderBottomWidth: 1,
    borderBottomColor: Constants.Colors.Grey
  },
  tabStyle: {
    paddingHorizontal: Constants.BaseStyle.DEVICE_WIDTH / 100 * 2.4,
    paddingTop: Constants.BaseStyle.DEVICE_WIDTH / 100 * 1.5,
    paddingBottom: Constants.BaseStyle.DEVICE_WIDTH / 100 * 1.5,
    marginHorizontal: Constants.BaseStyle.DEVICE_WIDTH / 100 * 2.0,
    opacity: 0.5
  },
  scrollStyle: {
  },
  tabBarStyle: {
    position: 'absolute',
    borderBottomWidth: 0,
    elevation: 3,
    backgroundColor: Constants.Colors.BarnRed,
    // paddingVertical: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 2,
    // paddingBottom: Constants.BaseStyle.DEVICE_HEIGHT / 100 * 3,
  },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NAVBAR_HEIGHT,
  },
})

const mapStateToProps = state => ({
  app: state.app,
  posts: state.posts,
  user: state.user
});

const mapDispatchToProps = dispatch => ({
  getPosts: bindActionCreators(getPosts, dispatch),
  refreshPosts: bindActionCreators(refreshPosts, dispatch),
  updateNotificationSettings: bindActionCreators(updateNotificationSettings, dispatch),
  updateDeviceInfo: bindActionCreators(updateDeviceInfo, dispatch),
  toast: bindActionCreators(toast, dispatch),
  logout: bindActionCreators(logout, dispatch),
  tokenValidateByBackend: bindActionCreators(tokenValidateByBackend, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Home);
