import * as Location from "expo-location";
import { useState } from "react";
import { Alert } from "react-native";
import { LocationData } from "../types/database.types";
import { usePermissions } from "./usePermissions";

export function useLocation() {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const { requestLocationPermission } = usePermissions();

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    setLoadingLocation(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setLoadingLocation(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocoding untuk mendapatkan alamat
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0]
          ? `${address[0].street || ""} ${address[0].name || ""}, ${
              address[0].city || ""
            }`
          : "Alamat tidak ditemukan",
      };

      setCurrentLocation(locationData);
      return locationData;
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Gagal mendapatkan lokasi saat ini");
      return null;
    } finally {
      setLoadingLocation(false);
    }
  };

  const clearLocation = () => {
    setCurrentLocation(null);
  };

  return {
    currentLocation,
    loadingLocation,
    getCurrentLocation,
    clearLocation,
  };
}
