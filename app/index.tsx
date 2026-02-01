import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";

const slides = [
  {
    id: "1",
    title: "Lapor Lebih Mudah",
    description:
      "Sampaikan aspirasi dan pengaduan Anda langsung dari genggaman kapan saja dan di mana saja.",
    icon: "chatbubbles-outline",
    color: "#3B82F6",
  },
  {
    id: "2",
    title: "Pantau Real-time",
    description:
      "Dapatkan notifikasi langsung dan pantau status tindak lanjut laporan Anda secara transparan.",
    icon: "notifications-outline",
    color: "#F59E0B",
  },
  {
    id: "3",
    title: "Lingkungan Nyaman",
    description:
      "Bersama pemerintah dan warga mewujudkan lingkungan yang lebih baik, tertib, dan nyaman.",
    icon: "happy-outline",
    color: "#10B981",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  // Limit width on web to simulate mobile experience
  const slideWidth = Platform.OS === 'web' ? Math.min(windowWidth, 430) : windowWidth;

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      // Use scrollToOffset for better web compatibility
      slidesRef.current?.scrollToOffset({
        offset: nextIndex * slideWidth,
        animated: true
      });
      // Also update state manually in case onViewableItemsChanged doesn't fire properly on web
      if (Platform.OS === 'web') {
        setCurrentIndex(nextIndex);
      }
    } else {
      router.push("/(auth)/login");
    }
  };

  const renderItem = ({ item }: any) => {
    return (
      <View style={[styles.slide, { width: slideWidth }]}>
        <View
          style={[styles.imageContainer, { backgroundColor: item.color + "15" }]}
        >
          <Ionicons name={item.icon as any} size={100} color={item.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const Paginator = () => {
    return (
      <View style={styles.paginatorContainer}>
        {slides.map((_: any, i: number) => {
          const inputRange = [(i - 1) * slideWidth, i * slideWidth, (i + 1) * slideWidth];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={i.toString()}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: Colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const content = (
    <SafeAreaView style={styles.container}>
      <View style={styles.sliderContainer}>
        <FlatList
          data={slides}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
          scrollEventThrottle={32}
          style={{ width: slideWidth }}
          contentContainerStyle={{ alignItems: 'center' }}
        />
      </View>

      <View style={styles.footer}>
        <Paginator />

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {currentIndex === slides.length - 1 ? (
            <View style={styles.actionButtons}>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity style={styles.registerButton}>
                  <Text style={styles.registerButtonText}>Daftar Sekarang</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.loginLink}>
                  <Text style={styles.loginLinkText}>
                    Sudah punya akun? Masuk
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.nextButton,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
              ]}
              onPress={scrollToNext}
            >
              <Text style={styles.nextButtonText}>Lanjut</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );

  // Wrap in container for web to center and limit width
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrapper}>
        <View style={[styles.webContainer, { width: slideWidth }]}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  webContainer: {
    flex: 1,
    maxHeight: 932,
    backgroundColor: "#fff",
    borderRadius: Platform.OS === 'web' ? 20 : 0,
    overflow: "hidden",
    // Add phone-like shadow on web
    ...(Platform.OS === 'web' ? {
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    } : {}),
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  sliderContainer: {
    flex: 3,
    alignItems: "center",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  paginatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    alignItems: "center",
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButtons: {
    width: "100%",
    gap: 16,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginLink: {
    paddingVertical: 10,
    alignItems: "center",
  },
  loginLinkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
