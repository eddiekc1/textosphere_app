import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';

import { badgeObserverScript, parseBadgeCount } from '@/lib/badge';
import { setNativeBadgeCount } from '@/lib/native-badge';

const TEXTOSPHERE_URL = 'https://www.textosphere.com/';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const lastBadgeCountRef = useRef<number | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) {
        return false;
      }

      webViewRef.current?.goBack();
      return true;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  const updateBadge = useCallback(async (rawCount: unknown) => {
    const count = parseBadgeCount(rawCount);
    if (lastBadgeCountRef.current === count || Platform.OS === 'web') {
      return;
    }

    lastBadgeCountRef.current = count;

    await setNativeBadgeCount(count);
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      void updateBadge(event.nativeEvent.data);
    },
    [updateBadge]
  );

  const handleNavigationStateChange = useCallback((event: WebViewNavigation) => {
    setCanGoBack(event.canGoBack);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: TEXTOSPHERE_URL }}
        style={styles.webView}
        originWhitelist={['https://*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        injectedJavaScript={badgeObserverScript}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          webViewRef.current?.injectJavaScript(badgeObserverScript);
        }}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        pullToRefreshEnabled
      />
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#111827" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
