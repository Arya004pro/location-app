import React, { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import * as Location from "expo-location";
import * as turf from "@turf/turf";

// Polygon coordinates (longitude, latitude)
const polygon = [
  [72.78820612081836, 21.199010641560317],
  [72.7882450128476, 21.199028146487304],
  [72.78822556683298, 21.199136301883073],
  [72.78818533369929, 21.199133801181176],
  [72.78820612081836, 21.199010641560317], // closing point
];

// Convert to GeoJSON polygon and create 3m buffer
const geoPolygon = turf.polygon([polygon]);
const bufferedPolygon = turf.buffer(geoPolygon, 0.003, { units: "kilometers" });

export default function App() {
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState("");
  const [avgCorner, setAvgCorner] = useState(null);
  const [isTakingReadings, setIsTakingReadings] = useState(false);

  // Normal location check
  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setMessage("⚠️ Location permission not granted");
      return;
    }

    let loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const coords = [loc.coords.longitude, loc.coords.latitude];
    setLocation(coords);

    const point = turf.point(coords);
    if (turf.booleanPointInPolygon(point, bufferedPolygon)) {
      setMessage("✅ Inside the allowed area");
    } else {
      setMessage("❌ Outside the allowed area");
    }
  };

  // Take multiple batches within 30s
  const takeCornerReadings = async (batchSize = 20, duration = 30_000) => {
    setIsTakingReadings(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setMessage("⚠️ Location permission not granted");
      setIsTakingReadings(false);
      return;
    }

    const startTime = Date.now();
    let allReadings = [];

    while (Date.now() - startTime < duration) {
      // Take a batch of readings simultaneously
      const readingPromises = Array.from({ length: batchSize }, () =>
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      );
      try {
        const results = await Promise.all(readingPromises);
        const batchReadings = results.map(loc => [loc.coords.longitude, loc.coords.latitude]);
        allReadings = allReadings.concat(batchReadings);
      } catch (err) {
        console.error("Error taking readings:", err);
      }
    }

    // Average all readings
    const avgLon = allReadings.reduce((sum, r) => sum + r[0], 0) / allReadings.length;
    const avgLat = allReadings.reduce((sum, r) => sum + r[1], 0) / allReadings.length;

    setAvgCorner([avgLon, avgLat]);
    setMessage(`🟢 Averaged ${allReadings.length} readings over ${duration / 1000}s`);
    setIsTakingReadings(false);
  };

  const resetCorner = () => {
    setAvgCorner(null);
    setMessage("");
  };

  return (
    <View style={styles.container}>
      {/* Normal location check */}
      <Button title="Get Location" onPress={getLocation} />
      {location && (
        <Text style={styles.text}>
          Current: {location[1]}, {location[0]}
        </Text>
      )}
      <Text style={styles.text}>{message}</Text>

      {/* Corner readings */}
      <View style={{ marginTop: 40 }}>
        <Button
          title={isTakingReadings ? "Taking Readings..." : "Take Corner Readings (30s)"}
          onPress={() => takeCornerReadings()}
          disabled={isTakingReadings}
        />
        {avgCorner && (
          <>
            <Text style={styles.text}>
              🟢 Average Corner: {avgCorner[1]}, {avgCorner[0]}
            </Text>
            <Button title="Reset Corner" onPress={resetCorner} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { marginTop: 20, fontSize: 16, textAlign: "center" },
});
