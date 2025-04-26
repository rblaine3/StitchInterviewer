import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mic, UserRound, Volume, Volume2 } from "lucide-react";
import { Project } from "@shared/schema";
import Vapi from "@vapi-ai/web";

interface TestInterviewProps {
  project: Project; // Pass the entire project object
}

export default function TestInterviewNew({ project }: TestInterviewProps) {
  const projectId = project.id;
  
  const { toast } = useToast();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<Vapi | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isCreatingCall, setIsCreatingCall] = useState(false);

  // Create the interview
  const createInterviewMutation = useMutation({
    mutationFn: async () => {
      setIsCreatingCall(true);
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/create-interview`
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Start the interview with Vapi
      startInterview(data.callId);
    },
    onError: (error: Error) => {
      setIsCreatingCall(false);
      toast({
        title: "Failed to create interview",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize the Vapi client when the interview is started
  const startInterview = async (callId: string) => {
    try {
      console.log("Starting interview with call ID:", callId);
      
      // Check if we're using a mock call ID (for testing without Vapi API)
      if (callId.startsWith('mock-call-')) {
        console.log("Using mock interface for testing");
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
        setIsCreatingCall(false);
        
        return;
      }
      
      // Real Vapi implementation for when we have a working API connection
      // Create a new Vapi instance with the call ID
      const vapi = new Vapi("", callId);

      // Set up event listeners for volume levels
      vapi.on("volume-level", (level: number) => {
        setVolume(level);
      });

      // Set up event listeners for call ending
      vapi.on("call-end", () => {
        console.log("Interview call ended");
        setIsInterviewActive(false);
        setIsCreatingCall(false);
      });

      // Set up event listeners for errors
      vapi.on("error", (error: Error) => {
        console.error("Vapi error:", error);
        toast({
          title: "Interview error",
          description: "There was an error during the interview. Please try again.",
          variant: "destructive",
        });
      });

      console.log("Starting Vapi call");
      // Start the call using the callId from our backend
      await vapi.start();
      console.log("Vapi call started successfully");

      // Save the instance to state
      setVapiInstance(vapi);
      setIsInterviewActive(true);
      setIsCreatingCall(false);
    } catch (error) {
      console.error("Failed to start interview:", error);
      setIsCreatingCall(false);
      toast({
        title: "Failed to start interview",
        description: "There was an error starting the interview. Please try again.",
        variant: "destructive",
      });
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

  // Toggle mute
  const toggleMute = () => {
    if (vapiInstance) {
      vapiInstance.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    // Store the volume update interval
    let volumeInterval: number | null = null;
    
    if (vapiInstance) {
      // For mock implementations, the on() function returns an interval ID
      // @ts-ignore - handling mock implementation
      if (vapiInstance.mockVolumeInterval) {
        // @ts-ignore - handling mock implementation
        volumeInterval = vapiInstance.mockVolumeInterval;
      }
    }
    
    return () => {
      // Clean up Vapi instance
      if (vapiInstance) {
        vapiInstance.stop();
      }
      
      // Clear any intervals (for mock implementation)
      if (volumeInterval) {
        clearInterval(volumeInterval);
      }
    };
  }, [vapiInstance]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Interview</CardTitle>
          <CardDescription>
            Conduct an AI-powered test interview using your research objective and knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInterviewActive ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center relative">
                  <UserRound className="h-12 w-12 text-gray-600" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />

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
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="mb-4">
                  <Mic className="h-12 w-12 mx-auto text-gray-400" />
                </div>
                <h3 className="text-lg font-medium">Ready to start your test interview?</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  This will create an AI-powered interview session based on your research objectives
                  and knowledge base.
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => createInterviewMutation.mutate()}
                  disabled={isCreatingCall}
                  className="px-8"
                >
                  {isCreatingCall ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Interview...
                    </>
                  ) : (
                    "Start Interview"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}