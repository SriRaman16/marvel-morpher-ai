export class ElevenLabsService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to generate speech");
    }

    return await response.arrayBuffer();
  }

  async playJarvisIntroduction(text: string): Promise<void> {
    try {
      // Use George's voice for Jarvis-style AI assistant
      const jarvisVoiceId = "JBFqnCBsd6RMkjVDRZzb";
      const audioData = await this.generateSpeech(text, jarvisVoiceId);
      const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      await audio.play();
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      throw error;
    }
  }
}
