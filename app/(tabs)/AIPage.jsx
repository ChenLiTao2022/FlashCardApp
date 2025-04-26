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
import { Picker } from '@react-native-picker/picker';

// Test-only access keys (for testing purposes only)
const UNSPLASH_ACCESS_KEY = 'XLXdkohIyYL6-UZ7IPua_sUcUi2k_BgDtPXkrbh7HJw';
const GOOGLE_TTS_API_KEY = 'AIzaSyDtV7YTTL5rkGwD0xDwGwuJngwPu0vl--s';

export default function AIPage({ onGeneratedCards, hasExistingInputs = false }) {
  const router = useRouter();
  const [aiState, setAiState] = useState({
    language: 'Chinese',
    description: '', // for testing
    numItems: 3,                  // generate 3 items for testing
    createNewDeck: !hasExistingInputs, // Default based on existing inputs
    loading: false,
    error: null,
    charCount: 0, // Track how many characters have been received
    receivedTokens: 0, // Track token count
    processingStage: '', // Track which stage of processing we're in
  });
  const [generatedCards, setGeneratedCards] = useState([]);

  // Language configurations for audio
  const languageVoices = {
    Chinese: { primary: 'cmn-CN-Wavenet-A', secondary: 'cmn-CN-Wavenet-C' },
    German: { primary: 'de-DE-Wavenet-A', secondary: 'de-DE-Wavenet-B' },
    Japanese: { primary: 'ja-JP-Wavenet-A', secondary: 'ja-JP-Wavenet-D' }
  };

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

  // Modified getAudioLocal: Use voice based on selected language
  const getAudioLocal = async (text, isSecondary = false) => {
    if (!text) return null;
    
    const cleanedText = text.replace(/#/g, '');
    const voices = languageVoices[aiState.language] || languageVoices.Chinese;
    const voiceName = isSecondary ? voices.secondary : voices.primary;
    const languageCode = voiceName.split('-').slice(0, 2).join('-');
    
    console.log("Generating audio for text:", cleanedText, "with voice:", voiceName);
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: cleanedText },
            voice: { languageCode: languageCode, name: voiceName },
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
Generate exactly 4 example sentences for each flashcard.
• The 1st and 3rd sentences should be questions containing the target word wrapped in '#' characters.
• The 2nd and 4th sentences should be short statements answering those questions, they also contain the target word wrapped in '#' characters.

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
      "e3": "Example sentence 3", 
      "e3p": "Phonetic for example 3", 
      "e3m": "Meaning for example 3",
      "e4": "Example sentence 4",
      "e4p": "Phonetic for example 4",
      "e4m": "Meaning for example 4"
    }
  ]
