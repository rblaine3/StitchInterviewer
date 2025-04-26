import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Loader2, Mic, Volume2, Volume, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Vapi from "@vapi-ai/web";

interface TestInterviewProps {
  projectId: number;
}

export default function TestInterview({ projectId }: TestInterviewProps) {
  const { toast } = useToast();
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<Vapi | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  
  // Ensure we have a project with interview prompts
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

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
      // Hide API key in frontend - just use the callId from the backend
      const vapi = new Vapi(process.env.VAPI_API_KEY || "");

      // Set up event listeners for volume levels
      vapi.on("volume-level", (level) => {
        setVolume(level);
      });

      // Set up event listeners for call ending
      vapi.on("call-end", () => {
        setIsInterviewActive(false);
        setIsCreatingCall(false);
      });

      // Start the call using the callId from our backend
      await vapi.start();

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
    return () => {
      if (vapiInstance) {
        vapiInstance.stop();
      }
    };
  }, [vapiInstance]);

  // Show loading state
  if (isLoadingProject) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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