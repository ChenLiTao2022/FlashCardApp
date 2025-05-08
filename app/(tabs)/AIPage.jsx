// AIPage.jsx
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Test-only access keys (for testing purposes only)
const UNSPLASH_ACCESS_KEY = 'XLXdkohIyYL6-UZ7IPua_sUcUi2k_BgDtPXkrbh7HJw';
const GOOGLE_TTS_API_KEY = 'AIzaSyDtV7YTTL5rkGwD0xDwGwuJngwPu0vl--s';
const OPENAI_API_KEY = ''; // Add your OpenAI API key here

export default function AIPage({ onGeneratedCards, hasExistingInputs = false, onBack }) {
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
      easeFactor: 1.5
    };
  };

  const systemMessage = 
    `Generate flashcard data for learning ${aiState.language} duolingo style.
Return exactly ${aiState.numItems} flashcards as a pure JSON array. No other text.

Each flashcard should have the following JSON structure:
  [
    {
      "f": "Foreign word",
      "p": "Phonetic transcription",
      "n": "English meaning",
      "e1": "Example question 1 with target word in #hashtags#", 
      "e1p": "Phonetic for example 1", 
      "e1m": "Translation of example 1",
      "e2": "Example answer 1 that answer question 1 with target word in #hashtags#",
      "e2p": "Phonetic for example 2",
      "e2m": "Translation of example 2", 
      "e3": "Example question 2 with target word in #hashtags#", 
      "e3p": "Phonetic for example 3", 
      "e3m": "Translation of example 3",
      "e4": "Example answer 2 that answer question 2 with target word in #hashtags#",
      "e4p": "Phonetic for example 4",
      "e4m": "Translation of example 4",
    }
  ]
`;

  // New function to get word-by-word translations for examples
  const getWordByWordTranslations = async (cards) => {
    setAiState(prev => ({
      ...prev,
      processingStage: "Getting word-by-word translations..."
    }));

    try {
      // Extract all examples that need translation
      const allExamples = [];
      
      cards.forEach((card, cardIndex) => {
        const frontValue = card.f || ''; // Get the front value of the card
        
        for (let i = 1; i <= 4; i++) {
          const exampleKey = `e${i}`;
          if (card[exampleKey] && card[exampleKey].trim()) {
            allExamples.push({
              cardIndex,
              exampleIndex: i,
              text: card[exampleKey].replace(/#/g, ''), // Remove hashtags before translation
              frontValue // Include the front value with each example
            });
          }
        }
      });
      
      if (allExamples.length === 0) {
        return cards;
      }
      
      // Prepare the examples for the second query
      const examplesText = allExamples.map((ex, idx) => 
        `Example ${idx+1}: "${ex.text}" (Front word: "${ex.frontValue}")`
      ).join('\n');
      
      const wbwSystemMessage = `
        For each of the following ${aiState.language} sentences, provide a word-by-word translation as a JSON object.
       
        Each word or meaningful phrase should be a key, with its translation as the value.

        CRITICAL: For each example, there will be a main word being studied as "Front word". This word MUST have its own individual translation key.
        
        Example for: "这是我的书", with 的 being the front word, return: {"这": "this", "是": "is", "我": "I", "的": "possessive particle", "书": "book"}
        
        Return a JSON array with one object per sentence. No other text.
      `;
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: wbwSystemMessage },
            { role: "user", content: examplesText }
          ],
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        console.error("Error getting word-by-word translations:", await response.text());
        return cards;
      }
      
      const data = await response.json();
      let translations = [];
      
      try {
        // Extract the translations from the response
        const content = data.choices[0]?.message?.content;
        if (content) {
          // Find JSON array in the response
          const jsonStartIndex = content.indexOf('[');
          const jsonEndIndex = content.lastIndexOf(']') + 1;
          
          if (jsonStartIndex !== -1 && jsonEndIndex > jsonStartIndex) {
            const jsonString = content.substring(jsonStartIndex, jsonEndIndex);
            translations = JSON.parse(jsonString);
          }
        }
      } catch (error) {
        console.error("Error parsing word-by-word translations:", error);
      }
      
      // Apply translations to the cards
      if (translations.length > 0) {
        const updatedCards = [...cards];
        
        allExamples.forEach((ex, idx) => {
          if (idx < translations.length) {
            const { cardIndex, exampleIndex } = ex;
            const exampleWbwKey = `e${exampleIndex}w`;
            
            if (updatedCards[cardIndex]) {
              updatedCards[cardIndex][exampleWbwKey] = JSON.stringify(translations[idx]);
            }
          }
        });
        
        return updatedCards;
      }
      
      return cards;
    } catch (error) {
      console.error("Error in getWordByWordTranslations:", error);
      return cards;
    }
  };

  const generateWithAI = async () => {

    console.log('hi')

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
        max_tokens: 16384,
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

      // Get word-by-word translations
      const cardsWithWordByWord = await getWordByWordTranslations(parsedArray);

      // Update the processing stage for UI
      setAiState(prev => ({
        ...prev,
        processingStage: "Generating images for cards..."
      }));

      const newCardsWithAudio = await Promise.all(cardsWithWordByWord.map(async (item, index) => {
        // Update progress for each card
        setAiState(prev => ({
          ...prev,
          processingStage: `Processing card ${index + 1} of ${cardsWithWordByWord.length}...`
        }));
        
        const unsplashImagesLocal = await fetchUnsplashImages(item.n || '');
        
        // Remove audio generation - will be done when saving deck
        // No need to set frontAudio here
        
        setAiState(prev => ({
          ...prev,
          processingStage: `Processing images for card ${index + 1}...`
        }));
        
        // Don't generate audio for examples either
        const examples = [
          {
            question: item.e1 || '',
            questionPhonetic: item.e1p || '',
            questionAudio: '', // No audio yet
            questionTranslation: item.e1m || '',
            questionWordByWord: item.e1w || '',
            answer: item.e2 || '',
            answerPhonetic: item.e2p || '',
            answerAudio: '', // No audio yet
            translation: item.e2m || '',
            answerWordByWord: item.e2w || ''
          },
          {
            question: item.e3 || '',
            questionPhonetic: item.e3p || '',
            questionAudio: '', // No audio yet
            questionTranslation: item.e3m || '',
            questionWordByWord: item.e3w || '',
            answer: item.e4 || '',
            answerPhonetic: item.e4p || '',
            answerAudio: '', // No audio yet
            translation: item.e4m || '',
            answerWordByWord: item.e4w || ''
          }
        ];

        return {
          front: item.f || '',
          back: item.n || '',
          phonetic: item.p || '',
          imageUrl: unsplashImagesLocal.length > 0 ? unsplashImagesLocal[0] : '',
          unsplashImages: unsplashImagesLocal,
          examples,
          frontAudio: '', // No audio yet
          language: aiState.language, // Add the selected language
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
        <View style={styles.topButtonContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
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
  container: { padding: 20, paddingTop: 70 },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
    paddingTop: 20,
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
    height: 50,
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
    overflow: 'hidden',
    width: '100%'
  },
  picker: {
    color: '#fff',
    height: 50,
    width: '100%'
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
  },
  topButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    width: '100%',
    zIndex: 10,
  },
  backButton: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2980b9',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
