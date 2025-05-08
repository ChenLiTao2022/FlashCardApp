
// Default card templates that can be used in the app
export const cardTemplates = [
  {
    front: "水",
    back: "Water",
    phonetic: "shuǐ",
    imageUrl: "local-uri-for-card1-image.png",
    language: "Chinese",
    examples: [
      {
        question: "你要喝#水#吗？",
        questionPhonetic: "nǐ yào hē #shuǐ# ma?",
        questionTranslation: "How do you ask for water?",
        questionAudio: "local-uri-for-question1-audio.mp3",
        questionWordByWord: "你=you|要=want to|喝=drink|水=water|吗=question particle", // Added word-by-word
        answer: "请给我#水#。",
        answerPhonetic: "qǐng gěi wǒ #shuǐ#",
        answerAudio: "local-uri-for-answer1-audio.mp3",
        translation: "Water, please.",
        answerWordByWord: "请=please|给=give|我=me|水=water" // Added word-by-word
      },
      {
        question: "我可以要一些#水#吗？",
        questionPhonetic: "wǒ kěyǐ yào yīxiē #shuǐ# ma?",
        questionTranslation: "Could I have some water?",
        questionAudio: "local-uri-for-question2-audio.mp3",
        questionWordByWord: "我=I|可以=can|要=want|一些=some|水=water|吗=question particle",
        answer: "好的，这是给你的#水#。",
        answerPhonetic: "hǎo de, zhè shì gěi nǐ de #shuǐ#",
        answerAudio: "local-uri-for-answer2-audio.mp3",
        translation: "Yes, here you go.",
        answerWordByWord: "好的=okay|这=this|是=is|给=for|你=you|的=possessive|水=water"
      },
      {
        question: "你需要#水#吗？",
        questionPhonetic: "nǐ xūyào #shuǐ# ma?",
        questionTranslation: "Do you need water?",
        questionAudio: "local-uri-for-question3-audio.mp3",
        questionWordByWord: "你=you|需要=need|水=water|吗=question particle",
        answer: "我已经有#水#了。",
        answerPhonetic: "wǒ yǐjīng yǒu #shuǐ# le",
        answerAudio: "local-uri-for-answer3-audio.mp3",
        translation: "I already have some.",
        answerWordByWord: "我=I|已经=already|有=have|水=water|了=completed action particle"
      },
      {
        question: "冰箱里有#水#吗？",
        questionPhonetic: "bīngxiāng lǐ yǒu #shuǐ# ma?",
        questionTranslation: "Is there water in the fridge?",
        questionAudio: "local-uri-for-question4-audio.mp3",
        questionWordByWord: "冰箱=refrigerator|里=inside|有=have|水=water|吗=question particle",
        answer: "有#水#。",
        answerPhonetic: "yǒu #shuǐ#",
        answerAudio: "local-uri-for-answer4-audio.mp3",
        translation: "Yes, there is.",
        answerWordByWord: "有=have|水=water"
      },
      {
        question: "你想喝点#水#吗？",
        questionPhonetic: "nǐ xiǎng hē diǎn #shuǐ# ma?",
        questionTranslation: "Would you like some water?",
        questionAudio: "local-uri-for-question5-audio.mp3",
        questionWordByWord: "你=you|想=want|喝=drink|点=some|水=water|吗=question particle",
        answer: "好的，谢谢。",
        answerPhonetic: "hǎo de, xièxie",
        answerAudio: "local-uri-for-answer5-audio.mp3",
        translation: "Sure, thank you.",
        answerWordByWord: "好的=okay|谢谢=thank you"
      }
    ],
    unsplashImages: ["uri1", "uri2", "uri3"],
    lastReviewDate: "2025-04-18T12:00:00.000Z",
    nextReviewDate: "2025-04-20T12:00:00.000Z",
    consecutiveCorrectAnswersCount: 0,
    wrongQueue: [false, 0],
    easeFactor: 1.5,
    frontAudio: "local-uri-for-front-audio.mp3",
    exp: 0,
  },
  // Template for other languages
  {
    front: "犬",
    back: "Dog",
    phonetic: "inu",
    imageUrl: "local-uri-for-dog-image.png",
    language: "Japanese", // Japanese template
    examples: [
      {
        question: "これは#犬#ですか？",
        questionPhonetic: "Kore wa #inu# desu ka?",
        questionTranslation: "Is this a dog?",
        questionAudio: "",
        questionWordByWord: "これ=this|は=topic marker|犬=dog|ですか=is it?",
        answer: "はい、それは#犬#です。",
        answerPhonetic: "Hai, sore wa #inu# desu.",
        answerAudio: "",
        translation: "Yes, that is a dog.",
        answerWordByWord: "はい=yes|それ=that|は=topic marker|犬=dog|です=is"
      },
      {
        question: "あなたは#犬#を飼っていますか？",
        questionPhonetic: "Anata wa #inu# o katte imasu ka?",
        questionTranslation: "Do you have a dog?",
        questionAudio: "",
        questionWordByWord: "あなた=you|は=topic marker|犬=dog|を=object marker|飼っています=keep/have|か=question marker",
        answer: "はい、私は#犬#を飼っています。",
        answerPhonetic: "Hai, watashi wa #inu# o katte imasu.",
        answerAudio: "",
        translation: "Yes, I have a dog.",
        answerWordByWord: "はい=yes|私=I|は=topic marker|犬=dog|を=object marker|飼っています=keep/have"
      }
    ],
    unsplashImages: ["uri1", "uri2", "uri3"],
    lastReviewDate: "2025-04-18T12:00:00.000Z",
    nextReviewDate: "2025-04-20T12:00:00.000Z",
    consecutiveCorrectAnswersCount: 0,
    wrongQueue: [false, 0],
    easeFactor: 1.5,
    frontAudio: "",
    exp: 0,
  }
];

// Function to get template by language
export const getTemplateByLanguage = (language) => {
  return cardTemplates.find(template => template.language === language) || cardTemplates[0];
};

export default cardTemplates;
