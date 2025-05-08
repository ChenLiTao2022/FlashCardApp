// AudioImageTest.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Button, 
  StyleSheet, 
  ActivityIndicator, 
  Image,
  Alert,
  ScrollView
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Audio } from 'expo-av';

// Keys for testing.
const UNSPLASH_ACCESS_KEY = 'XLXdkohIyYL6-UZ7IPua_sUcUi2k_BgDtPXkrbh7HJw';
const GOOGLE_TTS_API_KEY = 'AIzaSyDtV7YTTL5rkGwD0xDwGwuJngwPu0vl--s';

// Open the database using a synchronous style as in your sample.
const db = SQLite.openDatabaseSync('mydb.db');

export default function AudioImageTest() {
  const [loading, setLoading] = useState(false);
  const [mediaRecord, setMediaRecord] = useState(null);
  const [sound, setSound] = useState(null);

  // Create table on mount (if not exists).
  useEffect(() => {
    try {
      // Use execSync to create table if you have sync helper methods.
      db.execSync(`
        CREATE TABLE IF NOT EXISTS MediaTest (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          imageUri TEXT,
          audioUri TEXT
        )
      `);
      console.log('MediaTest table created or exists already.');
    } catch (e) {
      console.error("Error creating MediaTest table:", e);
    }
  }, []);

  // Fetch media from Unsplash & Google TTS, save locally, and then into SQLite.
  const fetchAndStoreMedia = async () => {
    setLoading(true);
    try {
      // 1. Fetch a random image from Unsplash.
      const unsplashRes = await fetch(
        `https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}`
      );
      if (!unsplashRes.ok) {
        throw new Error("Error fetching image from Unsplash.");
      }
      const unsplashData = await unsplashRes.json();
      const imageUrl = unsplashData.urls.regular;
      
      // 2. Download the image to the local file system.
      const imageFileName = 'unsplashImage.jpg';
      const localImagePath = FileSystem.documentDirectory + imageFileName;
      const imageDownloadRes = await FileSystem.downloadAsync(imageUrl, localImagePath);
      console.log('Image downloaded to:', imageDownloadRes.uri);

      // 3. Request Google Text-to-Speech for "猫咪真可爱"
      const ttsEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;
      const ttsBody = {
        input: { text: "猫咪真可爱" },
        voice: { languageCode: "zh-CN", ssmlGender: "FEMALE" },
        audioConfig: { audioEncoding: "MP3" }
      };
      const ttsRes = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ttsBody)
      });
      if (!ttsRes.ok) {
        throw new Error("Error calling Google TTS API.");
      }
      const ttsData = await ttsRes.json();
      const audioBase64 = ttsData.audioContent;
      if (!audioBase64) throw new Error("No audio content in TTS response.");

      // 4. Save the audio file locally.
      const audioFileName = 'googleTTS.mp3';
      const localAudioPath = FileSystem.documentDirectory + audioFileName;
      await FileSystem.writeAsStringAsync(localAudioPath, audioBase64, {
        encoding: FileSystem.EncodingType.Base64
      });
      console.log('Audio saved to:', localAudioPath);

      // 5. Save both URIs into SQLite table "MediaTest"
      // Remove previous record (for demo purposes).
      db.execSync(`DELETE FROM MediaTest;`);
      db.runSync(
        `INSERT INTO MediaTest (imageUri, audioUri) VALUES (?, ?);`,
        [imageDownloadRes.uri, localAudioPath]
      );
      console.log('Media record inserted into SQLite.');

      // 6. Update local state with the mediaRecord from the DB.
      loadMediaFromDB();

    } catch (error) {
      console.error("Error in fetchAndStoreMedia:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load media record from SQLite into state.
  const loadMediaFromDB = () => {
    try {
      const records = db.getAllSync(`SELECT * FROM MediaTest LIMIT 1;`);
      console.log("Loaded media records:", records);
      if (records && records.length > 0) {
        setMediaRecord(records[0]);
      }
    } catch (error) {
      console.error("Error loading media from DB:", error);
    }
  };

  // Play audio using Expo AV.
  const playMediaAudio = async () => {
    if (!mediaRecord || !mediaRecord.audioUri) {
      console.log("No audioUri available to play");
      return;
    }
    try {
      const { sound: playbackObj } = await Audio.Sound.createAsync({ uri: mediaRecord.audioUri });
      setSound(playbackObj);
      await playbackObj.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // Cleanup on unmount.
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Audio & Image SQLite Test</Text>
      <Button title="Fetch & Save Media" onPress={fetchAndStoreMedia} />
      {loading && <ActivityIndicator size="large" style={styles.loading} />}

      {mediaRecord && (
        <View style={styles.mediaContainer}>
          <Text style={styles.label}>Downloaded Image:</Text>
          <Image source={{ uri: mediaRecord.imageUri }} style={styles.image} resizeMode="cover" />
          <Button title="Play Audio" onPress={playMediaAudio} />
          <Text style={styles.label}>Audio File Path:</Text>
          <Text style={styles.filePath}>{mediaRecord.audioUri}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    paddingTop: 50, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 24, 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  loading: { marginVertical: 20 },
  mediaContainer: { 
    marginTop: 30, 
    alignItems: 'center', 
    width: '100%' 
  },
  image: { 
    width: 300, 
    height: 200, 
    marginVertical: 10, 
    borderRadius: 5 
  },
  label: { 
    fontSize: 16, 
    marginVertical: 5 
  },
  filePath: { 
    fontSize: 12, 
    color: 'gray', 
    textAlign: 'center', 
    marginBottom: 20 
  }
});
