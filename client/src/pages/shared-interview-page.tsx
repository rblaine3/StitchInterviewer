import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Volume2, Volume, UserRound, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Vapi from "@vapi-ai/web";

// For debugging - we'll access the API key from the server
const VAPI_API_KEY = import.meta.env.VITE_VAPI_API_KEY;
console.log("Frontend has Vapi API key access in shared page:", !!VAPI_API_KEY);

export default function SharedInterviewPage() {
  const { assistantId } = useParams<{ assistantId: string }>();
  const { toast } = useToast();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<Vapi | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Vapi when the component mounts
  useEffect(() => {
    if (!assistantId) {
      setError("Invalid interview link");
      setIsLoading(false);
      return;
    }

    const startInterview = async () => {
      try {
        setIsLoading(true);

        // Check if we're using a mock assistant ID (for testing without Vapi API)
        if (assistantId.startsWith('mock-assistant-')) {
          console.log("Using mock interface for shared interview");
          
          // Create a mock interface for testing
          const mockVapi = {
            // Mock methods for Vapi
            stop: () => {
              console.log("Mock Vapi stop called");
              // Clear volume interval on stop
              if (mockVapi.mockVolumeInterval) {
                clearInterval(mockVapi.mockVolumeInterval);
              }
            },
            setMuted: (muted: boolean) => console.log("Mock Vapi setMuted:", muted),
            start: async () => console.log("Mock Vapi start called"),
            on: (event: string, callback: Function) => {
              console.log(`Mock Vapi registered listener for ${event}`);
              // Simulate volume changes
              if (event === 'volume-level' && callback) {
                // Start a volume simulation interval
                const interval = setInterval(() => {
                  const randomVolume = Math.random() * 0.5;
                  callback(randomVolume);
                }, 1000);
                
                // Store the interval ID for cleanup
                // @ts-ignore - adding custom property to mock object
                mockVapi.mockVolumeInterval = interval;
                return interval;
              }
              return null;
            },
            // Property to store volume interval for cleanup
            mockVolumeInterval: null as number | null
          };
          
          // Simulate volume levels
          mockVapi.on('volume-level', (level: number) => {
            setVolume(level);
          });
          
          // Simulate call initiation
          await mockVapi.start();
          console.log("Mock Vapi call started successfully");
          
          // Save the mock instance to state
          // @ts-ignore - we're using a mock object that mimics Vapi functionality
          setVapiInstance(mockVapi);
          setIsInterviewActive(true);
          setIsLoading(false);
          
          return;
        }

        // Get API key from environment
        const apiKey = import.meta.env.VITE_VAPI_API_KEY || "";
        if (!apiKey) {
          console.error("Missing VITE_VAPI_API_KEY environment variable!");
          throw new Error("Missing API key configuration");
        }
        
        // Initialize Vapi with API key according to SDK docs
        const vapi = new Vapi(apiKey);
        
        // Set up event listeners for all possible events
        vapi.on("volume-level", (level: number) => {
          setVolume(level);
        });

        vapi.on("call-start", () => {
          console.log("Interview call started");
          setIsInterviewActive(true);
        });

        vapi.on("call-end", () => {
          console.log("Interview call ended");
          setIsInterviewActive(false);
        });

        vapi.on("speech-start", () => {
          console.log("Assistant started speaking");
        });

        vapi.on("speech-end", () => {
          console.log("Assistant stopped speaking");
        });

        vapi.on("message", (message: any) => {
          console.log("Message received:", message);
        });

        vapi.on("error", (error: Error) => {
          console.error("Vapi error:", error);
          toast({
            title: "Interview error",
            description: "There was an error during the interview. Please try again.",
            variant: "destructive",
          });
        });

        // Start the call with the assistant ID (not the call ID)
        console.log("Starting Vapi call with assistantId:", assistantId);
        const call = await vapi.start(assistantId);
        console.log("Vapi call started successfully:", call);
        
        // Update state
        setVapiInstance(vapi);
        setIsLoading(false);
      } catch (error) {
        console.error("Error starting interview:", error);
        setError(error instanceof Error ? error.message : "Failed to start interview");
        setIsLoading(false);
      }
    };

    startInterview();

    // Cleanup on unmount
    return () => {
      // Store the volume update interval
      let volumeInterval: number | null = null;
      
      if (vapiInstance) {
        // For mock implementations, the on() function returns an interval ID
        // @ts-ignore - handling mock implementation
        if (vapiInstance.mockVolumeInterval) {
          // @ts-ignore - handling mock implementation
          volumeInterval = vapiInstance.mockVolumeInterval;
        }
        
        // Stop the Vapi instance
        vapiInstance.stop();
      }
      
      // Clear any intervals (for mock implementation)
      if (volumeInterval) {
        clearInterval(volumeInterval);
      }
    };
  }, [assistantId, toast]);

  // Toggle mute
  const toggleMute = () => {
    if (vapiInstance) {
      vapiInstance.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // End the interview
  const endInterview = () => {
    if (vapiInstance) {
      vapiInstance.stop();
      setVapiInstance(null);
      setIsInterviewActive(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="mb-6">
          <Code className="h-12 w-12 text-primary" />
          <span className="ml-2 text-2xl font-bold">StitchAI</span>
        </div>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h1 className="mt-4 text-xl font-bold">Preparing your interview...</h1>
          <p className="mt-2 text-gray-500">This will just take a moment.</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="mb-6">
          <Code className="h-12 w-12 text-primary" />
          <span className="ml-2 text-2xl font-bold">StitchAI</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Interview Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <p className="mt-4 text-gray-500">
            This interview link may be invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Code className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900">StitchAI</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center mb-6">AI Interview Session</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-center py-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center relative">
                  <UserRound className="h-12 w-12 text-gray-600" />
                  {isInterviewActive && (
                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
                  )}

                  {/* Volume indicator */}
                  <div 
                    className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-full"
                    style={{ maxWidth: "100px" }}
                  >
                    <div className="h-1 bg-gray-200 rounded-full w-full">
                      <div 
                        className="h-1 bg-primary rounded-full transition-all duration-100"
                        style={{ width: `${volume * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isInterviewActive ? (
                <>
                  <div className="flex items-center justify-center space-x-4">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="rounded-full h-12 w-12"
                      onClick={toggleMute}
                    >
                      {isMuted ? <Volume className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={endInterview}
                      className="px-8"
                    >
                      End Interview
                    </Button>
                  </div>

                  <div className="text-center text-sm text-gray-500 mt-4">
                    <p>Your AI interviewer is listening to your responses.</p>
                    <p>Speak naturally and the conversation will flow like a real interview.</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600">
                    This interview has ended. Thank you for your participation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Powered by StitchAI · Interview Assistant
          </p>
        </div>
      </footer>
    </div>
  );
}