`;

  const generateWithAI = async () => {
    // Validate API key first
    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('YOUR_OPENAI_API_KEY')) {
      setAiState(prev => ({ 
        ...prev, 
        error: "Invalid OpenAI API key. Please provide a valid key.",
        loading: false
      }));
      return;
    }

    setAiState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      charCount: 0,
      receivedTokens: 0
    }));
    
    try {
      const requestBody = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: aiState.description }
        ],
        temperature: 0.7,
        max_tokens: 10000,
        stream: false // Disable streaming as it's causing issues
      };

      // Update UI to show connecting state
      setAiState(prev => ({ 
        ...prev, 
        processingStage: 'Connecting to OpenAI API...'
      }));

      let response;
      try {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify(requestBody)
        });
      } catch (fetchError) {
        console.error("Network error:", fetchError);
        throw new Error(`Network error: ${fetchError.message}. Check your internet connection.`);
      }

      // Update UI to show we're connected
      setAiState(prev => ({
        ...prev,
        processingStage: 'Connected, waiting for response...'
      }));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error status:", response.status, errorText);
        
        // Check for common error status codes
        if (response.status === 401) {
          throw new Error("API key is invalid or expired. Please check your OpenAI API key.");
        } else if (response.status === 429) {
          throw new Error("API rate limit exceeded. Please try again later or check your API key's quota.");
        } else if (response.status === 500) {
          throw new Error("OpenAI service error. Please try again later.");
        } else {
          throw new Error(`API error (${response.status}): ${errorText.slice(0, 100)}...`);
        }
      }

      let fullResponse = "";
      let jsonString = "";
      
      // Check if we can use streaming (response.body is available)
      if (response.body) {
        try {
          // Implement proper streaming
          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let jsonStartFound = false;
          let jsonStartIndex = -1;
          let jsonEndIndex = -1;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode and process the chunk
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            // Process each line in the chunk
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // Remove the "data: " prefix if present
              const dataPrefix = "data: ";
              const content = line.startsWith(dataPrefix) ? line.slice(dataPrefix.length) : line;
              
              // Check for stream completion
              if (content.trim() === "[DONE]") continue;
              
              try {
                // Try to parse the response
                const parsedLine = JSON.parse(content);
                if (parsedLine.choices && parsedLine.choices[0].delta && parsedLine.choices[0].delta.content) {
                  const tokenContent = parsedLine.choices[0].delta.content;
                  fullResponse += tokenContent;
                  
                  // Update tokens and character count
                  setAiState(prev => ({
                    ...prev,
                    receivedTokens: prev.receivedTokens + 1,
                    charCount: fullResponse.length
                  }));
                  
                  // Check for JSON array start
                  if (!jsonStartFound && tokenContent.includes('[')) {
                    jsonStartFound = true;
                    jsonStartIndex = fullResponse.lastIndexOf('[');
                  }
                  
                  // Check for JSON array end
                  if (jsonStartFound && tokenContent.includes(']')) {
                    jsonEndIndex = fullResponse.lastIndexOf(']') + 1;
                  }
                }
              } catch (e) {
                // Ignore parse errors in individual chunks - we'll process the complete JSON later
                console.log("Chunk parse error (expected for certain chunks):", e.message);
              }
            }
          }
          
          // Extract the JSON array from the full response
          if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
            // Try to find JSON array in the full response if not found during streaming
            jsonStartIndex = fullResponse.indexOf('[');
            jsonEndIndex = fullResponse.lastIndexOf(']') + 1;
            
            if (jsonStartIndex === -1 || jsonEndIndex <= jsonStartIndex) {
              throw new Error("Unable to locate valid JSON data in the response. Please try again.");
            }
          }
          
          jsonString = fullResponse.substring(jsonStartIndex, jsonEndIndex);
        } catch (streamError) {
          console.error("Streaming error:", streamError);
          // If streaming fails, fall back to regular JSON response
          fullResponse = ""; // Reset and try the fallback approach
        }
      }
      
      // Fallback to regular JSON response if streaming failed or body is not available
      if (!fullResponse) {
        console.log("Fallback to non-streaming response");
        
        try {
          const data = await response.json();
          
          // Update UI to show we're processing the response
          setAiState(prev => ({
            ...prev,
            processingStage: 'Connected, receiving data...'
          }));
          
          // Check if we got a valid response structure
          if (!data || !data.choices || !data.choices[0]) {
            console.error("Invalid API response structure:", data);
            throw new Error(`Invalid API response structure: ${JSON.stringify(data).slice(0, 150)}...`);
          }
          
          // Update tokens and character count with simulated incremental updates
          if (data.choices[0].message && data.choices[0].message.content) {
            fullResponse = data.choices[0].message.content;
            const totalTokens = fullResponse.split(/\s+/).length;
            
            // Simulate token by token updates
            for (let i = 1; i <= 10; i++) {
              const simulatedProgress = Math.floor((i / 10) * totalTokens);
              await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to show progress
              
              setAiState(prev => ({
                ...prev,
                receivedTokens: simulatedProgress,
                charCount: Math.floor((i / 10) * fullResponse.length)
              }));
            }
            
            // Final update with actual counts
            setAiState(prev => ({
              ...prev,
              receivedTokens: totalTokens,
              charCount: fullResponse.length
            }));
            
            // Extract JSON array from the full response
            const jsonStartIndex = fullResponse.indexOf('[');
            const jsonEndIndex = fullResponse.lastIndexOf(']') + 1;
            
            if (jsonStartIndex === -1 || jsonEndIndex <= jsonStartIndex) {
              console.error("Failed to extract valid JSON array, response:", fullResponse.slice(0, 200));
              throw new Error("Unable to locate valid JSON data in the response. Please try again.");
            }
            
            jsonString = fullResponse.substring(jsonStartIndex, jsonEndIndex);
          } else {
            console.error("Missing content in API response:", data);
            throw new Error("Invalid response format from OpenAI API - missing content");
          }
        } catch (jsonError) {
          console.error("JSON response error:", jsonError, "Response status:", response.status);
          throw new Error(`Failed to process API response: ${jsonError.message}. Status: ${response.status}`);
        }
      }
      
      // Clean up JSON string - remove any markdown formatting, etc.
      jsonString = jsonString.replace(/```json|```/g, "").trim();
      
      console.log("Cleaned JSON string:", jsonString.slice(0, 100) + "...");
      
      let parsedArray;
      try {
        parsedArray = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "for string:", jsonString.slice(0, 100));
        
        // Try to fix common JSON issues and retry parsing
        try {
          // First attempt - clean up common issues
          let cleanedJson = jsonString
            .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
            .replace(/,\s*}/g, '}') // Remove trailing commas in objects
            .replace(/'/g, '"')     // Replace single quotes with double quotes
            .replace(/\n/g, " ");   // Remove newlines
          
          console.log("Attempting parse with cleaned JSON:", cleanedJson.slice(0, 100));
          
          try {
            parsedArray = JSON.parse(cleanedJson);
          } catch (secondError) {
            // Second attempt - look for any JSON array in the full response
            console.log("Trying alternative JSON extraction from full response");
            const fullResponseText = fullResponse || "";
            
            // Regular expression to find a JSON array
            const jsonRegex = /\[\s*{[\s\S]*?}\s*\]/g;
            const match = jsonRegex.exec(fullResponseText);
            
            if (match) {
              try {
                parsedArray = JSON.parse(match[0]);
                console.log("Successfully extracted JSON using regex");
              } catch (regexError) {
                console.error("Regex extraction failed:", regexError);
                throw secondError; // Re-throw the original error if this also fails
              }
            } else {
              console.error("Could not find valid JSON array in response");
              throw new Error("Could not extract valid flashcard data from API response. Please try with a simpler prompt.");
            }
          }
        } catch (finalError) {
          console.error("All JSON parse attempts failed:", finalError);
          throw new Error(`JSON parsing failed: ${parseError.message}. Try again with a simpler prompt or check API key.`);
        }
      }

      // Check if the parsedArray is actually an array and has items
      if (!Array.isArray(parsedArray)) {
        console.error("Parsed result is not an array:", parsedArray);
        throw new Error("AI response doesn't contain a valid flashcard array. Please try again with a different prompt.");
      }
      
      if (parsedArray.length === 0) {
        throw new Error("AI generated an empty array of flashcards. Please try again with a more specific prompt.");
      }

      // Update the processing stage for UI
      setAiState(prev => ({
        ...prev,
        processingStage: "Generating audio and downloading images..."
      }));

      const newCardsWithAudio = await Promise.all(parsedArray.map(async (item, index) => {
        // Update progress for each card
        setAiState(prev => ({
          ...prev,
          processingStage: `Processing card ${index + 1} of ${parsedArray.length}...`
        }));
        
        const unsplashImagesLocal = await fetchUnsplashImages(item.n || '');
        const frontAudio = await getAudioLocal(item.f || '');
        
        setAiState(prev => ({
          ...prev,
          processingStage: `Generating example audio for card ${index + 1}...`
        }));
        
        const exampleAudios = await Promise.all([
          getAudioLocal(item.e1 || '', false),
          getAudioLocal(item.e2 || '', true),
          getAudioLocal(item.e3 || '', false),
          getAudioLocal(item.e4 || '', true)
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
      
      // Update final stage
      setAiState(prev => ({
        ...prev,
        processingStage: "Preparing flashcards for editing..."
      }));
      
      // Instead of navigating to manualImport, call the onGeneratedCards callback
      if (onGeneratedCards) {
        onGeneratedCards(newCardsWithAudio);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setAiState(prev => ({ 
        ...prev, 
        error: error.message,
        processingStage: '' 
      }));
    } finally {
      setAiState(prev => ({ 
        ...prev, 
        loading: false 
      }));
    }
  };

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.stepIndicator}>
              <Text style={styles.titleHighlight}>Generate Flashcards with AI</Text>
              
            </Text>

          </View>

          {/* Description field moved to top */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            multiline={true}
            numberOfLines={3}
            placeholderTextColor="white"
            placeholder="Describe the deck (e.g., create a Spanish beginner deck focusing on greetings) or input foreign words directly (e.g., Hola, Adiós, gracias)"
            value={aiState.description}
            onChangeText={text => setAiState(prev => ({ ...prev, description: text }))}
          />
          
          {/* Language and Number of items on the same line */}
          <View style={styles.rowContainer}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Language</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={aiState.language}
                  style={styles.picker}
                  dropdownIconColor="#fff"
                  onValueChange={(itemValue) => setAiState(prev => ({ ...prev, language: itemValue }))}
                >
                  <Picker.Item label="Chinese" value="Chinese" />
                  <Picker.Item label="German" value="German" />
                  <Picker.Item label="Japanese" value="Japanese" />
                </Picker>
              </View>
            </View>
            
            <View style={styles.halfField}>
              <Text style={styles.label}>Number of items</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={aiState.numItems.toString()}
                onChangeText={text => setAiState(prev => ({ ...prev, numItems: parseInt(text) || 0 }))}
              />
            </View>
          </View>

          {/* Only show radio options if there are existing inputs */}
          {hasExistingInputs && (
            <View style={styles.radioContainer}>
              <TouchableOpacity 
                style={styles.radioRow} 
                onPress={() => setAiState(prev => ({ ...prev, createNewDeck: true }))}
              >
                <Text style={styles.radioText}>
                  {aiState.createNewDeck ? '🔘' : '⚪'} Create a new deck
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.radioRow} 
                onPress={() => setAiState(prev => ({ ...prev, createNewDeck: false }))}
              >
                <Text style={styles.radioText}>
                  {!aiState.createNewDeck ? '🔘' : '⚪'} Add to existing deck
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {aiState.error && <Text style={styles.errorText}>{aiState.error}</Text>}
          {aiState.loading ? (
            <>
              <ActivityIndicator size="large" style={{ marginVertical: 10 }} />
              <Text style={styles.loadingText}>
                {aiState.receivedTokens > 0 
                  ? `Receiving... ${aiState.receivedTokens} tokens (${aiState.charCount} characters)`
                  : aiState.processingStage === 'Connected, waiting for response...'
                    ? 'Connected, waiting for response...'
                    : aiState.processingStage || 'Connecting to AI service...'}
              </Text>
              {aiState.charCount > 0 && (
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${Math.min((aiState.charCount / (aiState.numItems * 1000)) * 100, 100)}%` }
                    ]} 
                  />
                </View>
              )}
              <Text style={styles.progressHint}>
                {aiState.processingStage 
                  ? aiState.processingStage.startsWith('Connected') 
                    ? 'AI is generating content based on your description...'
                    : aiState.processingStage
                  : aiState.receivedTokens > 0 
                    ? "Building JSON data structure for flashcards..."
                    : 'Initializing request...'}
              </Text>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.generateButton} 
              onPress={generateWithAI}
            >
              <Text style={styles.generateButtonText}>Generate</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  container: { padding: 20, paddingTop: 50 },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  stepIndicator: { 
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 8 
  },
  titleHighlight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff88'
  },
  titleSmall: {
    fontSize: 18,
    color: 'white'
  },
  stepTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#00ff88', 
    textAlign: 'center', 
    marginBottom: 16 
  },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#fff' },
  hint: { fontSize: 12, color: '#ccc', marginBottom: 10 },
  input: { 
    borderWidth: 1, 
    padding: 8, 
    marginBottom: 20, 
    borderRadius: 5, 
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderColor: '#404040'
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#2c2c2c',
    borderColor: '#404040',
    marginBottom: 20,
    overflow: 'hidden'
  },
  picker: {
    color: '#fff',
    height: 40
  },
  descriptionInput: {
    borderWidth: 1, 
    padding: 12, 
    marginBottom: 20, 
    borderRadius: 5, 
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderColor: '#404040',
    textAlignVertical: 'top',
    minHeight: 100,
    placeholderTextColor: '#fff'
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfField: {
    width: '48%'
  },
  radioContainer: { marginBottom: 20 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radioText: { marginLeft: 5, color: '#fff', fontSize: 16 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10 },
  loadingText: { textAlign: 'center', marginBottom: 10, fontStyle: 'italic', color: '#fff' },
  generateButton: {
    backgroundColor: '#00ff88',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  generateButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: '#ccc',
    borderRadius: 10,
    marginBottom: 10
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00ff88',
    borderRadius: 10,
    position: 'absolute',
    left: 0,
    top: 0
  },
  progressHint: {
    textAlign: 'center',
    color: '#fff',
    fontStyle: 'italic'
  }
});
