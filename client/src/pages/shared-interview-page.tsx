import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Volume2, Volume, UserRound, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Vapi from "@vapi-ai/web";

export default function SharedInterviewPage() {
  const { callId } = useParams<{ callId: string }>();
  const { toast } = useToast();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<Vapi | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Vapi when the component mounts
  useEffect(() => {
    if (!callId) {
      setError("Invalid interview link");
      setIsLoading(false);
      return;
    }

    const startInterview = async () => {
      try {
        setIsLoading(true);
        // Fetch call details to verify the call exists
        const response = await fetch(`/api/calls/${callId}`);
        if (!response.ok) {
          throw new Error("Interview not found or has expired");
        }

        // Initialize Vapi without an API key, since we'll use the callId
        const vapi = new Vapi("");
        
        // Configure the call using the callId
        vapi.setCallId(callId);
        
        // Set up event listeners
        vapi.on("volume-level", (level) => {
          setVolume(level);
        });

        vapi.on("call-end", () => {
          setIsInterviewActive(false);
        });

        // Start the call
        await vapi.start();
        
        // Update state
        setVapiInstance(vapi);
        setIsInterviewActive(true);
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
      if (vapiInstance) {
        vapiInstance.stop();
      }
    };
  }, [callId]);

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