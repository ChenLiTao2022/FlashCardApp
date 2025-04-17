// AIPage.jsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  ScrollView,
  ImageBackground,
  SafeAreaView
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';

// Test-only access keys (for testing purposes only)
const UNSPLASH_ACCESS_KEY = 'XLXdkohIyYL6-UZ7IPua_sUcUi2k_BgDtPXkrbh7HJw';
const GOOGLE_TTS_API_KEY = 'AIzaSyDtV7YTTL5rkGwD0xDwGwuJngwPu0vl--s';
const OPENAI_API_KEY = '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';

export default function AIPage() {
  const router = useRouter();
  const [aiState, setAiState] = useState({
    language: 'Chinese',
    description: 'random word(s)', // for testing
    numItems: 3,                  // generate 3 items for testing
    replaceExisting: true,
    loading: false,
    error: null
  });
  const [generatedCards, setGeneratedCards] = useState([]);

  // Download and return a local URI for an Unsplash image given its remote URL.
  const downloadImageLocally = async (remoteUrl) => {
    if (!remoteUrl) return '';
    const fileName = `unsplash_${Date.now()}_${Math.random().toString(36).substring(2,8)}.jpg`;
    const localUri = FileSystem.documentDirectory + fileName;
    try {
      const downloadRes = await FileSystem.downloadAsync(remoteUrl, localUri);
      console.log("Downloaded image to:", downloadRes.uri);
      return downloadRes.uri;
    } catch (err) {
      console.error("Error downloading image:", err);
      return remoteUrl; // fallback to remote URL if needed
    }
  };

  // Fetch 3 Unsplash images.
  const fetchUnsplashImages = async (query) => {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=1&per_page=3`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      if (!response.ok) throw new Error(`Unsplash API Error: ${response.status}`);
      const data = await response.json();
      if (!data?.results) return [];
      const remoteImageUrls = data.results.map(photo => photo?.urls?.small).filter(Boolean);
      const localImageUris = await Promise.all(remoteImageUrls.map(url => downloadImageLocally(url)));
      return localImageUris;
    } catch (error) {
      console.error("Unsplash fetch error:", error);
      return [];
    }
  };

  // Modified getAudioLocal: Remove '#' characters before sending to TTS.
  const getAudioLocal = async (text, voiceName = 'cmn-CN-Wavenet-C') => {
    const cleanedText = text.replace(/#/g, '');
    console.log("Generating audio for text:", cleanedText, "with voice:", voiceName);
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: cleanedText },
            voice: { languageCode: 'cmn-CN', name: voiceName },
            audioConfig: { audioEncoding: 'MP3' }
          }),
        }
      );
      const data = await response.json();
      if (data.audioContent) {
        const fileName = `tts_${Date.now()}_${Math.random().toString(36).substring(2,8)}.mp3`;
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
        console.log("Audio generated and stored at:", fileUri);
        return fileUri;
      } else {
        console.error("TTS failed:", data);
        return null;
      }
    } catch (error) {
      console.error("Error in getAudioLocal:", error);
      return null;
    }
  };

  // Generate default tracking data.
  const getDefaultTrackingData = () => {
    const now = new Date();
    return {
      lastReviewDate: now.toISOString(),
      nextReviewDate: now.toISOString(),
      consecutiveCorrectAnswersCount: 0,
      wrongQueue: [false, 0],
      easeFactor: 2
    };
  };

  const systemMessage = 
    `Generate flashcard data for learning ${aiState.language}.
Return exactly ${aiState.numItems} flashcards as a pure JSON array. No other text.
If the target word is 水, an example sentence might be: 我想喝#水#.
Generate exactly 10 example sentences for each flashcard.
• The 1st, 3rd, 5th, 7th, and 9th sentences should be questions containing the target word wrapped in '#' characters.
• The 2nd, 4th, 6th, 8th, and 10th sentences should be short statements answering those questions, they also contain the target word wrapped in '#' characters..

Each flashcard should have the following JSON structure:
  [
    {
      "f": "Foreign word",
      "n": "Native meaning",
      "p": "Phonetic transcription",
      "e1": "Example sentence 1", 
      "e1p": "Phonetic for example 1", 
      "e1m": "Meaning for example 1",
      "e2": "Example sentence 2",
      "e2p": "Phonetic for example 2",
      "e2m": "Meaning for example 2", 
      // ...up to e10, e10p, e10m
    }
  ]
`;

  const generateWithAI = async () => {
    setAiState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const requestBody = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: aiState.description }
        ],
        temperature: 0.7,
        max_tokens: 3000
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorDetails = await response.text();
        console.error("Error status:", response.status, errorDetails);
        throw new Error("Failed to generate content");
      }

      const data = await response.json();
      console.log("ChatGPT raw response:", data.choices[0].message.content);
      const jsonString = data.choices[0].message.content.trim();
      const parsedArray = JSON.parse(jsonString);

      const newCardsWithAudio = await Promise.all(parsedArray.map(async item => {
        const unsplashImagesLocal = await fetchUnsplashImages(item.n || '');
        const frontAudio = await getAudioLocal(item.f || '');
        const exampleAudios = await Promise.all([
          getAudioLocal(item.e1 || '', 'cmn-CN-Wavenet-A'),
          getAudioLocal(item.e2 || '', 'cmn-CN-Wavenet-C'),
          getAudioLocal(item.e3 || '', 'cmn-CN-Wavenet-A'),
          getAudioLocal(item.e4 || '', 'cmn-CN-Wavenet-C'),
          getAudioLocal(item.e5 || '', 'cmn-CN-Wavenet-A'),
          getAudioLocal(item.e6 || '', 'cmn-CN-Wavenet-C'),
          getAudioLocal(item.e7 || '', 'cmn-CN-Wavenet-A'),
          getAudioLocal(item.e8 || '', 'cmn-CN-Wavenet-C'),
          getAudioLocal(item.e9 || '', 'cmn-CN-Wavenet-A'),
          getAudioLocal(item.e10 || '', 'cmn-CN-Wavenet-C')
        ]);

        const examples = [
          {
            question: item.e1 || '',
            questionPhonetic: item.e1p || '',
            questionAudio: exampleAudios[0],
            questionTranslation: item.e1m || '',
            answer: item.e2 || '',
            answerPhonetic: item.e2p || '',
            answerAudio: exampleAudios[1],
            translation: item.e2m || ''
          },
          {
            question: item.e3 || '',
            questionPhonetic: item.e3p || '',
            questionAudio: exampleAudios[2],
            questionTranslation: item.e3m || '',
            answer: item.e4 || '',
            answerPhonetic: item.e4p || '',
            answerAudio: exampleAudios[3],
            translation: item.e4m || ''
          },
          {
            question: item.e5 || '',
            questionPhonetic: item.e5p || '',
            questionAudio: exampleAudios[4],
            questionTranslation: item.e5m || '',
            answer: item.e6 || '',
            answerPhonetic: item.e6p || '',
            answerAudio: exampleAudios[5],
            translation: item.e6m || ''
          },
          {
            question: item.e7 || '',
            questionPhonetic: item.e7p || '',
            questionAudio: exampleAudios[6],
            questionTranslation: item.e7m || '',
            answer: item.e8 || '',
            answerPhonetic: item.e8p || '',
            answerAudio: exampleAudios[7],
            translation: item.e8m || ''
          },
          {
            question: item.e9 || '',
            questionPhonetic: item.e9p || '',
            questionAudio: exampleAudios[8],
            questionTranslation: item.e9m || '',
            answer: item.e10 || '',
            answerPhonetic: item.e10p || '',
            answerAudio: exampleAudios[9],
            translation: item.e10m || ''
          }
        ];

        return {
          front: item.f || '',
          back: item.n || '',
          phonetic: item.p || '',
          imageUrl: unsplashImagesLocal.length > 0 ? unsplashImagesLocal[0] : '',
          unsplashImages: unsplashImagesLocal,
          examples,
          frontAudio,
          ...getDefaultTrackingData()
        };
      }));

      setGeneratedCards(newCardsWithAudio);
      router.push({
        pathname: '/manualImport',
        params: {
          cards: JSON.stringify(newCardsWithAudio)
        }
      });
    } catch (error) {
      console.error("Generation error:", error);
      setAiState(prev => ({ ...prev, error: error.message }));
    } finally {
      setAiState(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Generate Flashcards with AI</Text>
          
          <Text style={styles.label}>Language</Text>
          <TextInput
            style={styles.input}
            placeholder="Language you would like to learn"
            value={aiState.language}
            onChangeText={text => setAiState(prev => ({ ...prev, language: text }))}
          />

          <Text style={styles.label}>Description</Text>
          <Text style={styles.hint}>e.g. random word(s)</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe your flashcard set"
            value={aiState.description}
            onChangeText={text => setAiState(prev => ({ ...prev, description: text }))}
          />

          <Text style={styles.label}>Numbers of items to add</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={aiState.numItems.toString()}
            onChangeText={text => setAiState(prev => ({ ...prev, numItems: parseInt(text) || 0 }))}
          />

          <Text style={styles.label}>Replace existing content?</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity style={styles.radioRow} onPress={() => setAiState(prev => ({ ...prev, replaceExisting: true }))}>
              <Text style={styles.radioText}>{aiState.replaceExisting ? '🔘' : '⚪'} Replace existing content</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioRow} onPress={() => setAiState(prev => ({ ...prev, replaceExisting: false }))}>
              <Text style={styles.radioText}>{!aiState.replaceExisting ? '🔘' : '⚪'} Keep existing content</Text>
            </TouchableOpacity>
          </View>

          {aiState.error && <Text style={styles.errorText}>{aiState.error}</Text>}
          {aiState.loading ? (
            <>
              <ActivityIndicator size="large" style={{ marginVertical: 10 }} />
              <Text style={styles.loadingText}>AI is responding, it will take 10 seconds ~ 2 minutes.</Text>
            </>
          ) : (
            <Button title="Generate" onPress={generateWithAI} />
          )}

          <TouchableOpacity 
            style={styles.manualImportButton}
            onPress={() => router.push('/manualImport')}
          >
            <Text style={styles.manualImportText}>Manual Import</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  container: { padding: 20, paddingTop: 50 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center', color: '#fff' },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#fff' },
  hint: { fontSize: 12, color: '#ccc', marginBottom: 10 },
  input: { 
    borderWidth: 1, 
    padding: 8, 
    marginBottom: 10, 
    borderRadius: 5, 
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderColor: '#404040'
  },
  radioContainer: { marginBottom: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  radioText: { marginLeft: 5, color: '#fff' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10 },
  loadingText: { textAlign: 'center', marginBottom: 10, fontStyle: 'italic', color: '#fff' },
  manualImportButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    marginTop: 20
  },
  manualImportText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold'
  },
});
