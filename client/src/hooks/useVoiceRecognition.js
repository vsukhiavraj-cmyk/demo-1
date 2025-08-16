import { useSpeechRecognition } from "react-speech-recognition";

export const useVoiceRecognition = () => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  return {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  };
};
